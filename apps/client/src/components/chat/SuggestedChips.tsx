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
  onChipClick: (prompt: string) => void;
  className?: string;
}

export function getChips(destination?: string): ChipItem[] {
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
      prompt: `So sánh khách sạn này với các khách sạn tương tự tại ${destination || "khu vực này"}`,
    },
  ];
}

export default function SuggestedChips({
  destination,
  onChipClick,
  className,
}: SuggestedChipsProps) {
  const chips = getChips(destination);

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
