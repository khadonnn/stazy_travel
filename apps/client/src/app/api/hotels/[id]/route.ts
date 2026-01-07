import { prisma } from "@repo/product-db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  // 🔥 QUAN TRỌNG: Định nghĩa params là Promise (cho Next.js 15+)
  props: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Await params để lấy dữ liệu (Fix lỗi undefined)
    const params = await props.params;

    // In ra terminal để kiểm tra xem ID có vào không
    console.log("🔥 API Received ID:", params.id);

    if (!params.id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const hotelId = parseInt(params.id);

    // 2. Kiểm tra tính hợp lệ
    if (isNaN(hotelId)) {
      console.log(" Invalid ID format:", params.id);
      return NextResponse.json(
        { error: "Invalid ID (Not a number)" },
        { status: 400 }
      );
    }

    // 3. Gọi Database Prisma
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      console.log(" Hotel not found in DB for ID:", hotelId);
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    // 4. Trả về kết quả
    return NextResponse.json(hotel);
  } catch (error) {
    console.error(" API Internal Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
