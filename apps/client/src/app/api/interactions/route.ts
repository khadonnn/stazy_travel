// app/api/interactions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@repo/product-db";
import { auth } from "@clerk/nextjs/server";

// Valid Prisma InteractionType enum values
const VALID_TYPES = new Set([
  "VIEW",
  "ADD_TO_WISHLIST",
  "BOOK",
  "CLICK_BOOK_NOW",
  "CANCEL",
  "SEARCH_QUERY",
  "FILTER_APPLIED",
  "RATE_POSITIVE",
  "RATE_NEGATIVE",
]);

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.warn("[interactions] Unauthorized: no userId from auth()");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { hotelId, type, metadata, rating } = body;

    // ===== DEBUG: Log raw request body =====
    console.log("[interactions] 🔍 RAW BODY:", JSON.stringify(body));
    console.log("[interactions] 🔍 hotelId:", hotelId, "type:", typeof hotelId);
    console.log("[interactions] 🔍 type:", type, "type:", typeof type);
    console.log("[interactions] 🔍 userId:", userId);

    // Normalize hotelId to number (frontend may send string)
    const hotelIdNum =
      typeof hotelId === "string" ? parseInt(hotelId, 10) : hotelId;
    if (!hotelIdNum || isNaN(hotelIdNum)) {
      console.warn(
        `[interactions] ❌ Invalid hotelId: ${hotelId} (type: ${typeof hotelId})`,
      );
      return NextResponse.json(
        { error: "Invalid hotelId", received: hotelId },
        { status: 400 },
      );
    }

    // Validate type against Prisma enum - fallback to VIEW if invalid
    const canonicalType = VALID_TYPES.has(type) ? type : "VIEW";
    if (!VALID_TYPES.has(type)) {
      console.warn(
        `[interactions] ⚠️ Invalid type "${type}", falling back to VIEW. Valid: ${[...VALID_TYPES].join(", ")}`,
      );
    }

    console.log(
      `[interactions] ✅ Tracking: userId=${userId} hotelId=${hotelIdNum} type=${canonicalType} rating=${rating ?? "null"}`,
    );

    const interaction = await prisma.interaction.create({
      data: {
        userId: userId,
        hotelId: hotelIdNum,
        type: canonicalType as any,
        rating: rating || null,
        metadata: metadata || {},
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: interaction });
  } catch (error: any) {
    console.error("[interactions] ❌ Tracking Error:", error?.message || error);
    console.error("[interactions] Stack:", error?.stack);
    return NextResponse.json(
      { error: "Failed to track", detail: error?.message },
      { status: 500 },
    );
  }
}
