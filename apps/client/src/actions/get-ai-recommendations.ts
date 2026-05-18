"use server";

import { prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://127.0.0.1:8008";
const MIN_INTERACTIONS = 1; // Lower threshold so all browsers/users can see recommendations
const CANDIDATE_POOL_SIZE = 30;

// ======================================
// EPHEMERAL IN-MEMORY CACHE (5 min TTL)
// Resets on server restart. NOT source of truth.
// ======================================
const candidateCache = new Map<string, { ids: number[]; timestamp: number }>();
const CANDIDATE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedCandidates(userId: string): number[] | null {
  const entry = candidateCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CANDIDATE_TTL) {
    candidateCache.delete(userId);
    return null;
  }
  return entry.ids;
}

function setCachedCandidates(userId: string, ids: number[]) {
  candidateCache.set(userId, { ids, timestamp: Date.now() });
}

// --- TYPES ---
export type AIInsightChip = {
  id: string;
  label: string;
  emoji: string;
  signal: string;
};

export type RecommendedHotel = {
  id: number;
  title: string;
  address: string;
  price: number;
  reviewStar: number;
  galleryImgs: string[];
  category: { name: string; slug?: string } | null;
  amenities: string[];
  tags: string[];
  suitableFor: string[];
  destination: string;
  matchScore?: number;
};

export type AIRecommendationResult = {
  hotels: RecommendedHotel[];
  chips: AIInsightChip[];
  interactionCount: number;
};

// --- FEATURE LABELS ---
const AMENITY_LABELS: Record<string, { label: string; emoji: string }> = {
  pool: { label: "Hồ bơi", emoji: "🏊" },
  infinity_pool: { label: "Infinity Pool", emoji: "🏊" },
  spa: { label: "Spa", emoji: "🧖" },
  gym: { label: "Gym", emoji: "💪" },
  beachfront: { label: "Bãi biển riêng", emoji: "🏖️" },
  sea_view: { label: "View biển", emoji: "🌊" },
  mountain_view: { label: "View núi", emoji: "⛰️" },
  garden: { label: "Vườn", emoji: "🌿" },
  restaurant: { label: "Nhà hàng", emoji: "🍽️" },
  bar: { label: "Bar", emoji: "🍸" },
  parking: { label: "Bãi đỗ xe", emoji: "🅿️" },
  wifi: { label: "WiFi", emoji: "📶" },
  kitchen: { label: "Bếp", emoji: "🍳" },
  balcony: { label: "Ban công", emoji: "🌅" },
  jacuzzi: { label: "Jacuzzi", emoji: "🛁" },
  pet_friendly: { label: "Pet-friendly", emoji: "🐾" },
};

const TAG_LABELS: Record<string, { label: string; emoji: string }> = {
  romantic: { label: "Lãng mạn", emoji: "💕" },
  "pet-friendly": { label: "Pet-friendly", emoji: "🐾" },
  business: { label: "Công tác", emoji: "💼" },
  luxury: { label: "Sang trọng", emoji: "✨" },
  budget: { label: "Giá tốt", emoji: "💰" },
  family: { label: "Gia đình", emoji: "👨‍👩‍👧‍👦" },
  beachfront: { label: "Beachfront", emoji: "🏖️" },
  "city-center": { label: "Trung tâm", emoji: "🏙️" },
  boutique: { label: "Boutique", emoji: "🎨" },
  eco: { label: "Eco-friendly", emoji: "🌱" },
};

const SUITABLE_LABELS: Record<string, { label: string; emoji: string }> = {
  COUPLE: { label: "Cặp đôi", emoji: "💑" },
  FAMILY: { label: "Gia đình", emoji: "👨‍👩‍👧‍👦" },
  SOLO: { label: "Du lịch 1 mình", emoji: "🧳" },
  BUSINESS: { label: "Công tác", emoji: "💼" },
  GROUP: { label: "Nhóm bạn", emoji: "👥" },
};

// --- CHIP EXTRACTION ---
function extractInsightChips(hotels: RecommendedHotel[]): AIInsightChip[] {
  const chipMap = new Map<string, AIInsightChip>();

  for (const hotel of hotels) {
    for (const amenity of hotel.amenities || []) {
      const key = amenity.toLowerCase().replace(/\s+/g, "_");
      const info = AMENITY_LABELS[key];
      if (info && !chipMap.has(key) && chipMap.size < 6) {
        chipMap.set(key, {
          id: `amenity-${key}`,
          label: info.label,
          emoji: info.emoji,
          signal: `amenity:${key}`,
        });
      }
    }

    for (const tag of hotel.tags || []) {
      const key = tag.toLowerCase().trim();
      const info = TAG_LABELS[key];
      if (info && !chipMap.has(key) && chipMap.size < 6) {
        chipMap.set(key, {
          id: `tag-${key}`,
          label: info.label,
          emoji: info.emoji,
          signal: `tag:${key}`,
        });
      }
    }

    for (const s of hotel.suitableFor || []) {
      const key = s.toUpperCase();
      const info = SUITABLE_LABELS[key];
      if (info && !chipMap.has(key) && chipMap.size < 6) {
        chipMap.set(key, {
          id: `suitable-${key}`,
          label: info.label,
          emoji: info.emoji,
          signal: `suitable:${key}`,
        });
      }
    }
  }

  // Add popular destinations from DB
  return Array.from(chipMap.values());
}

// --- DIVERSITY RERANKING ---
function diversifyAndRank(
  candidates: RecommendedHotel[],
  targetCount: number = 3,
): RecommendedHotel[] {
  if (candidates.length <= targetCount) return [...candidates];

  const sorted = [...candidates].sort(
    (a, b) => (b.matchScore || 0) - (a.matchScore || 0),
  );

  const selected: RecommendedHotel[] = [];
  const usedCategories = new Set<string>();
  const usedPriceRanges = new Set<string>();
  const usedDestinations = new Set<string>();

  const getPriceRange = (price: number): string => {
    if (price < 500000) return "budget";
    if (price < 1500000) return "mid";
    if (price < 3000000) return "premium";
    return "luxury";
  };

  // Pass 1: Diverse selection (prefer different locations)
  for (const hotel of sorted) {
    if (selected.length >= targetCount) break;
    const cat = hotel.category?.name || "unknown";
    const pr = getPriceRange(hotel.price);
    const dest = hotel.destination || hotel.address || "";
    const catOk = !usedCategories.has(cat) || usedCategories.size >= 3;
    const prOk = !usedPriceRanges.has(pr) || usedPriceRanges.size >= 3;
    const destOk = !usedDestinations.has(dest) || usedDestinations.size >= 3;
    if (catOk || prOk || destOk) {
      selected.push(hotel);
      usedCategories.add(cat);
      usedPriceRanges.add(pr);
      usedDestinations.add(dest);
    }
  }

  // Pass 2: Fill remaining
  for (const hotel of sorted) {
    if (selected.length >= targetCount) break;
    if (!selected.find((s) => s.id === hotel.id)) {
      selected.push(hotel);
    }
  }

  return selected;
}

// --- FORMAT HOTELS ---
function formatHotel(h: any, score: number): RecommendedHotel {
  return {
    id: h.id,
    title: h.title,
    address: h.address,
    price: Number(h.price),
    reviewStar: Number(h.reviewStar || 0),
    galleryImgs: h.galleryImgs || [],
    category: h.category
      ? { name: h.category.name, slug: h.category.slug }
      : null,
    amenities: h.amenities || [],
    tags: h.tags || [],
    suitableFor: (h.suitableFor || []).map(String),
    destination: h.destination || "",
    matchScore: score,
  };
}

// ======================================
// MAIN SERVER ACTION
// ======================================
export async function getAIRecommendations(
  chipSignal?: string,
): Promise<AIRecommendationResult | null> {
  const user = await currentUser();
  if (!user) return null;

  try {
    // 1. Check interaction count
    const interactionCount = await prisma.interaction.count({
      where: {
        userId: user.id,
        type: {
          in: [
            "VIEW",
            "LIKE",
            "BOOK",
            "RATING",
            "ADD_TO_WISHLIST",
            "CLICK_BOOK_NOW",
          ],
        },
      },
    });
    if (interactionCount < MIN_INTERACTIONS) return null;

    // 2. Retrieve candidates (ephemeral cache or fresh from SVD)
    // Invalidate cache if user has new interactions
    const lastInteraction = await prisma.interaction.findFirst({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    });
    const cacheEntry = candidateCache.get(user.id);
    if (
      cacheEntry &&
      lastInteraction &&
      lastInteraction.timestamp > new Date(cacheEntry.timestamp)
    ) {
      console.log("[recommend] New interactions detected, invalidating cache");
      candidateCache.delete(user.id);
    }

    let candidateIds: number[] | null = getCachedCandidates(user.id);

    if (!candidateIds) {
      console.log("[recommend] Cache miss, fetching from SVD...");
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(
          `${SEARCH_SERVICE_URL}/recommend/${user.id}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        clearTimeout(timeout);

        if (response.ok) {
          const results = await response.json();
          if (results?.length > 0) {
            const ids = results
              .slice(0, CANDIDATE_POOL_SIZE)
              .map((r: any) => r.id || r.hotel_id);
            setCachedCandidates(user.id, ids);
            candidateIds = ids;
            console.log(`[recommend] Got ${ids.length} candidates from SVD`);
          }
        }
      } catch (e: any) {
        console.warn("⚠️ SVD service unreachable:", e.message);
      }
    } else {
      console.log(
        `[recommend] Ephemeral cache hit: ${candidateIds.length} candidates`,
      );
    }

    if (!candidateIds || candidateIds.length === 0) return null;

    // 2b. ALWAYS mix in diverse popular hotels from DB (SVD model may be biased to one location)
    try {
      // Get top-rated hotels from DIFFERENT destinations
      const distinctDestinations = await prisma.hotel.findMany({
        where: { status: "APPROVED", destination: { not: "" } },
        select: { destination: true },
        distinct: ["destination"],
        orderBy: { reviewStar: "desc" },
      });
      const diverseIds: number[] = [];
      for (const d of distinctDestinations) {
        const hotelsInDest = await prisma.hotel.findMany({
          where: { status: "APPROVED", destination: d.destination },
          select: { id: true },
          orderBy: { reviewStar: "desc" },
          take: 2, // 2 from each destination
        });
        diverseIds.push(...hotelsInDest.map((h) => h.id));
        if (diverseIds.length >= 20) break;
      }
      // Merge: SVD candidates first, then diverse hotels (deduplicated)
      const merged = [...new Set([...candidateIds, ...diverseIds])];
      candidateIds = merged.slice(0, CANDIDATE_POOL_SIZE);
      console.log(
        `[recommend] Merged ${diverseIds.length} diverse hotels → ${candidateIds.length} total candidates`,
      );
    } catch (e) {
      console.warn("Failed to fetch diverse hotels:", e);
    }

    // 3. Parse chip signal
    let signalType: string | null = null;
    let signalValue: string | null = null;
    if (chipSignal) {
      const colonIdx = chipSignal.indexOf(":");
      signalType = chipSignal.substring(0, colonIdx);
      signalValue = chipSignal.substring(colonIdx + 1);
      console.log(`[rerank] signal: ${signalType}=${signalValue}`);
    }

    // 4. Fetch hotels: if chip signal, do broader search; else use candidate pool
    let hotels: any[];
    let scoringMode: "svd" | "broader" = "svd";

    if (signalType && signalValue) {
      // Try matching within candidate pool first
      const poolWhere: any = { id: { in: candidateIds } };
      if (signalType === "amenity") poolWhere.amenities = { has: signalValue };
      else if (signalType === "tag") poolWhere.tags = { has: signalValue };
      else if (signalType === "suitable")
        poolWhere.suitableFor = { has: signalValue as any };
      else if (signalType === "category")
        poolWhere.category = {
          name: { contains: signalValue, mode: "insensitive" },
        };
      else if (signalType === "destination")
        poolWhere.destination = { contains: signalValue, mode: "insensitive" };

      const poolMatches = await prisma.hotel.findMany({
        where: poolWhere,
        include: { category: true },
      });

      if (poolMatches.length >= 3) {
        hotels = poolMatches;
        console.log(`[rerank] ${poolMatches.length} matches in candidate pool`);
      } else {
        // Broader search across all approved hotels
        const broaderWhere: any = { status: "APPROVED" };
        if (signalType === "amenity")
          broaderWhere.amenities = { has: signalValue };
        else if (signalType === "tag") broaderWhere.tags = { has: signalValue };
        else if (signalType === "suitable")
          broaderWhere.suitableFor = { has: signalValue as any };
        else if (signalType === "category")
          broaderWhere.category = {
            name: { contains: signalValue, mode: "insensitive" },
          };
        else if (signalType === "destination")
          broaderWhere.destination = {
            contains: signalValue,
            mode: "insensitive",
          };

        hotels = await prisma.hotel.findMany({
          where: broaderWhere,
          include: { category: true },
          take: 15,
          orderBy: { reviewStar: "desc" },
        });
        scoringMode = "broader";
        console.log(`[rerank] Broader search: ${hotels.length} matches`);
      }
    } else {
      // Default: fetch from candidate pool
      hotels = await prisma.hotel.findMany({
        where: { id: { in: candidateIds } },
        include: { category: true },
      });
    }

    if (hotels.length === 0) return null;

    // 5. Score candidates - normalize all scores to 0-1 range
    const svdCandidateMap = new Map(
      candidateIds.slice(0, 15).map((id, idx) => [id, idx]),
    );

    let candidates: RecommendedHotel[];
    if (scoringMode === "broader") {
      // Broader results: score by reviewStar
      candidates = hotels
        .sort((a, b) => (b.reviewStar || 0) - (a.reviewStar || 0))
        .map((h, idx) => formatHotel(h, 1 - idx / hotels.length));
    } else {
      // Score by position in candidate pool (0-1 normalized)
      candidates = hotels.map((h) => {
        const svdRank = svdCandidateMap.get(h.id);
        let score: number;
        if (svdRank !== undefined) {
          // SVD candidate: higher score from SVD ranking
          score = 0.9 - (svdRank / 15) * 0.4; // 0.9 → 0.5
        } else {
          // Diverse hotel (not from SVD): moderate base score from rating
          score = 0.3 + (h.reviewStar || 0) / 10; // 0.3 → 0.8
        }
        return formatHotel(h, score);
      });
    }

    // Sort by score
    candidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    // 6. Diversity reranking → top 3
    const finalHotels = diversifyAndRank(candidates, 3);

    // 7. Generate dynamic insight chips from ALL candidates
    const allChips = extractInsightChips(candidates);

    // Also add destination chips from DB
    try {
      const destinations = await prisma.hotel.findMany({
        where: { status: "APPROVED", destination: { not: "" } },
        select: { destination: true },
        distinct: ["destination"],
        take: 8,
        orderBy: { reviewStar: "desc" },
      });
      for (const d of destinations) {
        if (d.destination && allChips.length < 6) {
          const destKey = `dest-${d.destination.toLowerCase().replace(/\s+/g, "-")}`;
          if (!allChips.find((c) => c.id === destKey)) {
            const destLabel = d.destination
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
            allChips.push({
              id: destKey,
              label: destLabel,
              emoji: "📍",
              signal: `destination:${d.destination}`,
            });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch destination chips:", e);
    }

    return {
      hotels: finalHotels,
      chips: allChips.slice(0, 6),
      interactionCount,
    };
  } catch (error) {
    console.error("❌ AI Recommendations error:", error);
    return null;
  }
}
