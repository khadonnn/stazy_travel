"use server";

import { prisma } from "@repo/product-db";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://127.0.0.1:8008";

function normalizeDest(dest: string): string {
  return (dest || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

const LOCATION_STOPWORDS = new Set([
  "modern",
  "classic",
  "luxury",
  "hidden",
  "premium",
  "sanctuary",
  "lodge",
  "villa",
  "plaza",
  "resort",
  "hotel",
  "suite",
  "apartment",
  "homestay",
  "boutique",
  "private",
  "stay",
  "house",
  "garden",
  "beach",
  "bay",
  "duong",
  "street",
  "road",
  "pho",
  "phuong",
  "xa",
  "thi",
  "tran",
  "nguyen",
  "le",
  "pham",
  "ho",
]);

function extractLocationSignature(source: string): string {
  const tokens = normalizeDest(source)
    .replace(/[,:/\-]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(
      (token) =>
        token && !/^\d+$/.test(token) && !LOCATION_STOPWORDS.has(token),
    );

  if (tokens.length === 0) return "";
  return tokens.slice(-2).join(" ");
}

function getHotelLocationKey(hotel: any): string {
  return (
    extractLocationSignature(hotel?.destination || "") ||
    extractLocationSignature((hotel?.address || "").split(",")[0] || "") ||
    extractLocationSignature(hotel?.title || "")
  );
}

function isSameLocation(currentKey: string, hotel: any): boolean {
  const hotelKey = getHotelLocationKey(hotel);
  if (!currentKey || !hotelKey) return false;
  return (
    hotelKey === currentKey ||
    hotelKey.includes(currentKey) ||
    currentKey.includes(hotelKey)
  );
}

function mergeUniqueHotels(primary: any[], secondary: any[], limit: number) {
  const seen = new Set<number>();
  const merged: any[] = [];

  for (const hotel of [...primary, ...secondary]) {
    if (!hotel?.id || seen.has(hotel.id)) continue;
    seen.add(hotel.id);
    merged.push(hotel);
    if (merged.length >= limit) break;
  }

  return merged;
}

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
        if (normalized in aspects[aspect]) {
          aspects[aspect][normalized] = (aspects[aspect][normalized] ?? 0) + 1;
        }
      }
    }
  }

  return aspects;
}

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

    const aPos = aScores.POSITIVE ?? 0;
    const aNeu = aScores.NEUTRAL ?? 0;
    const aNeg = aScores.NEGATIVE ?? 0;
    const bPos = bScores.POSITIVE ?? 0;
    const bNeu = bScores.NEUTRAL ?? 0;
    const bNeg = bScores.NEGATIVE ?? 0;

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

export async function getSimilarHotels(hotelId: number): Promise<{
  similar: any[];
  sameDestination: any[];
  related: any[];
}> {
  try {
    const currentHotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        category: true,
        reviews: {
          select: { sentiment: true, explicitSentiments: true, rating: true },
        },
      },
    });

    if (!currentHotel) {
      return { similar: [], sameDestination: [], related: [] };
    }

    const currentLocationKey =
      getHotelLocationKey(currentHotel) ||
      extractLocationSignature(currentHotel.address || "") ||
      extractLocationSignature(currentHotel.title || "");

    const allApproved = await prisma.hotel.findMany({
      where: { id: { not: hotelId }, status: "APPROVED" },
      include: {
        category: true,
        reviews: {
          select: { sentiment: true, explicitSentiments: true, rating: true },
        },
      },
      orderBy: [{ reviewStar: "desc" }, { reviewCount: "desc" }],
      take: 200,
    });

    // Try complex location matching first
    let sameDestinationHotels = allApproved
      .filter((hotel) => {
        return isSameLocation(currentLocationKey, hotel);
      })
      .slice(0, 8);

    // Fallback: if complex matching found < 3, also try direct destination field match
    if (sameDestinationHotels.length < 3 && currentHotel.destination) {
      const currentDestNorm = normalizeDest(currentHotel.destination);
      const existingIds = new Set(sameDestinationHotels.map((h) => h.id));
      const destMatches = allApproved.filter((h) => {
        if (!h.destination || existingIds.has(h.id)) return false;
        return normalizeDest(h.destination) === currentDestNorm;
      });
      sameDestinationHotels = [...sameDestinationHotels, ...destMatches].slice(
        0,
        8,
      );
    }

    // Shuffle same-destination hotels for variety
    sameDestinationHotels = sameDestinationHotels.sort(
      () => Math.random() - 0.5,
    );
    sameDestinationHotels = sameDestinationHotels.slice(0, 3);

    let sameDestinationIds = new Set(sameDestinationHotels.map((h) => h.id));

    console.log(
      `[same-dest] Current hotel destination: "${currentHotel.destination || ""}"`,
    );
    console.log(
      `[same-dest] Found ${sameDestinationHotels.length} hotels in same destination`,
    );

    // Fallback 2: If Prisma DB doesn't have destination field populated,
    // load from the JSON data file used by the search service
    if (sameDestinationHotels.length < 3 && currentHotel.destination) {
      try {
        const fs = require("fs");
        const path = require("path");
        const jsonPath = path.join(
          process.cwd(),
          "..",
          "search-service",
          "jsons",
          "__homeStay.json",
        );
        if (fs.existsSync(jsonPath)) {
          const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
          const currentDestNorm = normalizeDest(currentHotel.destination);
          const existingIds = new Set(
            sameDestinationHotels.map((h: any) => h.id),
          );
          const jsonMatches = jsonData
            .filter((h: any) => {
              if (
                !h.destination ||
                h.id === currentHotel.id ||
                existingIds.has(h.id)
              )
                return false;
              return normalizeDest(h.destination) === currentDestNorm;
            })
            .sort(() => Math.random() - 0.5)
            .slice(0, 3 - sameDestinationHotels.length);

          sameDestinationHotels = [...sameDestinationHotels, ...jsonMatches];
          sameDestinationIds = new Set(
            sameDestinationHotels.map((h: any) => h.id),
          );
          console.log(
            `[same-dest] JSON fallback added ${jsonMatches.length} hotels`,
          );
        }
      } catch (e) {
        console.warn("[same-dest] JSON fallback failed:", e);
      }
    }

    // Fallback 3: try matching tokens from the current hotel's slug/title
    if (sameDestinationHotels.length < 3) {
      try {
        const routeSource = String(
          currentHotel.slug ||
            currentHotel.title ||
            currentHotel.destination ||
            "",
        );
        const routeTokens = normalizeDest(routeSource)
          .replace(/[,:/]+/g, " ")
          .split(/[-_\s]+/)
          .filter((t) => t && !LOCATION_STOPWORDS.has(t));

        console.log(
          `[same-dest] Fallback tokens from route/title: ${routeTokens.join(",")}`,
        );

        for (const token of routeTokens) {
          if (sameDestinationHotels.length >= 3) break;
          for (const h of allApproved) {
            if (!h?.id || sameDestinationIds.has(h.id)) continue;
            const hay = normalizeDest(
              [
                h.slug || "",
                h.title || "",
                h.destination || "",
                (h.address || "").split(",")[0] || "",
              ].join(" "),
            );
            if (hay.includes(token)) {
              sameDestinationHotels.push(h);
              sameDestinationIds.add(h.id);
              console.log(
                `[same-dest] Fallback added hotel id=${h.id} token=${token}`,
              );
              break; // move to next token
            }
          }
        }
      } catch (e) {
        console.warn("[same-dest] fallback by route/title failed", e);
      }
    }

    let aiSimilarHotels: any[] = [];
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
        if (Array.isArray(aiResults) && aiResults.length > 0) {
          const hotelIds = aiResults
            .slice(0, 8)
            .map((r: any) => Number(r.id || r.hotel_id))
            .filter(Boolean);
          if (hotelIds.length > 0) {
            const hotels = await prisma.hotel.findMany({
              where: { id: { in: hotelIds } },
              include: { category: true },
            });
            aiSimilarHotels = formatHotels(
              hotelIds
                .map((id: number) => hotels.find((h) => h.id === id))
                .filter(Boolean),
            );
          }
        }
      }
    } catch {
      // AI service offline → fallback below
    }

    if (aiSimilarHotels.length > 0) {
      const usedIds = new Set<number>([
        ...sameDestinationHotels.map((h) => h.id),
        ...aiSimilarHotels.map((h) => h.id),
      ]);

      const fillers = await prisma.hotel.findMany({
        where: {
          id: { notIn: Array.from(usedIds) },
          status: "APPROVED",
        },
        include: { category: true },
        orderBy: [{ reviewStar: "desc" }, { reviewCount: "desc" }],
        take: Math.max(
          0,
          8 - sameDestinationHotels.length - aiSimilarHotels.length,
        ),
      });

      const combined = mergeUniqueHotels(
        sameDestinationHotels,
        [...aiSimilarHotels, ...formatHotels(fillers)],
        8,
      );
      const relatedHotels = formatHotels(combined)
        .filter((hotel) => !sameDestinationIds.has(hotel.id))
        .slice(0, 3);

      return {
        similar: formatHotels(combined),
        sameDestination: formatHotels(sameDestinationHotels),
        related: relatedHotels,
      };
    }

    const priceMin = Number(currentHotel.price) * 0.5;
    const priceMax = Number(currentHotel.price) * 2.0;
    const starMin = Math.max(0, Number(currentHotel.reviewStar || 0) - 1);
    const starMax = Math.min(5, Number(currentHotel.reviewStar || 0) + 1);

    const candidates = allApproved.filter((hotel) => {
      const sameDest = isSameLocation(currentLocationKey, hotel);
      const price = Number(hotel.price) || 0;
      const star = Number(hotel.reviewStar) || 0;
      const inRange =
        star >= starMin &&
        star <= starMax &&
        price >= priceMin &&
        price <= priceMax;
      return sameDest || inRange;
    });

    if (candidates.length === 0) {
      const popular = allApproved.slice(0, 8);
      const relatedHotels = formatHotels(popular)
        .filter((hotel) => !sameDestinationIds.has(hotel.id))
        .slice(0, 3);
      return {
        similar: formatHotels(
          mergeUniqueHotels(sameDestinationHotels, popular, 8),
        ),
        sameDestination: formatHotels(sameDestinationHotels),
        related: relatedHotels,
      };
    }

    const currentAmenities = new Set(currentHotel.amenities || []);
    const currentExplicit = aggregateExplicitSentiments(
      currentHotel.reviews || [],
    );

    const scored = candidates.map((candidate) => {
      let contentScore = 0;
      if (isSameLocation(currentLocationKey, candidate)) {
        contentScore += 0.5;
      }

      const starDiff = Math.abs(
        Number(currentHotel.reviewStar || 0) -
          Number(candidate.reviewStar || 0),
      );
      contentScore += Math.max(0, 1 - starDiff / 5) * 0.25;

      const priceDiff =
        Math.abs(Number(currentHotel.price) - Number(candidate.price)) /
        Math.max(Number(currentHotel.price), 1);
      contentScore += Math.max(0, 1 - priceDiff) * 0.15;

      const candidateAmenities = new Set(candidate.amenities || []);
      const intersection = [...currentAmenities].filter((a) =>
        candidateAmenities.has(a),
      );
      const union = new Set([...currentAmenities, ...candidateAmenities]);
      const jaccard = union.size > 0 ? intersection.length / union.size : 0;
      contentScore += jaccard * 0.1;

      const cfScore = Math.min(
        1,
        (candidate.reviewCount || 0) /
          Math.max(currentHotel.reviewCount || 1, 1),
      );

      const sentimentScore = computeSentimentSimilarity(
        currentExplicit,
        aggregateExplicitSentiments(candidate.reviews || []),
      );

      const popularityScore = (candidate.reviewStar || 0) / 5;

      return {
        hotel: candidate,
        score:
          0.4 * contentScore +
          0.3 * cfScore +
          0.2 * sentimentScore +
          0.1 * popularityScore,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const topHotels = scored.slice(0, 8).map((s) => s.hotel);
    const combined = mergeUniqueHotels(sameDestinationHotels, topHotels, 8);
    const relatedHotels = formatHotels(topHotels)
      .filter((hotel) => !sameDestinationIds.has(hotel.id))
      .slice(0, 3);

    return {
      similar: formatHotels(combined),
      sameDestination: formatHotels(sameDestinationHotels),
      related: relatedHotels,
    };
  } catch (error) {
    console.error("❌ getSimilarHotels error:", error);
    return { similar: [], sameDestination: [], related: [] };
  }
}
