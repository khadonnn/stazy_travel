"use server";

import { prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://127.0.0.1:8008";

const SESSION_DECAY_MINUTES = 120;
const SESSION_DEST_THRESHOLD = 0.45; // Raised from 0.3 — prevents weak signals from dominating
const MIN_HIGH_INTENT = 3;

// =========================================================
// SINGLE NORMALIZE UTILITY — used EVERYWHERE
// =========================================================
function normalizeDest(dest: string): string {
  return (dest || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

// =========================================================
// SESSION-AWARE CACHE (key includes normalized dest + fingerprint)
// =========================================================
type CacheEntry = {
  result: AIRecommendationResult;
  timestamp: number;
  fingerprint: string;
  intentBucket: number;
  intentDestination: string;
  intentConfidence: number;
  chipSignal?: string;
};

const resultCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3 * 60 * 1000;

function getCacheKey(
  userId: string,
  destination: string | null,
  fingerprint: string,
  intentBucket: number,
  chipSignal?: string,
): string {
  const chipPart = chipSignal ? `::${chipSignal}` : "";
  return `${userId}::${normalizeDest(destination || "none")}::${fingerprint}::${intentBucket}${chipPart}`;
}

function getCachedResult(
  userId: string,
  destination: string | null,
  fingerprint: string,
  intentBucket: number,
  intentSnapshot: { destination: string | null; confidence: number },
  chipSignal?: string,
): AIRecommendationResult | null {
  const key = getCacheKey(
    userId,
    destination,
    fingerprint,
    intentBucket,
    chipSignal,
  );
  const entry = resultCache.get(key);
  if (!entry) {
    console.log(
      `[cache-check] userId=${userId} cachedKey=none currentKey=${key} cacheHit=false reason=VALID`,
    );
    return null;
  }
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    resultCache.delete(key);
    console.log(
      `[cache-check] userId=${userId} cachedKey=${key} currentKey=${key} cacheHit=false reason=VALID`,
    );
    return null;
  }
  if (entry.fingerprint !== fingerprint) {
    resultCache.delete(key);
    console.log(
      `[cache-check] userId=${userId} cachedKey=${key} currentKey=${key} cacheHit=false reason=STALE_FP`,
    );
    console.log(
      `[cache-invalidation] trigger=INTERACTION_ADDED userId=${userId}`,
    );
    return null;
  }
  const currentNormalizedDest = normalizeDest(destination || "none");
  if (entry.intentDestination !== currentNormalizedDest) {
    resultCache.delete(key);
    console.log(
      `[cache-check] userId=${userId} cachedKey=${key} currentKey=${key} cacheHit=false reason=STALE_DEST`,
    );
    console.log(`[cache-invalidation] trigger=DEST_CHANGED userId=${userId}`);
    return null;
  }
  if (
    Math.abs(entry.intentConfidence - (intentSnapshot.confidence || 0)) > 0.1
  ) {
    resultCache.delete(key);
    console.log(
      `[cache-check] userId=${userId} cachedKey=${key} currentKey=${key} cacheHit=false reason=STALE_INTENT`,
    );
    console.log(`[cache-invalidation] trigger=INTENT_SHIFT userId=${userId}`);
    return null;
  }
  // Extra safety: never return cached empty results
  if (!entry.result.hotels || entry.result.hotels.length === 0) {
    resultCache.delete(key);
    console.log(
      `[cache-check] userId=${userId} cachedKey=${key} currentKey=${key} cacheHit=false reason=VALID`,
    );
    return null;
  }
  console.log(
    `[cache-check] userId=${userId} cachedKey=${key} currentKey=${key} cacheHit=true reason=VALID`,
  );
  return entry.result;
}

function setCachedResult(
  userId: string,
  destination: string | null,
  fingerprint: string,
  intentBucket: number,
  intentSnapshot: { destination: string | null; confidence: number },
  result: AIRecommendationResult,
  chipSignal?: string,
) {
  // NEVER cache empty results
  if (!result.hotels || result.hotels.length === 0) {
    console.log(`[cache] SKIP caching — empty result`);
    return;
  }
  const key = getCacheKey(
    userId,
    destination,
    fingerprint,
    intentBucket,
    chipSignal,
  );
  resultCache.set(key, {
    result,
    timestamp: Date.now(),
    fingerprint,
    intentBucket,
    intentDestination: normalizeDest(
      intentSnapshot.destination || destination || "none",
    ),
    intentConfidence: intentSnapshot.confidence || 0,
    chipSignal,
  });
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
  slug: string;
  title: string;
  address: string;
  price: number;
  reviewStar: number;
  reviewCount: number;
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

// Interaction type weights — VIEW is passive, must be minimal
const INTERACTION_WEIGHTS: Record<string, number> = {
  VIEW: 0.5,
  CLICK_BOOK_NOW: 2.0,
  ADD_TO_WISHLIST: 3.0,
  RATE_POSITIVE: 4.5,
  BOOK: 5.0,
  RATE_NEGATIVE: -3.0,
};

const HIGH_INTENT_TYPES = new Set([
  "CLICK_BOOK_NOW",
  "ADD_TO_WISHLIST",
  "BOOK",
]);

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
  return Array.from(chipMap.values());
}

// --- FORMAT HOTEL ---
function formatHotel(h: any, score: number): RecommendedHotel {
  return {
    id: h.id,
    slug: h.slug || String(h.id),
    title: h.title,
    address: h.address,
    price: Number(h.price),
    reviewStar: Number(h.reviewStar || 0),
    reviewCount: Number(h.reviewCount || 0),
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
// HOTEL CACHE (load once, filter in JS — avoids Prisma diacritics bug)
// =========================================================
let _allHotelsCache: any[] | null = null;
let _allHotelsCacheTs = 0;
const HOTEL_CACHE_TTL = 10 * 60 * 1000;

async function getAllApprovedHotels(): Promise<any[]> {
  if (_allHotelsCache && Date.now() - _allHotelsCacheTs < HOTEL_CACHE_TTL) {
    return _allHotelsCache;
  }
  const hotels = await prisma.hotel.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ reviewStar: "desc" }, { reviewCount: "desc" }],
    take: 200,
    include: { category: true },
  });
  _allHotelsCache = hotels;
  _allHotelsCacheTs = Date.now();
  console.log(`[hotels] Loaded ${hotels.length} approved hotels into cache`);
  return hotels;
}

// =========================================================
// TIME DECAY — aggressive decay for old interactions
// =========================================================
function timeDecay(ts: Date, now: number): number {
  const minsAgo = (now - ts.getTime()) / (1000 * 60);
  if (minsAgo < 5) return 1.0;
  if (minsAgo < 15) return 0.7;
  if (minsAgo < 30) return 0.4;
  if (minsAgo < 60) return 0.15;
  if (minsAgo < 120) return 0.05;
  return 0.01;
}

// =========================================================
// STEP 1: SESSION INTENT DETECTION
// =========================================================
async function detectSessionIntent(userId: string): Promise<{
  destination: string;
  source: string;
  confidence: number;
} | null> {
  try {
    const interactions = await prisma.interaction.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 20,
      include: {
        hotel: { select: { destination: true } },
      },
    });

    if (!interactions.length) return null;

    const now = Date.now();

    // SESSION DECAY
    const latestTs = interactions[0]!.timestamp.getTime();
    const minutesSince = (now - latestTs) / (1000 * 60);
    if (minutesSince > SESSION_DECAY_MINUTES) {
      console.log(`[intent] ⏰ Session expired: ${minutesSince.toFixed(0)}min`);
      return null;
    }

    // =========================================================
    // PRIORITY 0a: SINGLE-CLICK EXPLORATION DETECTION
    // If the latest interaction points to a destination different from
    // the majority of recent history, the user is actively exploring
    // a NEW destination. This catches single-click destination switches.
    // =========================================================
    const latest = interactions[0]!;
    const latestDest = (latest as any).hotel?.destination;
    if (latestDest) {
      // Check if the latest destination is different from the majority of
      // interactions 2-10 (the "old" destination)
      const older = interactions.slice(1, 10);
      if (older.length >= 2) {
        const olderDestCounts = new Map<string, number>();
        for (const inter of older) {
          const d = (inter as any).hotel?.destination;
          if (d) olderDestCounts.set(d, (olderDestCounts.get(d) || 0) + 1);
        }
        if (olderDestCounts.size > 0) {
          const sortedOlder = [...olderDestCounts.entries()].sort(
            (a, b) => b[1] - a[1],
          );
          const [oldDest, oldCount] = sortedOlder[0]!;
          const latestNorm = normalizeDest(latestDest);
          const oldNorm = normalizeDest(oldDest);
          // If latest click is DIFFERENT from old majority AND has enough history
          if (latestNorm !== oldNorm && oldCount / older.length >= 0.4) {
            // The latest click is on a NEW destination — treat as exploration
            const minsAgo = (now - latest.timestamp.getTime()) / (1000 * 60);
            if (minsAgo < 10) {
              // Only if very recent (within 10 min)
              console.log(
                `[intent] 🔍 EXPLORATION: "${latestDest}" ` +
                  `(latest click is NEW dest vs old majority="${oldDest}" ` +
                  `${oldCount}/${older.length}). ` +
                  `confidence=0.70`,
              );
              return {
                destination: latestDest,
                source: "exploration",
                confidence: 0.7,
              };
            }
          }
        }
      }
    }

    // =========================================================
    // PRIORITY 0b: RECENT SHIFT DETECTION
    // If 2+ of last 3 interactions point to same destination
    // (any type, including VIEW), the user is actively exploring NOW.
    // =========================================================
    const last3 = interactions.slice(0, 3);
    if (last3.length >= 2) {
      const recentDestCounts = new Map<string, number>();
      for (const inter of last3) {
        const dest = (inter as any).hotel?.destination;
        if (dest) {
          recentDestCounts.set(dest, (recentDestCounts.get(dest) || 0) + 1);
        }
      }
      if (recentDestCounts.size > 0) {
        const sorted2 = [...recentDestCounts.entries()].sort(
          (a, b) => b[1] - a[1],
        );
        const [recentDest, recentCount] = sorted2[0]!;
        if (recentCount >= 2) {
          const ratio = recentCount / last3.length;
          console.log(
            `[intent] ⚡ RECENT SHIFT: "${recentDest}" ` +
              `(${recentCount}/${last3.length} = ${(ratio * 100).toFixed(0)}% of last 3) ` +
              `confidence=${(ratio * 0.95).toFixed(2)}`,
          );
          return {
            destination: recentDest,
            source: "recent-shift",
            confidence: ratio * 0.95,
          };
        }
      }
    }

    // =========================================================
    // PRIORITY 1: High-intent interactions
    // =========================================================
    const highIntent = interactions.filter(
      (i) => i.type && HIGH_INTENT_TYPES.has(i.type),
    );
    const recentHighIntent = highIntent.slice(0, 5);

    if (recentHighIntent.length >= MIN_HIGH_INTENT) {
      const destScores = new Map<string, number>();
      for (const inter of recentHighIntent) {
        const dest = (inter as any).hotel?.destination;
        if (dest) {
          destScores.set(
            dest,
            (destScores.get(dest) || 0) + timeDecay(inter.timestamp, now),
          );
        }
      }

      if (destScores.size > 0) {
        const sorted = [...destScores.entries()].sort((a, b) => b[1] - a[1]);
        const [topDest, topScore] = sorted[0]!;
        const totalScore = [...destScores.values()].reduce((a, b) => a + b, 0);
        const ratio = topScore / totalScore;

        if (ratio >= 0.5) {
          console.log(
            `[intent] 🎯 HIGH-INTENT: "${topDest}" ` +
              `(${topScore.toFixed(2)}/${totalScore.toFixed(2)} = ${(ratio * 100).toFixed(0)}%)`,
          );
          return {
            destination: topDest,
            source: "selected",
            confidence: ratio * 0.9,
          };
        }
      }
    }

    // =========================================================
    // PRIORITY 2: Weighted recency (last 10 only, not 15)
    // =========================================================
    const recent = interactions.slice(0, 10);
    const destScores = new Map<string, number>();
    let totalWeight = 0;

    for (const inter of recent) {
      const dest = (inter as any).hotel?.destination;
      if (!dest) continue;

      const typeWeight = INTERACTION_WEIGHTS[inter.type] ?? 1.0;
      const decay = timeDecay(inter.timestamp, now);
      const combined = Math.max(0, typeWeight) * decay;
      const minsAgo = (now - inter.timestamp.getTime()) / (1000 * 60);

      destScores.set(dest, (destScores.get(dest) || 0) + combined);
      totalWeight += combined;

      console.log(
        `[interaction] hotel=${inter.hotelId} dest="${dest}" type=${inter.type} ` +
          `minsAgo=${minsAgo.toFixed(0)} decay=${decay.toFixed(2)} ` +
          `typeW=${typeWeight.toFixed(1)} combined=${combined.toFixed(3)}`,
      );
    }

    if (destScores.size > 0 && totalWeight > 0) {
      // Debug: full breakdown
      const sorted = [...destScores.entries()].sort((a, b) => b[1] - a[1]);
      for (const [dest, score] of sorted) {
        const ratio = score / totalWeight;
        console.log(
          `[dest-breakdown] "${dest}" weightedScore=${score.toFixed(3)} ratio=${(ratio * 100).toFixed(1)}%`,
        );
      }

      const [topDest, topScore] = sorted[0]!;
      const ratio = topScore / totalWeight;

      if (ratio >= SESSION_DEST_THRESHOLD) {
        console.log(
          `[intent] 📍 WEIGHTED RECENCY: "${topDest}" ` +
            `ratio=${(ratio * 100).toFixed(0)}% confidence=${ratio.toFixed(2)}`,
        );
        return { destination: topDest, source: "recency", confidence: ratio };
      }

      console.log(
        `[intent] No dominant dest (threshold=${SESSION_DEST_THRESHOLD}). Top="${topDest}" at ${(ratio * 100).toFixed(1)}%`,
      );
    }

    return null;
  } catch (err) {
    console.warn("[intent] Detection failed:", err);
    return null;
  }
}

// =========================================================
// STEP 2: SESSION-AWARE CANDIDATE RETRIEVAL
// =========================================================
async function retrieveCandidates(
  sessionDestination: string | null,
): Promise<any[]> {
  const DEST_LIMIT = 40;
  const GLOBAL_LIMIT = 40;

  const allHotels = await getAllApprovedHotels();

  if (allHotels.length === 0) {
    console.log("[candidates] ⚠️ No approved hotels in database!");
    return [];
  }

  if (sessionDestination) {
    const sessionNorm = normalizeDest(sessionDestination);

    const destHotels = allHotels
      .filter((h) => normalizeDest(h.destination || "") === sessionNorm)
      .sort(
        (a, b) =>
          (Number(b.reviewStar) || 0) * (Number(b.reviewCount) || 0) -
          (Number(a.reviewStar) || 0) * (Number(a.reviewCount) || 0),
      )
      .slice(0, DEST_LIMIT);

    const destIds = new Set(destHotels.map((h) => h.id));

    const globalHotels = allHotels
      .filter((h) => !destIds.has(h.id))
      .sort(
        (a, b) =>
          (Number(b.reviewStar) || 0) * (Number(b.reviewCount) || 0) -
          (Number(a.reviewStar) || 0) * (Number(a.reviewCount) || 0),
      )
      .slice(0, GLOBAL_LIMIT);

    console.log(
      `[candidates] Session dest="${sessionDestination}" (norm="${sessionNorm}"): ` +
        `${destHotels.length} dest + ${globalHotels.length} global fillers`,
    );

    const merged = [...destHotels, ...globalHotels];

    if (destHotels.length === 0) {
      console.log(
        `[candidates] ⚠️ 0 dest hotels! Using ${merged.length} global as fallback`,
      );
    }

    return merged;
  }

  const globalHotels = allHotels
    .sort(
      (a, b) =>
        (Number(b.reviewStar) || 0) * (Number(b.reviewCount) || 0) -
        (Number(a.reviewStar) || 0) * (Number(a.reviewCount) || 0),
    )
    .slice(0, DEST_LIMIT + GLOBAL_LIMIT);

  console.log(
    `[candidates] No intent: ${globalHotels.length} top-rated globally`,
  );
  return globalHotels;
}

// =========================================================
// STEP 3: USER PROFILE + HYBRID SCORING
// =========================================================
async function buildUserProfile(userId: string) {
  const interactions = await prisma.interaction.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
    take: 50,
    include: {
      hotel: {
        select: {
          destination: true,
          amenities: true,
          tags: true,
          suitableFor: true,
          price: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  const destCounts = new Map<string, number>();
  const amenityCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const prices: number[] = [];

  for (const inter of interactions) {
    const hotel = (inter as any).hotel;
    if (!hotel) continue;

    const w = Math.max(0, INTERACTION_WEIGHTS[inter.type] ?? 1.0);

    if (hotel.destination) {
      const dn = normalizeDest(hotel.destination);
      destCounts.set(dn, (destCounts.get(dn) || 0) + w);
    }
    for (const a of hotel.amenities || []) {
      amenityCounts.set(a, (amenityCounts.get(a) || 0) + w);
    }
    for (const t of hotel.tags || []) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + w);
    }
    if (hotel.category?.name) {
      categoryCounts.set(
        hotel.category.name,
        (categoryCounts.get(hotel.category.name) || 0) + w,
      );
    }
    if (hotel.price) prices.push(Number(hotel.price));
  }

  return {
    preferredDestinations: destCounts,
    preferredAmenities: amenityCounts,
    preferredTags: tagCounts,
    preferredCategories: categoryCounts,
    avgPrice:
      prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    totalInteractions: interactions.length,
  };
}

function scoreCandidate(
  hotel: any,
  profile: Awaited<ReturnType<typeof buildUserProfile>>,
  sessionDestination: string | null,
): number {
  let score = 0;
  const hotelDestNorm = normalizeDest(hotel.destination || "");

  // 1. Review quality (15%)
  score += ((Number(hotel.reviewStar) || 0) / 5) * 0.15;

  // 2. Session destination match (40% — STRONGEST signal)
  if (sessionDestination) {
    if (hotelDestNorm === normalizeDest(sessionDestination)) {
      score += 0.4;
    }
  } else {
    const destPref = profile.preferredDestinations;
    if (destPref.size > 0 && hotel.destination) {
      const maxCount = Math.max(...Array.from(destPref.values()));
      const hotelDestKey = normalizeDest(hotel.destination || "");
      const destScore = (destPref.get(hotelDestKey) || 0) / maxCount;
      score += destScore * 0.15;
    }
  }

  // 3. Amenity overlap (15%)
  const hotelAmenities = new Set<string>(hotel.amenities || []);
  if (hotelAmenities.size > 0 && profile.preferredAmenities.size > 0) {
    const maxAmenity = Math.max(
      ...Array.from(profile.preferredAmenities.values()),
    );
    let amenityScore = 0;
    for (const a of hotelAmenities) {
      amenityScore += (profile.preferredAmenities.get(a) || 0) / maxAmenity;
    }
    score += Math.min(1, amenityScore / hotelAmenities.size) * 0.15;
  }

  // 4. Tag overlap (10%)
  const hotelTags = new Set<string>(hotel.tags || []);
  if (hotelTags.size > 0 && profile.preferredTags.size > 0) {
    const maxTag = Math.max(...Array.from(profile.preferredTags.values()));
    let tagScore = 0;
    for (const t of hotelTags) {
      tagScore += (profile.preferredTags.get(t) || 0) / maxTag;
    }
    score += Math.min(1, tagScore / hotelTags.size) * 0.1;
  }

  // 5. Price similarity (10%)
  if (profile.avgPrice > 0 && hotel.price) {
    const hotelPrice = Number(hotel.price);
    const priceRatio =
      Math.min(profile.avgPrice, hotelPrice) /
      Math.max(profile.avgPrice, hotelPrice);
    score += priceRatio * 0.1;
  }

  // 6. Category match (10%)
  const catName = hotel.category?.name;
  if (catName && profile.preferredCategories.size > 0) {
    const maxCat = Math.max(
      ...Array.from(profile.preferredCategories.values()),
    );
    const catScore = (profile.preferredCategories.get(catName) || 0) / maxCat;
    score += catScore * 0.1;
  }

  return Math.min(1, score);
}

// =========================================================
// STEP 4: DIVERSITY RERANKING (on top 50, slice top 4)
// =========================================================
function diversityRerank(
  scored: RecommendedHotel[],
  topK: number,
  sessionDestination: string | null,
): RecommendedHotel[] {
  console.log(
    `[ranking-before] Top 10: ${scored
      .slice(0, 10)
      .map((h) => `${h.destination}(${h.matchScore?.toFixed(2)})`)
      .join(", ")}`,
  );

  const byDest = new Map<string, RecommendedHotel[]>();
  for (const h of scored) {
    const dest = normalizeDest(h.destination || "") || "unknown";
    if (!byDest.has(dest)) byDest.set(dest, []);
    byDest.get(dest)!.push(h);
  }

  const destDist = [...byDest.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([d, hotels]) => `${d}=${hotels.length}`)
    .join(", ");
  console.log(`[candidates] Distribution: ${destDist}`);

  const sessionDestNorm = sessionDestination
    ? normalizeDest(sessionDestination)
    : null;

  const destKeys = [...byDest.keys()].sort((a, b) => {
    if (sessionDestNorm) {
      if (a === sessionDestNorm) return -1;
      if (b === sessionDestNorm) return 1;
    }
    const bestA = byDest.get(a)![0]?.matchScore || 0;
    const bestB = byDest.get(b)![0]?.matchScore || 0;
    return bestB - bestA;
  });

  const result: RecommendedHotel[] = [];
  const destPtrs = new Map<string, number>();
  for (const dest of destKeys) destPtrs.set(dest, 0);

  if (sessionDestNorm && byDest.has(sessionDestNorm)) {
    const destHotels = byDest.get(sessionDestNorm)!;
    if (destHotels.length > 0) {
      // Reserve up to 3 slots for session destination to respect strong intent
      const reserve = Math.min(3, destHotels.length, topK);
      for (let i = 0; i < reserve; i++) {
        result.push(destHotels[i]!);
      }
      destPtrs.set(sessionDestNorm, reserve);
    }
  }

  while (result.length < topK) {
    let added = false;
    for (const dest of destKeys) {
      if (result.length >= topK) break;
      const ptr = destPtrs.get(dest) || 0;
      const destHotels = byDest.get(dest)!;
      if (ptr < destHotels.length) {
        result.push(destHotels[ptr]!);
        destPtrs.set(dest, ptr + 1);
        added = true;
      }
    }
    if (!added) break;
  }

  console.log(
    `[ranking-after] Top ${topK}: ${result.map((h) => h.destination).join(", ")}`,
  );

  return result;
}

// ======================================
// MAIN SERVER ACTION
// ======================================
export async function getAIRecommendations(
  chipSignal?: string,
  forceRefresh?: boolean,
): Promise<AIRecommendationResult | null> {
  const user = await currentUser();
  if (!user) return null;

  try {
    // STEP 1: Detect session intent
    const intent = await detectSessionIntent(user.id);
    const sessionDestination = intent?.destination ?? null;

    console.log(
      `[recommend] === START userId=${user.id} ` +
        `intent="${sessionDestination || "none"}" ` +
        `source=${intent?.source || "none"} ` +
        `confidence=${intent?.confidence?.toFixed(2) || "0"} ===`,
    );

    // STEP 2: Cache check (composite fingerprint)
    const recentInteractions = await prisma.interaction.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: { id: true, hotelId: true, type: true, timestamp: true },
    });

    // Use the LATEST interaction (any type) as the fingerprint.
    // Previously we preferred non-VIEW which caused VIEW clicks to never
    // change the fingerprint, resulting in stale cache hits.
    const latestInteraction = recentInteractions[0] || null;

    const fingerprint = latestInteraction
      ? `${latestInteraction.id}:${latestInteraction.hotelId}:${latestInteraction.type}:${latestInteraction.timestamp.getTime()}`
      : "empty";

    const latestInteractionTs =
      recentInteractions[0]?.timestamp?.getTime() || 0;
    const intentBucket = latestInteractionTs
      ? Math.floor(latestInteractionTs / 60000)
      : 0;
    console.log(`[fingerprint] userId=${user.id} fp="${fingerprint}"`);

    if (!forceRefresh) {
      const cached = getCachedResult(
        user.id,
        sessionDestination,
        fingerprint,
        intentBucket,
        {
          destination: sessionDestination,
          confidence: Number(intent?.confidence || 0),
        },
        chipSignal,
      );
      if (cached) {
        console.log(`[recommend] === CACHED RESULT (served) ===`);
        return cached;
      } else {
        console.log(`[recommend] cache miss / invalidated — recomputing`);
      }
    } else {
      console.log(`[recommend] === FORCE REFRESH (cache bypassed) ===`);
    }

    // Prefer centralized Search Service (Python) which implements SVD+Content hybrid.
    // If the service is unavailable or returns empty, fall back to the local pipeline below.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const forceParam = forceRefresh ? "&force_refresh=true" : "";
      const destParam = sessionDestination
        ? `&destination=${encodeURIComponent(sessionDestination)}`
        : "";
      const confParam = intent?.confidence
        ? `&confidence=${intent.confidence.toFixed(2)}`
        : "";
      const chipParam = chipSignal
        ? `&chip_signal=${encodeURIComponent(chipSignal)}`
        : "";
      console.log(
        `[recommend] → Calling search service with destination="${sessionDestination || "none"}" confidence=${intent?.confidence?.toFixed(2) || "0"} chipSignal="${chipSignal || "none"}"`,
      );
      const resp = await fetch(
        `${SEARCH_SERVICE_URL.replace(/\/$/, "")}/recommend/${encodeURIComponent(user.id)}?strategy=svd&top_k=4${forceParam}${destParam}${confParam}${chipParam}`,
        { method: "GET", cache: "no-store", signal: controller.signal },
      );
      clearTimeout(timeout);

      if (resp.ok) {
        const aiResults = await resp.json();
        if (Array.isArray(aiResults) && aiResults.length > 0) {
          const ids = aiResults
            .map((r: any) => Number(r.id || r.hotel_id))
            .filter(Boolean);
          if (ids.length > 0) {
            const hotelsFromDb = await prisma.hotel.findMany({
              where: { id: { in: ids } },
              include: { category: true },
            });

            const hotelsOrdered = ids
              .map((id: number) => hotelsFromDb.find((h) => h.id === id))
              .filter(Boolean);

            const final: RecommendedHotel[] = hotelsOrdered.map((h: any) => {
              const remote =
                aiResults.find(
                  (r: any) => Number(r.id || r.hotel_id) === h.id,
                ) || {};
              const score =
                typeof remote.score === "number" ? remote.score : 0.5;
              return formatHotel(h, score);
            });

            const chips = extractInsightChips(final);
            const interactionCount = await prisma.interaction.count({
              where: { userId: user.id },
            });
            const result: AIRecommendationResult = {
              hotels: final,
              chips: chips.slice(0, 6),
              interactionCount,
            };

            if (final.length > 0)
              setCachedResult(
                user.id,
                sessionDestination,
                fingerprint,
                intentBucket,
                {
                  destination: sessionDestination,
                  confidence: Number(intent?.confidence || 0),
                },
                result,
                chipSignal,
              );

            console.log(
              `[recommend] === RETURNING SEARCH-SERVICE HYBRID (SVD) RESULT ===`,
            );
            return result;
          }
        }
      }
    } catch (err) {
      console.warn(
        "[recommend] Search service unavailable or timed out, falling back to local pipeline",
        err,
      );
    }

    // If search-service is unavailable or returned no usable result,
    // return null so the UI can hide the section instead of showing stale defaults.
    console.log(
      "[recommend] No usable recommendation result — returning null so UI can hide",
    );
    return null;
  } catch (error) {
    console.error("❌ AI Recommendations error:", error);
    return null;
  }
}
