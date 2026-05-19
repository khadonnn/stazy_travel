// src/utils/tracker.ts
//
// ============================================================
// INTERACTION TRACKER - Unified interaction tracking module
// ============================================================
//
// Canonical interaction types (aligned with recommend.py):
//   VIEW            → weight 0.5  (passive browsing)
//   CLICK_BOOK_NOW  → weight 2.0  (high intent)
//   ADD_TO_WISHLIST → weight 3.0  (high intent, preference signal)
//   BOOK            → weight 5.0  (highest intent)
//   RATE_POSITIVE   → weight 4.5  (satisfaction signal, rating ≥ 3)
//   RATE_NEGATIVE   → weight -3.0 (satisfaction signal, rating < 3)
//
// Semantic rules:
//   LIKE (client)  → ADD_TO_WISHLIST (preference signal, NOT satisfaction)
//   RATING ≥ 3     → RATE_POSITIVE (satisfaction signal)
//   RATING < 3     → RATE_NEGATIVE (satisfaction signal)
//
// High-intent types that trigger recommendation refresh:
//   ADD_TO_WISHLIST, BOOK, RATE_POSITIVE, RATE_NEGATIVE, CLICK_BOOK_NOW
// ============================================================

// All valid interaction types that can be sent to the server
export type InteractionType =
  | "VIEW"
  | "LIKE"
  | "BOOK"
  | "CLICK_BOOK_NOW"
  | "ADD_TO_WISHLIST"
  | "RATING"
  | "RATE_POSITIVE"
  | "RATE_NEGATIVE";

// High-intent types that trigger immediate recommendation refresh
const IMMEDIATE_REFRESH_TYPES = new Set([
  "ADD_TO_WISHLIST",
  "BOOK",
  "RATE_POSITIVE",
  "RATE_NEGATIVE",
]);

// Debounced refresh types (CLICK_BOOK_NOW needs 2s debounce to avoid spam)
const DEBOUNCED_REFRESH_TYPES = new Set(["CLICK_BOOK_NOW"]);
const DEBOUNCE_MS = 2000;

// Module-level debounce timer for CLICK_BOOK_NOW
let _clickDebounceTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Map client-side interaction types to canonical recommend.py types.
 *
 * Semantic rules:
 * - LIKE → ADD_TO_WISHLIST (preference/wishlist signal)
 * - RATING with score ≥ 3 → RATE_POSITIVE (satisfaction)
 * - RATING with score < 3 → RATE_NEGATIVE (dissatisfaction)
 * - All other types pass through unchanged
 */
function mapToCanonicalType(type: InteractionType, rating?: number): string {
  if (type === "LIKE") {
    return "ADD_TO_WISHLIST";
  }
  if (type === "RATING" && rating !== undefined) {
    return rating >= 3 ? "RATE_POSITIVE" : "RATE_NEGATIVE";
  }
  return type;
}

/**
 * Track a user interaction with a hotel.
 *
 * 1. Skips tracking for non-logged-in users (client-side cookie check)
 * 2. Maps client types to canonical types for recommend.py
 * 3. Dispatches "interaction:tracked" event ONLY for high-intent types
 *    (so recommendation section can auto-refresh without noise from VIEW)
 */
export const trackInteraction = async (
  hotelId: number,
  type: InteractionType,
  metadata = {},
  rating?: number,
) => {
  // Don't track interactions for non-logged-in users
  if (typeof window !== "undefined") {
    const hasClerkSession = document.cookie.includes("__session=");
    if (!hasClerkSession) {
      return;
    }
  }

  // Map to canonical type for recommend.py signal weights
  const canonicalType = mapToCanonicalType(type, rating);

  try {
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId,
        type: canonicalType,
        metadata,
        rating,
      }),
    });

    if (res.ok && typeof window !== "undefined") {
      const eventPayload = {
        hotelId,
        type: canonicalType,
        timestamp: Date.now(),
      };

      if (IMMEDIATE_REFRESH_TYPES.has(canonicalType)) {
        // Immediate refresh for explicit preference signals
        window.dispatchEvent(
          new CustomEvent("interaction:tracked", { detail: eventPayload }),
        );
      } else if (DEBOUNCED_REFRESH_TYPES.has(canonicalType)) {
        // Debounced refresh for CLICK_BOOK_NOW (user might just be exploring)
        clearTimeout(_clickDebounceTimer);
        _clickDebounceTimer = setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("interaction:tracked", { detail: eventPayload }),
          );
        }, DEBOUNCE_MS);
      }
      // VIEW: no event dispatched (silent tracking only)
    }
  } catch (err) {
    console.error("Tracking failed", err);
  }
};
