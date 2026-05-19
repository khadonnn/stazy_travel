"use server";

import { prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";

const MIN_INTERACTIONS = 1;
const SESSION_DECAY_MINUTES = 120;

function normalizeDest(dest: string): string {
  return (dest || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

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
// SESSION INTENT DETECTION (simple, reliable)
// =========================================================
async function detectSessionIntent(
  userId: string,
): Promise<{ destination: string; source: string } | null> {
  try {
    const interactions = await prisma.interaction.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 10,
      include: {
        hotel: { select: { destination: true } },
      },
    });

    if (!interactions.length) return null;

    // Session decay check
    const latestTs = interactions[0]!.timestamp.getTime();
    const minutesSince = (Date.now() - latestTs) / (1000 * 60);
    if (minutesSince > SESSION_DECAY_MINUTES) {
      console.log(`[intent] Session expired: ${minutesSince.toFixed(0)}min`);
      return null;
    }

    // Count destinations from recent interactions
    const destCounts = new Map<string, number>();
    for (const inter of interactions) {
      const dest = (inter as any).hotel?.destination;
      if (dest) {
        destCounts.set(dest, (destCounts.get(dest) || 0) + 1);
      }
    }

    if (destCounts.size === 0) return null;

    const sorted = [...destCounts.entries()].sort((a, b) => b[1] - a[1]);
    const [topDest, topCount] = sorted[0]!;
    const ratio = topCount / interactions.length;

    // Need at least 30% of interactions pointing to same destination
    if (ratio >= 0.3) {
      const source = ratio >= 0.5 ? "recency" : "longterm";
      console.log(
        `[intent] 📍 ${source}: "${topDest}" (${topCount}/${interactions.length} = ${(ratio * 100).toFixed(0)}%)`,
      );
      return { destination: topDest, source };
    }

    console.log(
      `[intent] No dominant destination (top: "${topDest}" at ${(ratio * 100).toFixed(0)}%)`,
    );
    return null;
  } catch (err) {
    console.warn("[intent] Detection failed:", err);
    return null;
  }
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
    // 1. Detect session intent
    const intent = await detectSessionIntent(user.id);
    const sessionDestination = intent?.destination ?? null;

    // 2. Fetch hotels from Prisma (always works)
    const hotels = await prisma.hotel.findMany({
      orderBy: [{ reviewStar: "desc" }, { reviewCount: "desc" }],
      take: 30,
      include: { category: true },
    });

    console.log(
      `[recommend] Loaded ${hotels.length} hotels, intent="${sessionDestination || "none"}"`,
    );

    if (hotels.length === 0) return null;

    // 3. Score candidates with destination boost
    const scored: RecommendedHotel[] = hotels.map((h) => {
      let score = 0.3 + (Number(h.reviewStar) || 0) / 10;

      // Boost matching destination
      if (sessionDestination) {
        const hDest = (h.destination || "").toLowerCase();
        if (hDest === sessionDestination.toLowerCase()) {
          score = Math.min(1, score * 1.5);
        }
      }

      return formatHotel(h, score);
    });
    scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    // 4. Select 4 hotels: prefer session destination
    let finalHotels: RecommendedHotel[];
    if (sessionDestination) {
      const sessionHotels = scored.filter(
        (h) =>
          (h.destination || "").toLowerCase() ===
          sessionDestination.toLowerCase(),
      );
      const others = scored.filter(
        (h) =>
          (h.destination || "").toLowerCase() !==
          sessionDestination.toLowerCase(),
      );
      finalHotels = [...sessionHotels, ...others].slice(0, 4);
      console.log(
        `[recommend] Session "${sessionDestination}": ${sessionHotels.length} matching, selected ${finalHotels.map((h) => h.destination).join(", ")}`,
      );
    } else {
      finalHotels = scored.slice(0, 4);
    }

    // 5. Extract chips
    const allChips = extractInsightChips(scored);

    // 6. Get interaction count
    const interactionCount = await prisma.interaction.count({
      where: { userId: user.id },
    });

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
