"use server";

import { prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// 1. Kiểm tra user đã có sở thích chưa
export async function checkUserOnboarding() {
  const user = await currentUser();
  if (!user) return { isOnboarded: true }; // Không login thì coi như xong

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { preference: true },
  });

  // Nếu user chưa tồn tại trong DB (lỗi sync) hoặc chưa có preference
  if (!dbUser) return { isOnboarded: false };

  const hasCategories =
    dbUser.preference?.interestedCategories &&
    dbUser.preference.interestedCategories.length > 0;

  return { isOnboarded: !!hasCategories };
}

// 2. Lưu sở thích
export async function saveUserInterests(categories: string[]) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: { interestedCategories: categories },
    create: {
      userId: user.id,
      interestedCategories: categories,
      // Các trường khác để default hoặc null
    },
  });

  return { success: true };
}
