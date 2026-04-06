"use server";

import { prisma, InteractionType } from "@repo/product-db";
import { revalidatePath } from "next/cache";

// --- 1. HÀM GET (Thay thế cho API GET cũ) ---
export async function getReviews(hotelId: number) {
  try {
    const reviews = await prisma.review.findMany({
      where: { hotelId: hotelId },
      orderBy: { createdAt: "desc" }, // Mới nhất lên đầu
      take: 20, // Lấy 20 cái
      include: {
        user: {
          select: { name: true, avatar: true },
        },
      },
    });
    return reviews;
  } catch (error) {
    console.error("Lỗi lấy review:", error);
    return [];
  }
}

// --- 2. HÀM SUBMIT (Thay thế cho API POST cũ) ---
export async function submitReview(formData: FormData) {
  try {
    const hotelId = Number(formData.get("hotelId"));
    const userId = String(formData.get("userId"));
    const rating = Number(formData.get("rating"));
    const comment = String(formData.get("comment"));
    //  1. Lấy thêm Slug từ FormData để revalidate đúng đường dẫn
    const hotelSlug = String(formData.get("hotelSlug"));

    if (!userId || !hotelId || !rating) {
      return { error: "Thiếu thông tin bắt buộc" };
    }

    // ... (Code lưu Review và Interaction giữ nguyên) ...
    await prisma.review.create({
      data: {
        userId,
        hotelId,
        rating,
        comment,
        sentiment: "NEUTRAL",
      },
    });
    await prisma.interaction.create({
      data: {
        userId,
        hotelId,
        type: InteractionType.RATING,
      },
    });

    // C.  Sửa lại đường dẫn Revalidate cho đúng với URL thực tế
    // Nếu URL web là: /hotels/grand-hotel-nha-trang
    if (hotelSlug && hotelSlug !== "null") {
      revalidatePath(`/hotels/${hotelSlug}`);
    } else {
      // Fallback: Revalidate tất cả (nếu không có slug)
      revalidatePath("/");
      revalidatePath(`/hotels/[slug]`, "page");
    }

    return { success: true };
  } catch (error) {
    console.error("Lỗi gửi review:", error);
    return { error: "Lỗi server khi lưu đánh giá" };
  }
}
