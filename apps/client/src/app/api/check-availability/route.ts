import { NextRequest, NextResponse } from "next/server";

const BOOKING_SERVICE_URL =
  process.env.BOOKING_SERVICE_URL ||
  process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL ||
  "http://localhost:8001";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hotelId = searchParams.get("hotelId");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  if (!hotelId || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "Missing required query params" },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = new URL("/check-availability", BOOKING_SERVICE_URL);
    upstreamUrl.searchParams.set("hotelId", hotelId);
    upstreamUrl.searchParams.set("checkIn", checkIn);
    upstreamUrl.searchParams.set("checkOut", checkOut);

    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const body = await upstreamRes.json().catch(() => ({
      available: false,
      message: "Booking service returned non-JSON response",
    }));

    return NextResponse.json(body, { status: upstreamRes.status });
  } catch (error) {
    console.error("Check availability proxy error:", error);
    return NextResponse.json(
      {
        available: false,
        message: "Cannot connect to booking service",
      },
      { status: 502 },
    );
  }
}
