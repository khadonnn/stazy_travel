/**
 * Script nhanh để đồng bộ role cho 1 user cụ thể
 *
 * Usage: pnpm sync-user-role <userId>
 * Example: pnpm sync-user-role user_2xyz123
 */

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@repo/product-db";

const userId = process.argv[2] as string;

if (!userId) {
  console.error("❌ Vui lòng cung cấp userId");
  console.log("Usage: pnpm sync-user-role <userId>");
  process.exit(1);
}

async function syncUserRole() {
  console.log(`🔄 Đang đồng bộ role cho user: ${userId}`);

  try {
    // Lấy role từ database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      console.error(`❌ Không tìm thấy user với ID: ${userId}`);
      process.exit(1);
    }

    console.log(`📊 User info:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role in DB: ${user.role}`);

    // Sync lên Clerk
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: {
        role: user.role,
      },
    });

    console.log(`✅ Đã đồng bộ role lên Clerk: ${user.role}`);
    console.log(`\n🎉 Hoàn thành! User có thể reload trang để thấy thay đổi.`);
  } catch (error: any) {
    console.error("❌ Lỗi:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncUserRole();
