import type { StayCategory, TwMainColor } from "@/types/stay";
import { Badge } from "@/components/ui/badge";

const idToColorMap: Record<number, TwMainColor> = {
  1: "pink",
  2: "green",
  3: "yellow",
  4: "red",
  5: "indigo",
  6: "blue",
  7: "purple",
};
const colorClassMap: Record<TwMainColor, string> = {
  pink: "bg-pink-50 text-pink-800",
  green: "bg-green-50 text-green-800",
  yellow: "bg-yellow-50 text-yellow-800",
  red: "bg-red-50 text-red-800",
  indigo: "bg-indigo-50 text-indigo-800",
  blue: "bg-blue-50 text-blue-800",
  purple: "bg-purple-50 text-purple-800",
  gray: "bg-gray-50 text-gray-800",
};
const getCategoryColor = (id?: number): TwMainColor => {
  if (!id) return "gray";
  return idToColorMap[id] ?? "gray";
};

export default function CategoryBadge({
  category,
}: {
  category?: StayCategory;
}) {
  const colorKey = getCategoryColor(category?.id);
  const classes = colorClassMap[colorKey];

  return (
    <Badge className={`${classes} border-none py-2 text-sm`}>
      {category?.icon} {category?.name || "Chưa xác định"}
    </Badge>
  );
}
