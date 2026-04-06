import { prisma } from "@repo/product-db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const { id } = params;

    console.log(" API Received ID/Slug:", id);

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }
    const isNumeric = /^\d+$/.test(id);
    const whereCondition = isNumeric
      ? { id: parseInt(id) } // Nếu là số: Tìm theo ID
      : { slug: id }; // Nếu là chữ: Tìm theo Slug

    // 3. Gọi Database Prisma
    const hotel = await prisma.hotel.findUnique({
      where: whereCondition,
    });

    if (!hotel) {
      console.log(
        `❌ Hotel not found for query: ${JSON.stringify(whereCondition)}`,
      );
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }
    // 4. Trả về kết quả
    return NextResponse.json(hotel);
  } catch (error) {
    console.error(" API Internal Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
