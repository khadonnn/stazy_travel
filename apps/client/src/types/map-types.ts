import { StayDataType, StayCategory, TwMainColor } from "./stay";

/**
 * Place is now an alias for StayDataType.
 * All map-related components should use StayDataType fields:
 *   - lat/lng  → place.map?.lat / place.map?.lng
 *   - image    → place.featuredImage
 *   - category → place.category (StayCategory object or string)
 *   - title    → hotel name
 *   - name     → room name
 */
export type Place = StayDataType;

/** Display label: prefer title (hotel name), then room name */
export const getPlaceLabel = (place: Place): string =>
  place.title || place.name || place.roomName || "Untitled";

export const getPlaceLatLng = (
  place: Place,
): { lat: number; lng: number } | null => {
  if (
    place.map &&
    typeof place.map.lat === "number" &&
    typeof place.map.lng === "number" &&
    !isNaN(place.map.lat) &&
    !isNaN(place.map.lng)
  ) {
    return { lat: place.map.lat, lng: place.map.lng };
  }
  return null;
};

/**
 * Get category name as string.
 * Handles StayCategory object { id, name } or raw string from API.
 */
export const getCategoryName = (category?: StayCategory | string): string => {
  if (!category) return "Khác";
  if (typeof category === "string") return category;
  return category.name || "Khác";
};

/**
 * Get category id.
 * Returns numeric id from StayCategory object, or tries to infer from name.
 */
export const getCategoryId = (category?: StayCategory | string): number => {
  if (!category) return 7;
  if (typeof category === "object" && category.id) return category.id;
  const name = typeof category === "string" ? category : category.name || "";
  const nameMap: Record<string, number> = {
    "khách sạn": 1,
    hotel: 1,
    homestay: 2,
    resort: 3,
    "biệt thự": 4,
    villa: 4,
    "căn hộ": 5,
    apartment: 5,
    "nhà gỗ": 6,
    cabin: 6,
    khác: 7,
  };
  return nameMap[name.toLowerCase()] ?? 7;
};

/**
 * Badge color class matching CategoryBadge.tsx idToColorMap:
 *   1 Khách sạn → pink
 *   2 Homestay  → green
 *   3 Resort    → yellow
 *   4 Biệt thự → red
 *   5 Căn hộ   → indigo
 *   6 Nhà gỗ   → blue
 *   7 Khác     → purple
 */
const colorClassMap: Record<TwMainColor, string> = {
  pink: "bg-pink-50 text-pink-800 border-pink-200",
  green: "bg-green-50 text-green-800 border-green-200",
  yellow: "bg-yellow-50 text-yellow-800 border-yellow-200",
  red: "bg-red-50 text-red-800 border-red-200",
  indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
  blue: "bg-blue-50 text-blue-800 border-blue-200",
  purple: "bg-purple-50 text-purple-800 border-purple-200",
  gray: "bg-gray-50 text-gray-800 border-gray-200",
};

const idToColorMap: Record<number, TwMainColor> = {
  1: "pink",
  2: "green",
  3: "yellow",
  4: "red",
  5: "indigo",
  6: "blue",
  7: "purple",
};

/** Get Tailwind badge color classes for a category */
export const getCategoryBadgeClasses = (
  category?: StayCategory | string,
): string => {
  const id = getCategoryId(category);
  const colorKey = idToColorMap[id] ?? "gray";
  return colorClassMap[colorKey];
};

/** Category icon map (matching __category.json) */
const categoryIconMap: Record<number, string> = {
  1: "🏨",
  2: "🏡",
  3: "🏖️",
  4: "🏰",
  5: "🏢",
  6: "🏕️",
  7: "🌍",
};

/** Get emoji icon for a category */
export const getCategoryIcon = (category?: StayCategory | string): string => {
  if (category && typeof category === "object" && category.icon)
    return category.icon;
  const id = getCategoryId(category);
  return categoryIconMap[id] ?? "🌍";
};

/**
 * Legacy: hex color for map markers.
 * Maps category id to a hex color.
 */
export const getCategoryColor = (category?: StayCategory | string): string => {
  const id = getCategoryId(category);
  const hexMap: Record<number, string> = {
    1: "#ec4899", // pink
    2: "#22c55e", // green
    3: "#eab308", // yellow
    4: "#ef4444", // red
    5: "#6366f1", // indigo
    6: "#3b82f6", // blue
    7: "#a855f7", // purple
  };
  return hexMap[id] ?? "#6b7280";
};
