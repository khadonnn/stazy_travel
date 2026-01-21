"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@repo/product-db";
import type { IAuthorRequest, IAuthorRequestInput } from "@repo/types";
import { syncRoleToClerk } from "@/lib/auth/roles";

/**
 * Gửi yêu cầu trở thành Author
 */
export async function submitAuthorRequest(
  data: IAuthorRequestInput,
): Promise<{ success: boolean; message: string; data?: IAuthorRequest }> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, message: "Bạn cần đăng nhập để gửi yêu cầu" };
    }

    // Kiểm tra xem user đã gửi request pending chưa
    const existingRequest = await prisma.authorRequest.findFirst({
      where: {
        userId,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      return {
        success: false,
        message: "Bạn đã có yêu cầu đang chờ xử lý",
      };
    }

    // Tạo request mới
    const request = await prisma.authorRequest.create({
      data: {
        userId,
        ...data,
      },
    });

    return {
      success: true,
      message: "Gửi yêu cầu thành công! Chúng tôi sẽ xem xét trong 1-2 ngày.",
      data: request as IAuthorRequest,
    };
  } catch (error) {
    console.error("Error submitting author request:", error);
    return {
      success: false,
      message: "Có lỗi xảy ra. Vui lòng thử lại sau.",
    };
  }
}

/**
 * Lấy trạng thái Author Request của user hiện tại
 */
export async function getMyAuthorRequest(): Promise<IAuthorRequest | null> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    const request = await prisma.authorRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return request as IAuthorRequest | null;
  } catch (error) {
    console.error("Error getting author request:", error);
    return null;
  }
}
