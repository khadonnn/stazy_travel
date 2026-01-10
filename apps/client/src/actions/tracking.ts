"use server";

import { InteractionType, prisma } from "@repo/product-db";
import { useAuth } from "@clerk/nextjs";

export async function trackInteraction(
  hotelId: number,
  type: InteractionType,
  metadata?: any
) {
  try {
    const { userId } = await useAuth();
    if (!userId) return;

    await prisma.interaction.create({
      data: {
        userId,
        hotelId,
        type,
        metadata: metadata || {},
        timestamp: new Date(),
      },
    });

    // ⚠️ QUAN TRỌNG: Không được return gì cả hoặc return plain object.
    // ❌ TUYỆT ĐỐI KHÔNG GỌI: revalidatePath("/")
  } catch (error) {
    console.error("Tracking error:", error);
  }
}
