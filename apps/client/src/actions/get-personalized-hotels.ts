"use server";

import { prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";

export async function getPersonalizedHotels() {
  const user = await currentUser();

  let categories: string[] = [];

  if (user) {
    const userPref = await prisma.userPreference.findUnique({
      where: { userId: user.id },
    });
    if (userPref?.interestedCategories) {
      categories = userPref.interestedCategories;
    }
  }

  const hotels = await prisma.hotel.findMany({
    where:
      categories.length > 0
        ? {
            OR: [
              { category: { slug: { in: categories } } },
              { tags: { hasSome: categories } },
            ],
          }
        : undefined,
    orderBy: {
      reviewStar: "desc",
    },
    take: 7,
    include: {
      category: true,
    },
  });

  // Fallback nếu ít kết quả
  let finalHotels = hotels;
  if (hotels.length < 7) {
    const moreHotels = await prisma.hotel.findMany({
      where: { id: { notIn: hotels.map((h) => h.id) } },
      take: 7 - hotels.length,
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });
    finalHotels = [...hotels, ...moreHotels];
  }

  // ✅ [FIX LỖI DECIMAL]: Chuyển đổi toàn bộ Decimal sang Number
  return finalHotels.map((hotel: any) => ({
    ...hotel,
    price: Number(hotel.price),
    saleOff: Number(hotel.saleOff || 0),
    saleOffPercent: Number(hotel.saleOffPercent || 0),
    reviewStar: Number(hotel.reviewStar || 0),
    // Nếu có các trường Decimal khác (lat, lng...), hãy convert nốt tại đây
  }));
}
