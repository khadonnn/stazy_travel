// app/api/interactions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@repo/product-db"; // Instance Prisma của bạn
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth(); // Xác thực người dùng
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { hotelId, type, metadata, rating } = body;

    // Lưu vào Database
    const interaction = await prisma.interaction.create({
      data: {
        userId: userId, // ID từ Clerk
        hotelId: hotelId,
        type: type, // 'VIEW', 'LIKE', 'BOOK', 'CLICK_BOOK_NOW'
        rating: rating || null, // Chỉ có nếu type là REVIEW
        metadata: metadata || {}, // Ví dụ: { duration: 30s }
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: interaction });
  } catch (error) {
    console.error("Tracking Error:", error);
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
