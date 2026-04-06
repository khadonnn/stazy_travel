"use server";

import { prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureUserExists } from "@/lib/auth/ensure-user";

// 1. Kiểm tra user đã có sở thích chưa
export async function checkUserOnboarding() {
  const user = await currentUser();
  if (!user) return { isOnboarded: true }; // Không login thì coi như xong

  //  Đảm bảo user tồn tại trong DB
  await ensureUserExists();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { preference: true },
  });

  //  FIX: Nếu user chưa có trong DB → chưa onboard
  if (!dbUser) return { isOnboarded: false };

  const hasCategories =
    dbUser.preference?.interestedCategories &&
    dbUser.preference.interestedCategories.length > 0;

  return { isOnboarded: !!hasCategories };
}

// 2. Lưu sở thích
export async function saveUserInterests(categories: string[]) {
  console.log("🚀 [saveUserInterests] Starting...");
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  console.log("🔑 [saveUserInterests] Clerk user ID:", user.id);

  //  Đảm bảo User tồn tại trong DB (dùng helper)
  console.log("⏳ [saveUserInterests] Calling ensureUserExists...");
  const dbUser = await ensureUserExists();
  console.log("📦 [saveUserInterests] ensureUserExists returned:", dbUser);

  if (!dbUser) {
    console.error("❌ [saveUserInterests] ensureUserExists returned null!");
    throw new Error("Failed to create user in database");
  }

  console.log("✅ [saveUserInterests] User exists in DB:", dbUser.id);

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: { interestedCategories: categories },
    create: {
      userId: user.id,
      interestedCategories: categories,
      // Các trường khác để default hoặc null
    },
  });

  //  Track interaction để AI biết user thích những category nào
  // Lấy 3-5 hotels mẫu từ mỗi category để tạo implicit signal
  for (const categorySlug of categories) {
    // Tìm category ID
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    });

    if (category) {
      // Lấy 3 hotels đầu tiên của category này
      const sampleHotels = await prisma.hotel.findMany({
        where: { categoryId: category.id, status: "APPROVED" },
        take: 3,
        select: { id: true },
      });

      // Tạo interaction VIEW cho mỗi hotel (implicit feedback)
      for (const hotel of sampleHotels) {
        await prisma.interaction.create({
          data: {
            userId: user.id,
            hotelId: hotel.id,
            type: "VIEW",
            metadata: { source: "onboarding_preference" },
          },
        });
      }
    }
  }

  revalidatePath("/");
  return { success: true };
}
