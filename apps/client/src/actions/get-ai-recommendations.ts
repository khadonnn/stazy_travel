"use server";

import { prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://127.0.0.1:8008";
const MIN_INTERACTIONS = 1;
const CANDIDATE_POOL_SIZE = 30;

// Session intent detection thresholds
const SESSION_WINDOW = 10;
const SESSION_DECAY_MINUTES = 30;

// ======================================
// EPHEMERAL CACHE (5 min TTL)
// ======================================
const candidateCache = new Map<string, { ids: number[]; timestamp: number }>();
const CANDIDATE_TTL = 5 * 60 * 1000;

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

// --- FEATURE LABELS (chips only) ---
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

// --- CHIP EXTRACTION (UI-only, no scoring) ---
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

  return Array.from(chipMap.values());
}

// --- FORMAT HOTEL (UI-only, no scoring) ---
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

// =========================================================
// SESSION INTENT DETECTION (Prisma-based, realtime)
// =========================================================
//
// This detects the user's CURRENT session destination from
// recent interactions stored in PostgreSQL. It does NOT score
// hotels - that's recommend.py's job.
//
type IntentResult = {
  destination: string;
  source: "selected" | "recency" | "longterm";
};

/**
 * Get recency weight based on position (0 = most recent).
 * Weights: 1-3 → 0.8, 4-6 → 0.5, 7-10 → 0.3
 */
function getRecencyWeight(position: number): number {
  if (position < 3) return 0.8;
  if (position < 6) return 0.5;
  return 0.3;
}

/**
 * Time-decay weight for interaction age:
 *   <5 min  → 1.0  (full weight)
 *   5-15 min → 0.7
 *   15-30 min → 0.4
 *   >30 min → 0.0 (ignored)
 */
function getTimeDecayWeight(interactionDate: Date): number {
  const minutesAgo = (Date.now() - interactionDate.getTime()) / (1000 * 60);
  if (minutesAgo < 5) return 1.0;
  if (minutesAgo < 15) return 0.7;
  if (minutesAgo < 30) return 0.4;
  return 0.0;
}

async function detectSessionIntent(
  userId: string,
): Promise<IntentResult | null> {
  const interactions = await prisma.interaction.findMany({
    where: {
      userId,
      type: {
        in: [
          "VIEW",
          "LIKE",
          "BOOK",
          "RATING",
          "ADD_TO_WISHLIST",
          "CLICK_BOOK_NOW",
          "RATE_POSITIVE",
          "RATE_NEGATIVE",
        ],
      },
    },
    orderBy: { timestamp: "desc" },
    include: { hotel: { select: { destination: true } } },
  });

  if (!interactions.length) return null;

  // Session decay: latest interaction > 30min ago → session expired
  const latestTs = interactions[0]!.timestamp.getTime();
  const minutesSince = (Date.now() - latestTs) / (1000 * 60);
  if (minutesSince > SESSION_DECAY_MINUTES) {
    console.log(
      `[intent] Session expired: ${minutesSince.toFixed(0)}min since last interaction`,
    );
    return null;
  }

  // PRIORITY 1: Selected hotels (high-intent, time-decayed)
  const HIGH_INTENT = ["CLICK_BOOK_NOW", "ADD_TO_WISHLIST", "BOOK"];
  const highIntent = interactions.filter((i) => HIGH_INTENT.includes(i.type));
  const selectedHotels = highIntent.slice(0, 3);

  if (selectedHotels.length >= 2) {
    const destCounts = new Map<string, number>();
    for (const inter of selectedHotels) {
      const dest = inter.hotel?.destination;
      if (dest) {
        const tdw = getTimeDecayWeight(inter.timestamp);
        destCounts.set(dest, (destCounts.get(dest) || 0) + tdw);
      }
    }
    if (destCounts.size > 0) {
      const sorted = [...destCounts.entries()].sort((a, b) => b[1] - a[1]);
      const [topDest, topCount] = sorted[0]!;
      const ratio = topCount / selectedHotels.length;
      if (ratio >= 0.66) {
        console.log(
          `[intent] 🎯 SELECTED HOTELS: "${topDest}" (${topCount}/${selectedHotels.length})`,
        );
        return { destination: topDest, source: "selected" };
      }
    }
  }

  // PRIORITY 2: Weighted recency (last 10 interactions)
  const recent = interactions.slice(0, SESSION_WINDOW);
  const weightedScores = new Map<string, number>();
  let totalWeight = 0;
  for (let i = 0; i < recent.length; i++) {
    const dest = recent[i]!.hotel?.destination;
    if (!dest) continue;
    const recencyWeight = getRecencyWeight(i);
    const tdw = getTimeDecayWeight(recent[i]!.timestamp);
    const combinedWeight = recencyWeight * tdw;
    weightedScores.set(dest, (weightedScores.get(dest) || 0) + combinedWeight);
    totalWeight += combinedWeight;
  }
  if (weightedScores.size > 0 && totalWeight > 0) {
    const sorted = [...weightedScores.entries()].sort((a, b) => b[1] - a[1]);
    const [topDest, topScore] = sorted[0]!;
    const ratio = topScore / totalWeight;
    if (ratio >= 0.4) {
      console.log(
        `[intent] 📍 WEIGHTED RECENCY: "${topDest}" (ratio=${(ratio * 100).toFixed(0)}%)`,
      );
      return { destination: topDest, source: "recency" };
    }
  }

  // PRIORITY 3: Long-term profile
  const allDestCounts = new Map<string, number>();
  for (const inter of interactions) {
    const dest = inter.hotel?.destination;
    if (dest) allDestCounts.set(dest, (allDestCounts.get(dest) || 0) + 1);
  }
  if (allDestCounts.size > 0) {
    const sorted = [...allDestCounts.entries()].sort((a, b) => b[1] - a[1]);
    const [topDest, topCount] = sorted[0]!;
    const ratio = topCount / interactions.length;
    if (ratio >= 0.6) {
      console.log(
        `[intent] 📊 LONG-TERM: "${topDest}" (${(ratio * 100).toFixed(0)}%)`,
      );
      return { destination: topDest, source: "longterm" };
    }
  }

  return null;
}

// ======================================
// MAIN SERVER ACTION
// ======================================
//
// Architecture role: THIN ORCHESTRATOR
//
// This file:
//   ✅ Detects session intent (from PostgreSQL via Prisma)
//   ✅ Fetches candidates from search-service
//   ✅ Fetches hotel details from Prisma
//   ✅ Formats results for UI
//   ✅ Generates insight chips
//   ✅ Caches candidates
//
// recommend.py:
//   ✅ Hybrid scoring (SVD + Content)
//   ✅ Confidence-based destination boosting
//   ✅ Intent-aware retrieval filtering
//   ✅ Diversity reranking
//   ✅ Single source of truth for scoring logic
//
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
            "RATE_POSITIVE",
            "RATE_NEGATIVE",
          ],
        },
      },
    });
    if (interactionCount < MIN_INTERACTIONS) return null;

    // 2. Detect session intent (realtime from PostgreSQL)
    const intent = await detectSessionIntent(user.id);
    const sessionDestination = intent?.destination ?? null;

    if (sessionDestination) {
      console.log(
        `[recommend] Session intent: dest="${sessionDestination}" source=${intent!.source}`,
      );
    }

    // 3. Retrieve candidates (cache or fresh from search-service)
    const lastInteraction = await prisma.interaction.findFirst({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    });
    const cacheEntry = candidateCache.get(user.id);
    if (
      cacheEntry &&
      lastInteraction &&
      lastInteraction.timestamp.getTime() > cacheEntry.timestamp
    ) {
      console.log("[recommend] New interactions detected, invalidating cache");
      candidateCache.delete(user.id);
    }

    let candidateIds: number[] | null = getCachedCandidates(user.id);

    if (!candidateIds) {
      console.log("[recommend] Cache miss, fetching from search-service...");
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
        console.warn("⚠️ Search-service unreachable:", e.message);
      }
    } else {
      console.log(`[recommend] Cache hit: ${candidateIds.length} candidates`);
    }

    if (!candidateIds || candidateIds.length === 0) return null;

    // 4. Fetch hotel details from Prisma
    let hotels: any[];

    if (chipSignal) {
      // Chip-based filtering
      const colonIdx = chipSignal.indexOf(":");
      const signalType = chipSignal.substring(0, colonIdx);
      const signalValue = chipSignal.substring(colonIdx + 1);

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

      hotels = await prisma.hotel.findMany({
        where: poolWhere,
        include: { category: true },
      });

      if (hotels.length < 3) {
        // Broader search
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
      }
    } else {
      hotels = await prisma.hotel.findMany({
        where: { id: { in: candidateIds } },
        include: { category: true },
      });
    }

    if (hotels.length === 0) return null;

    // 5. Score candidates
    //    If session intent active: prioritize session destination
    //    Use candidate position as base score (from SVD ranking)
    const svdCandidateMap = new Map(
      candidateIds.slice(0, 15).map((id, idx) => [id, idx]),
    );

    const candidates: RecommendedHotel[] = hotels.map((h) => {
      const svdRank = svdCandidateMap.get(h.id);
      let score: number;
      if (svdRank !== undefined) {
        score = 0.9 - (svdRank / 15) * 0.4; // 0.9 → 0.5
      } else {
        score = 0.3 + (h.reviewStar || 0) / 10; // 0.3 → 0.8
      }

      // Confidence-based destination boost
      if (sessionDestination) {
        const hDest = (h.destination || "").toLowerCase();
        if (hDest === sessionDestination.toLowerCase()) {
          let boost: number;
          if (intent!.source === "selected") {
            boost = 1.6; // Strong: 2/3+ high-intent interactions
          } else if (intent!.source === "recency") {
            boost = 1.4; // Medium: weighted recency
          } else {
            boost = 1.2; // Weak: long-term preference
          }
          score = Math.min(1, score * boost);
        }
      }

      return formatHotel(h, score);
    });

    // Sort by score
    candidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    // 6. Diversity reranking
    let finalHotels: RecommendedHotel[];
    if (sessionDestination) {
      // Intra-destination diversity (same city, different categories)
      const sameDest = candidates.filter(
        (h) =>
          (h.destination || "").toLowerCase() ===
          sessionDestination.toLowerCase(),
      );
      const otherDest = candidates.filter(
        (h) =>
          (h.destination || "").toLowerCase() !==
          sessionDestination.toLowerCase(),
      );

      finalHotels = [];
      const usedCategories = new Set<string>();
      const usedPriceRanges = new Set<string>();
      const getPriceRange = (price: number): string => {
        if (price < 500000) return "budget";
        if (price < 1500000) return "mid";
        if (price < 3000000) return "premium";
        return "luxury";
      };

      // Pass 1: Intra-destination diversity (category + price)
      for (const hotel of sameDest) {
        if (finalHotels.length >= 3) break;
        const cat = hotel.category?.name || "unknown";
        const pr = getPriceRange(hotel.price);
        if (
          !usedCategories.has(cat) ||
          !usedPriceRanges.has(pr) ||
          usedCategories.size >= 2
        ) {
          finalHotels.push(hotel);
          usedCategories.add(cat);
          usedPriceRanges.add(pr);
        }
      }
      // Pass 2: Fill from same destination
      for (const hotel of sameDest) {
        if (finalHotels.length >= 3) break;
        if (!finalHotels.find((s) => s.id === hotel.id)) {
          finalHotels.push(hotel);
        }
      }
      // Pass 3: Other destinations only if needed
      for (const hotel of otherDest) {
        if (finalHotels.length >= 3) break;
        finalHotels.push(hotel);
      }
    } else {
      // Cross-destination diversity
      finalHotels = [];
      const usedDestinations = new Set<string>();
      for (const hotel of candidates) {
        if (finalHotels.length >= 3) break;
        const dest = hotel.destination || "";
        if (!usedDestinations.has(dest) || usedDestinations.size >= 3) {
          finalHotels.push(hotel);
          usedDestinations.add(dest);
        }
      }
      for (const hotel of candidates) {
        if (finalHotels.length >= 3) break;
        if (!finalHotels.find((s) => s.id === hotel.id)) {
          finalHotels.push(hotel);
        }
      }
    }

    // 7. Generate insight chips (UI-only)
    const allChips = extractInsightChips(candidates);

    // Add destination chips
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
