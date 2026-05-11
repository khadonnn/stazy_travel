"use server";

import { prisma } from "@repo/product-db";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://127.0.0.1:8008";

/**
 * Get similar hotels for a given hotel using Hybrid Scoring:
 * - Content Similarity: 40% (same city, stars, price range, amenities)
 * - Collaborative Similarity: 30% (users who booked this also booked...)
 * - Aspect Sentiment Similarity: 20% (similar positive sentiment aspects)
 * - Popularity Score: 10% (high average rating)
 */
export async function getSimilarHotels(hotelId: number) {
  try {
    // 1. Lấy thông tin hotel hiện tại
    const currentHotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        reviews: {
          select: { sentiment: true, explicitSentiments: true, rating: true },
        },
      },
    });

    if (!currentHotel) {
      return [];
    }

    // 2. Thử gọi AI Service trước (Item-CF similarity từ Python)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${SEARCH_SERVICE_URL}/similar/${hotelId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const aiResults = await response.json();
        if (aiResults && aiResults.length > 0) {
          const hotelIds = aiResults
            .slice(0, 8)
            .map((r: any) => r.id || r.hotel_id);
          const hotels = await prisma.hotel.findMany({
            where: { id: { in: hotelIds } },
            include: { category: true },
          });
          if (hotels.length > 0) {
            return formatHotels(hotels);
          }
        }
      }
    } catch {
      // AI Service offline → fallback to DB-based hybrid
    }

    // 3. Fallback: Hybrid scoring ngay trong DB
    // 3a. Content Similarity (40%): cùng destination, cùng star range, cùng price range
    const priceMin = Number(currentHotel.price) * 0.5;
    const priceMax = Number(currentHotel.price) * 2.0;
    const starMin = Math.max(0, currentHotel.reviewStar - 1);
    const starMax = Math.min(5, currentHotel.reviewStar + 1);

    const candidates = await prisma.hotel.findMany({
      where: {
        id: { not: hotelId },
        status: "APPROVED",
        OR: [
          { destination: currentHotel.destination },
          {
            reviewStar: { gte: starMin, lte: starMax },
            price: { gte: priceMin, lte: priceMax },
          },
        ],
      },
      include: {
        category: true,
        reviews: {
          select: { sentiment: true, explicitSentiments: true, rating: true },
        },
      },
      take: 50, // Lấy 50 candidates rồi score
    });

    if (candidates.length === 0) {
      // Fallback cuối: lấy popular hotels
      const popular = await prisma.hotel.findMany({
        where: { status: "APPROVED", id: { not: hotelId } },
        include: { category: true },
        orderBy: { reviewStar: "desc" },
        take: 8,
      });
      return formatHotels(popular);
    }

    // 3b. Tính Hybrid Score cho mỗi candidate
    const currentAmenities = new Set(currentHotel.amenities || []);
    const currentExplicit = aggregateExplicitSentiments(currentHotel.reviews);

    const scored = candidates.map((candidate) => {
      // --- Content Similarity (40%) ---
      let contentScore = 0;

      // Same city/destination: 50% of content
      if (candidate.destination === currentHotel.destination) {
        contentScore += 0.5;
      }

      // Star rating proximity: 25% of content
      const starDiff = Math.abs(currentHotel.reviewStar - candidate.reviewStar);
      contentScore += Math.max(0, 1 - starDiff / 5) * 0.25;

      // Price proximity: 15% of content
      const priceDiff =
        Math.abs(Number(currentHotel.price) - Number(candidate.price)) /
        Math.max(Number(currentHotel.price), 1);
      contentScore += Math.max(0, 1 - priceDiff) * 0.15;

      // Amenity overlap: 10% of content
      const candidateAmenities = new Set(candidate.amenities || []);
      const intersection = [...currentAmenities].filter((a) =>
        candidateAmenities.has(a),
      );
      const union = new Set([...currentAmenities, ...candidateAmenities]);
      const jaccard = union.size > 0 ? intersection.length / union.size : 0;
      contentScore += jaccard * 0.1;

      // --- Collaborative Similarity (30%) ---
      // Dùng review count & booking count như proxy cho CF similarity
      const cfScore = Math.min(
        1,
        (candidate.reviewCount || 0) /
          Math.max(currentHotel.reviewCount || 1, 1),
      );

      // --- Aspect Sentiment Similarity (20%) ---
      const candidateExplicit = aggregateExplicitSentiments(candidate.reviews);
      const sentimentScore = computeSentimentSimilarity(
        currentExplicit,
        candidateExplicit,
      );

      // --- Popularity Score (10%) ---
      const popularityScore = (candidate.reviewStar || 0) / 5;

      // --- Final Hybrid Score ---
      const hybridScore =
        0.4 * contentScore +
        0.3 * cfScore +
        0.2 * sentimentScore +
        0.1 * popularityScore;

      return { hotel: candidate, score: hybridScore };
    });

    // Sort by hybrid score descending, take top 8
    scored.sort((a, b) => b.score - a.score);
    const topHotels = scored.slice(0, 8).map((s) => s.hotel);

    return formatHotels(topHotels);
  } catch (error) {
    console.error("❌ getSimilarHotels error:", error);
    return [];
  }
}

/**
 * Aggregate explicit sentiments from reviews into aspect → { POSITIVE: n, NEGATIVE: n, NEUTRAL: n }
 */
function aggregateExplicitSentiments(
  reviews: Array<{
    sentiment: string | null;
    explicitSentiments: any;
    rating: number;
  }>,
) {
  const aspects: Record<string, Record<string, number>> = {};

  for (const review of reviews) {
    if (
      review.explicitSentiments &&
      typeof review.explicitSentiments === "object"
    ) {
      const es = review.explicitSentiments as Record<string, string>;
      for (const [aspect, sentiment] of Object.entries(es)) {
        if (!aspects[aspect]) {
          aspects[aspect] = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
        }
        const normalized = (sentiment || "NEUTRAL").toUpperCase();
        if (aspects[aspect] && normalized in aspects[aspect]) {
          aspects[aspect]![normalized] =
            (aspects[aspect]![normalized] ?? 0) + 1;
        }
      }
    }
  }

  return aspects;
}

/**
 * Compute cosine-like similarity between two aspect sentiment distributions.
 */
function computeSentimentSimilarity(
  a: Record<string, Record<string, number>>,
  b: Record<string, Record<string, number>>,
): number {
  const allAspects = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (allAspects.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const aspect of allAspects) {
    const aScores = a[aspect] ?? {};
    const bScores = b[aspect] ?? {};

    const aPos = aScores["POSITIVE"] ?? 0;
    const aNeu = aScores["NEUTRAL"] ?? 0;
    const aNeg = aScores["NEGATIVE"] ?? 0;
    const bPos = bScores["POSITIVE"] ?? 0;
    const bNeu = bScores["NEUTRAL"] ?? 0;
    const bNeg = bScores["NEGATIVE"] ?? 0;

    // Convert to positive ratio
    const aTotal = aPos + aNeu + aNeg;
    const bTotal = bPos + bNeu + bNeg;

    const aRatio = aTotal > 0 ? aPos / aTotal : 0.5;
    const bRatio = bTotal > 0 ? bPos / bTotal : 0.5;

    dotProduct += aRatio * bRatio;
    normA += aRatio * aRatio;
    normB += bRatio * bRatio;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dotProduct / denominator : 0;
}

function formatHotels(hotels: any[]) {
  return hotels.map((hotel) => ({
    ...hotel,
    price: Number(hotel.price),
    saleOff: Number(hotel.saleOff || 0),
    saleOffPercent: Number(hotel.saleOffPercent || 0),
    reviewStar: Number(hotel.reviewStar || 0),
  }));
}
