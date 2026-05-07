// app/api/favorites/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@repo/product-db";
import { auth } from "@clerk/nextjs/server";

// GET: Lấy danh sách yêu thích của user hiện tại
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        include: {
          hotel: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      success: true,
      data: favorites.map((fav) => ({
        id: fav.id,
        hotelId: fav.hotelId,
        createdAt: fav.createdAt,
        hotel: {
          ...fav.hotel,
          price: fav.hotel.price.toString(),
          map: fav.hotel.map,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    return NextResponse.json(
      { error: "Failed to get favorites" },
      { status: 500 },
    );
  }
}

// POST: Thêm khách sạn vào danh sách yêu thích
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { hotelId } = body;

    if (!hotelId || typeof hotelId !== "number") {
      return NextResponse.json(
        { error: "hotelId is required and must be a number" },
        { status: 400 },
      );
    }

    // Kiểm tra hotel có tồn tại không
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // Thêm vào favorites (upsert để tránh duplicate)
    const favorite = await prisma.favorite.upsert({
      where: {
        userId_hotelId: { userId, hotelId },
      },
      update: {}, // Không cần update gì
      create: {
        userId,
        hotelId,
      },
    });

    // Ghi lại interaction cho AI analytics
    await prisma.interaction.create({
      data: {
        userId,
        hotelId,
        type: "ADD_TO_WISHLIST",
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: favorite.id,
        hotelId: favorite.hotelId,
        createdAt: favorite.createdAt,
      },
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 },
    );
  }
}
