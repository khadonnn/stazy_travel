/**
 * Action để đồng bộ role từ PostgreSQL lên Clerk cho user hiện tại
 */

"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@repo/product-db";
import { syncRoleToClerk } from "@/lib/auth/roles";

/**
 * Đồng bộ role của user hiện tại từ DB lên Clerk
 * User có thể tự gọi action này nếu role không khớp
 */
export async function syncMyRole() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        message: "Bạn cần đăng nhập",
      };
    }

    // Lấy role từ database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return {
        success: false,
        message: "Không tìm thấy thông tin user",
      };
    }

    // Đồng bộ lên Clerk
    const synced = await syncRoleToClerk(userId, user.role);

    if (!synced) {
      return {
        success: false,
        message: "Không thể đồng bộ role. Vui lòng thử lại sau.",
      };
    }

    return {
      success: true,
      message: `Đã đồng bộ role thành công! Role hiện tại: ${user.role}`,
      role: user.role,
    };
  } catch (error) {
    console.error("Error syncing role:", error);
    return {
      success: false,
      message: "Có lỗi xảy ra khi đồng bộ role",
    };
  }
}
