"use server";

import { prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";

export async function getPersonalizedHotels() {
  const user = await currentUser();

  // Nếu chưa login → Lấy hotels phổ biến
  if (!user) {
    console.log("🔍 [Personalized] Guest user - showing popular hotels");
    const hotels = await prisma.hotel.findMany({
      orderBy: [{ reviewStar: "desc" }, { reviewCount: "desc" }],
      take: 7,
      include: { category: true },
    });
    return formatHotels(hotels);
  }

  console.log("🔍 [Personalized] User:", user.id);

  // Lấy preferences của user
  const userPref = await prisma.userPreference.findUnique({
    where: { userId: user.id },
  });

  let categories: string[] = [];
  if (
    userPref?.interestedCategories &&
    userPref.interestedCategories.length > 0
  ) {
    categories = userPref.interestedCategories;
    console.log("👤 User preferences:", categories);
  } else {
    // User chưa có preferences → Lấy hotels popular
    console.log("⚠️ User chưa có preferences, show popular hotels");
    const hotels = await prisma.hotel.findMany({
      orderBy: [{ reviewStar: "desc" }, { reviewCount: "desc" }],
      take: 7,
      include: { category: true },
    });
    return formatHotels(hotels);
  }

  // Content-based filtering dựa trên categories
  const hotels = await prisma.hotel.findMany({
    where: {
      OR: [
        { category: { slug: { in: categories } } },
        { tags: { hasSome: categories } },
      ],
    },
    orderBy: { reviewStar: "desc" },
    take: 7,
    include: { category: true },
  });

  console.log(`🏨 Found ${hotels.length} hotels matching preferences`);

  // Fallback nếu ít kết quả
  let finalHotels = hotels;
  if (hotels.length < 7) {
    const moreHotels = await prisma.hotel.findMany({
      where: {
        id: { notIn: hotels.map((h) => h.id) },
      },
      take: 7 - hotels.length,
      orderBy: { reviewStar: "desc" },
      include: { category: true },
    });
    finalHotels = [...hotels, ...moreHotels];
    console.log(
      `➕ Added ${moreHotels.length} more hotels, total: ${finalHotels.length}`,
    );
  }

  return formatHotels(finalHotels);
}

// Helper: Format Decimal sang Number
function formatHotels(hotels: any[]) {
  return hotels.map((hotel) => ({
    ...hotel,
    price: Number(hotel.price),
    saleOff: Number(hotel.saleOff || 0),
    saleOffPercent: Number(hotel.saleOffPercent || 0),
    reviewStar: Number(hotel.reviewStar || 0),
  }));
}
