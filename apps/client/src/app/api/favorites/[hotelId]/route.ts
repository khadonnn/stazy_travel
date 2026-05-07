// app/api/favorites/[hotelId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@repo/product-db";
import { auth } from "@clerk/nextjs/server";

// DELETE: Xóa khách sạn khỏi danh sách yêu thích
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hotelId: hotelIdStr } = await params;
    const hotelId = parseInt(hotelIdStr);

    if (isNaN(hotelId)) {
      return NextResponse.json({ error: "Invalid hotelId" }, { status: 400 });
    }

    // Xóa khỏi favorites
    const deleted = await prisma.favorite.deleteMany({
      where: {
        userId,
        hotelId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 },
      );
    }

    // Ghi lại interaction cho AI analytics
    await prisma.interaction.create({
      data: {
        userId,
        hotelId,
        type: "LIKE", // Sử dụng LIKE hoặc có thể thêm REMOVE_FROM_WISHLIST
        metadata: { action: "remove_from_wishlist" },
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Removed from favorites",
    });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 },
    );
  }
}

// GET: Kiểm tra 1 hotel cụ thể có trong favorites không
export async function GET(
  req: Request,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ isFavorited: false });
    }

    const { hotelId: hotelIdStr } = await params;
    const hotelId = parseInt(hotelIdStr);

    if (isNaN(hotelId)) {
      return NextResponse.json({ isFavorited: false });
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_hotelId: { userId, hotelId },
      },
    });

    return NextResponse.json({
      isFavorited: !!favorite,
    });
  } catch (error) {
    console.error("Check favorite error:", error);
    return NextResponse.json({ isFavorited: false });
  }
}
