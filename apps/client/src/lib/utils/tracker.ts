// src/utils/tracker.ts
export const trackInteraction = async (
  hotelId: number,
  type: "VIEW" | "LIKE" | "BOOK" | "CLICK_BOOK_NOW",
  metadata = {},
  rating?: number
) => {
  try {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId, type, metadata, rating }),
    });
  } catch (err) {
    // Silent fail: Tracking lỗi không nên làm crash app của user
    console.error("Tracking failed", err);
  }
};
