// File: src/lib/utils/analytics.ts
export const trackInteraction = async (
  type:
    | "VIEW"
    | "LIKE"
    | "BOOK"
    | "CLICK_BOOK_NOW"
    | "SEARCH"
    | "SHARE"
    | "CANCEL",
  hotelId?: number | string,
  metadata: any = {},
  rating?: number
) => {
  try {
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId, type, metadata, rating }),
      keepalive: true, // Quan trọng: Giúp request gửi đi kể cả khi tắt tab
    });
  } catch (error) {
    console.error("Tracking error:", error);
  }
};
