/**
 * Example: Protected Server Actions
 * Các ví dụ về cách bảo vệ server actions với role-based authorization
 */

"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@repo/product-db";
import { getUserRole } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/roles";

/**
 * Example 1: Kiểm tra role đơn giản
 */
export async function createHotelAction(hotelData: any) {
  const role = await getUserRole();

  // Chỉ AUTHOR và ADMIN mới được tạo hotel
  if (role !== "AUTHOR" && role !== "ADMIN") {
    return {
      success: false,
      message: "Bạn cần là Author để tạo khách sạn",
    };
  }

  // Logic tạo hotel
  // ...

  return { success: true, message: "Tạo khách sạn thành công" };
}

/**
 * Example 2: Helper function để check role
 */
async function requireRole(allowedRoles: UserRole[]) {
  const role = await getUserRole();

  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Unauthorized");
  }

  return role;
}

/**
 * Example 3: Sử dụng helper function
 */
export async function deleteHotelAction(hotelId: number) {
  // Yêu cầu phải là AUTHOR hoặc ADMIN
  await requireRole(["AUTHOR", "ADMIN"]);

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Kiểm tra ownership hoặc admin
  const role = await getUserRole();
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { authorId: true },
  });

  if (role !== "ADMIN" && hotel?.authorId !== userId) {
    throw new Error("Bạn không có quyền xóa khách sạn này");
  }

  // Logic xóa hotel
  await prisma.hotel.delete({ where: { id: hotelId } });

  return { success: true, message: "Đã xóa khách sạn" };
}

/**
 * Example 4: Admin-only action
 */
export async function approveHotelAction(hotelId: number) {
  // Chỉ ADMIN mới được approve
  const role = await requireRole(["ADMIN"]);

  await prisma.hotel.update({
    where: { id: hotelId },
    data: { status: "APPROVED" },
  });

  return { success: true, message: "Đã duyệt khách sạn" };
}

/**
 * Example 5: Role-based data filtering
 */
export async function getMyHotelsAction() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const role = await getUserRole();

  // ADMIN thấy tất cả hotels
  if (role === "ADMIN") {
    return await prisma.hotel.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  // AUTHOR chỉ thấy hotels của mình
  if (role === "AUTHOR") {
    return await prisma.hotel.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  // USER không được truy cập
  throw new Error("Unauthorized");
}

/**
 * Example 6: Partial permissions - User có thể xem, AUTHOR có thể edit
 */
export async function getHotelDetailsAction(hotelId: number) {
  const role = await getUserRole();
  const { userId } = await auth();

  // Fetch hotel với conditional includes dựa trên role
  const isAuthorOrAdmin = role === "AUTHOR" || role === "ADMIN";

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: {
      // AUTHOR/ADMIN thấy reviews với user details
      reviews: isAuthorOrAdmin ? { include: { user: true } } : undefined,
    },
  });

  // Nếu là ADMIN hoặc chủ hotel, fetch thêm bookings
  if (hotel && (role === "ADMIN" || userId === hotel.authorId)) {
    const hotelWithBookings = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        reviews: isAuthorOrAdmin ? { include: { user: true } } : undefined,
        bookings: true,
      },
    });
    return hotelWithBookings;
  }

  return hotel;
}
