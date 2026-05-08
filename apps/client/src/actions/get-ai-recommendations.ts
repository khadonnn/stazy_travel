"use server";

import { prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://127.0.0.1:8008";
const MIN_INTERACTIONS = 5; // Production: Cần ít nhất 5 interactions để SVD có data đủ
const CACHE_DURATION = 3600000; // 1 giờ - giảm tải cho backend Python

export async function getAIRecommendations() {
  const user = await currentUser();

  // Chỉ show AI recommendations cho user đã login
  if (!user) {
    return null;
  }

  try {
    //  KIỂM TRA SỐ LƯỢNG INTERACTIONS TRƯỚC
    const interactionCount = await prisma.interaction.count({
      where: {
        userId: user.id,
        type: { in: ["VIEW", "LIKE", "BOOK", "RATING"] },
      },
    });

    console.log(`📊 User ${user.id} has ${interactionCount} interactions`);

    // Nếu chưa đủ interactions → Không hiện AI section
    if (interactionCount < MIN_INTERACTIONS) {
      console.log(
        `⚠️ Not enough interactions (${interactionCount}/${MIN_INTERACTIONS}), skip AI recommendations`,
      );
      return null;
    }

    // 1. Check cache trong DB
    const cachedRec = await prisma.recommendation.findUnique({
      where: { userId: user.id },
    });

    // Nếu có cache < 1 phút (dev) → Dùng
    if (
      cachedRec &&
      Date.now() - cachedRec.updatedAt.getTime() < CACHE_DURATION
    ) {
      const hotels = await prisma.hotel.findMany({
        where: { id: { in: cachedRec.hotelIds } },
        include: { category: true },
        take: 7,
      });

      if (hotels.length > 0) {
        console.log(
          `✅ Using cached AI recommendations (${hotels.length} hotels)`,
        );
        return {
          hotels: formatHotels(hotels),
          isFromCache: true,
          cachedAt: cachedRec.updatedAt,
          interactionCount,
        };
      }
    }

    // 2. Gọi AI Service (với timeout 5 giây)
    const aiUrl = `${SEARCH_SERVICE_URL}/recommend/${user.id}`;
    console.log("🤖 Calling AI Service for fresh recommendations...");
    console.log("🔗 URL:", aiUrl);

    let response: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      response = await fetch(aiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);
    } catch (fetchError: any) {
      // Network error, DNS failure, timeout, service not running...
      console.warn(
        "⚠️ AI Service unreachable (service may be offline):",
        fetchError.message,
      );
      return null; // Graceful fallback - không show AI section
    }

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      console.warn("⚠️ AI Service unavailable:", response.status);
      return null;
    }

    const aiResults = await response.json();

    console.log("🎯 AI Results sample:", aiResults.slice(0, 2)); // Log 2 items đầu

    if (!aiResults || aiResults.length === 0) {
      console.log("⚠️ AI Service returned empty results");
      return null;
    }

    // AI service trả về array of objects với key "id" (không phải "hotel_id")
    const hotelIds = aiResults.slice(0, 7).map((r: any) => r.id || r.hotel_id);

    // 3. Lưu cache
    await prisma.recommendation.upsert({
      where: { userId: user.id },
      update: { hotelIds, updatedAt: new Date() },
      create: { userId: user.id, hotelIds },
    });

    // 4. Lấy hotels từ DB
    const hotels = await prisma.hotel.findMany({
      where: { id: { in: hotelIds } },
      include: { category: true },
    });

    console.log(
      `✅ AI Service returned ${hotels.length} fresh recommendations`,
    );

    return {
      hotels: formatHotels(hotels),
      isFromCache: false,
      cachedAt: new Date(),
      interactionCount,
    };
  } catch (error) {
    console.error("❌ AI Recommendations error:", error);
    return null;
  }
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
