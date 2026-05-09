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
      prompt: "Điểm nổi bật của khách sạn này?",
    },
    {
      id: "nearby",
      label: "Quanh đây",
      icon: MapPin,
      prompt: "Có gì thú vị quanh đây?",
    },
    {
      id: "itinerary",
      label: "Lịch trình",
      icon: CalendarDays,
      prompt: "Gợi ý lịch trình gần đây",
    },
    {
      id: "suitable",
      label: "Đối tượng",
      icon: Users,
      prompt: "Phù hợp cho couple hay family?",
    },
    {
      id: "worth",
      label: "Đáng tiền?",
      icon: CircleDollarSign,
      prompt: "Có đáng tiền không?",
    },
    {
      id: "vibe",
      label: "Vibe",
      icon: Sun,
      prompt: "Vibe ở đây thế nào?",
    },
    {
      id: "compare",
      label: "So sánh",
      icon: Scale,
      prompt: `So sánh khách sạn tương tự tại ${destination || "khu vực này"}`,
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
