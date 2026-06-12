"use client";

import { Button } from "@/components/ui/button";
import {
  Sparkles,
  MapPin,
  CalendarDays,
  Users,
  CircleDollarSign,
  Sun,
  Scale,
  type LucideIcon,
} from "lucide-react";

export interface ChipItem {
  id: string;
  label: string;
  icon: LucideIcon;
  prompt: string;
}

interface SuggestedChipsProps {
  destination?: string;
  address?: string;
  onChipClick: (prompt: string) => void;
  className?: string;
}

/**
 * Extract a meaningful location name from an address string
 * For addresses like "321 Đường Vũng Tàu, Việt Nam" -> "Vũng Tàu"
 * For "15 Lý Tự Trọng, Đà Lạt, Lâm Đồng" -> "Đà Lạt"
 */
function extractLocationFromAddress(address?: string): string | undefined {
  if (!address) return undefined;
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  // If there are 2+ parts, the second-to-last is typically the city/district
  if (parts.length >= 2) {
    // Skip country-level parts like "Việt Nam"
    const cityCandidates = parts.slice(0, -1);
    for (let i = cityCandidates.length - 1; i >= 0; i--) {
      const candidate = cityCandidates[i];
      if (
        candidate &&
        !["Việt Nam", "Vietnam", "Viet Nam"].includes(candidate)
      ) {
        return candidate;
      }
    }
  }
  // Fallback: return the last meaningful part
  const last = parts[parts.length - 1];
  if (last && !["Việt Nam", "Vietnam", "Viet Nam"].includes(last)) {
    return last;
  }
  return undefined;
}

export function getChips(destination?: string, address?: string): ChipItem[] {
  // Resolve the actual destination: use provided destination, or extract from address, or fallback
  const actualDest =
    destination || extractLocationFromAddress(address) || "khu vực này";

  return [
    {
      id: "highlights",
      label: "Nổi bật",
      icon: Sparkles,
      prompt: "Đánh giá và điểm nổi bật của khách sạn này?",
    },
    {
      id: "nearby",
      label: "Quanh đây",
      icon: MapPin,
      prompt: "Có địa điểm nào đáng tham quan gần khách sạn này?",
    },
    {
      id: "itinerary",
      label: "Lịch trình",
      icon: CalendarDays,
      prompt: "Gợi ý lịch trình du lịch kèm chi phí dự kiến",
    },
    {
      id: "suitable",
      label: "Đối tượng",
      icon: Users,
      prompt: "Khách sạn này phù hợp cho couple hay family?",
    },
    {
      id: "worth",
      label: "Đáng tiền?",
      icon: CircleDollarSign,
      prompt: "Khách sạn này có đáng tiền không?",
    },
    {
      id: "vibe",
      label: "Vibe",
      icon: Sun,
      prompt: "Vibe và không gian ở đây thế nào?",
    },
    {
      id: "compare",
      label: "So sánh",
      icon: Scale,
      prompt: `So sánh khách sạn này với các khách sạn tương tự tại ${actualDest}`,
    },
  ];
}

export default function SuggestedChips({
  destination,
  address,
  onChipClick,
  className,
}: SuggestedChipsProps) {
  const chips = getChips(destination, address);

  return (
    <div
      className={`flex flex-wrap gap-1 pb-1${className ?? ""}`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <Button
            key={chip.id}
            variant="secondary"
            size="sm"
            className="cursor-pointer rounded-full text-xs gap-1 h-7 px-1 border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
            onClick={() => onChipClick(chip.prompt)}
          >
            <Icon className="w-3 h-3" />
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}
