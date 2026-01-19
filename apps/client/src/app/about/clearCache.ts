/**
 * Utility to clear localStorage cache for About data
 * Run this in browser console: localStorage.removeItem('hotel-stazy-about-data'); location.reload();
 */

export const clearAboutCache = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("hotel-stazy-about-data");
    console.log("✅ About data cache cleared. Page will reload...");
    window.location.reload();
  }
};

// Auto-clear cache in development if needed
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  // Uncomment this line to auto-clear cache on page load (useful during development)
  // clearAboutCache();
}
