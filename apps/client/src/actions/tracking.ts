"use server";

import { InteractionType, prisma } from "@repo/product-db";
import { currentUser } from "@clerk/nextjs/server";

export async function trackInteraction(
  hotelId: number,
  type: InteractionType,
  metadata?: any,
) {
  try {
    const user = await currentUser();
    if (!user) {
      console.log("⚠️ No user, skip tracking");
      return { success: false };
    }

    await prisma.interaction.create({
      data: {
        userId: user.id,
        hotelId,
        type,
        metadata: metadata || {},
        timestamp: new Date(),
      },
    });

    // Invalidate AI recommendations cache để update ngay
    await prisma.recommendation.updateMany({
      where: { userId: user.id },
      data: { updatedAt: new Date(0) }, // Set về epoch time để force refresh
    });

    console.log(
      `✅ Tracked ${type} interaction for hotel ${hotelId} by user ${user.id}`,
    );
    return { success: true };
  } catch (error) {
    console.error("❌ Tracking error:", error);
    return { success: false };
  }
}
