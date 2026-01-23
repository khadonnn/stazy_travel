"use server";

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:8000";

export async function getHotelDetail(slug: string) {
  try {
    const response = await fetch(`${PRODUCT_SERVICE_URL}/hotels/${slug}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch hotel ${slug}:`, response.status);
      return { error: `Hotel not found: ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    console.error("Error fetching hotel detail:", error);
    return { error: error.message };
  }
}
