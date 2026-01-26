"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@repo/product-db";

export async function ensureUserExists() {
  const user = await currentUser();
  if (!user) {
    console.log("❌ No Clerk user found");
    return null;
  }

  const userEmail =
    user.emailAddresses[0]?.emailAddress || `${user.id}@placeholder.local`;

  try {
    // Bước 1: Tìm user theo ID (ưu tiên)
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (dbUser) {
      console.log("✅ User found by ID:", dbUser.id);
      return dbUser;
    }

    // Bước 2: Nếu không có, kiểm tra xem email đã tồn tại chưa
    dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (dbUser) {
      // Email đã tồn tại với user ID khác -> cập nhật ID mới
      console.log("⚠️ Email exists with different ID, updating...");
      dbUser = await prisma.user.update({
        where: { email: userEmail },
        data: {
          id: user.id,
          name: user.fullName || user.firstName || dbUser.name,
          avatar: user.imageUrl || dbUser.avatar,
          updatedAt: new Date(),
        },
      });
      console.log("✅ Updated existing user with new Clerk ID:", dbUser.id);
      return dbUser;
    }

    // Bước 3: Hoàn toàn mới -> tạo user
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: userEmail,
        name: user.fullName || user.firstName || "User",
        role: "USER",
        avatar: user.imageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Created new user:", dbUser.id);
    return dbUser;
  } catch (error) {
    console.error("❌ Error inside ensureUserExists:", error);
    throw error;
  }
}
