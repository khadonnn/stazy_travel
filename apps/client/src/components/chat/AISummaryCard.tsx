"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircleCheckBig, CircleX, Sparkles } from "lucide-react";

export interface AISummaryData {
  type: "summary";
  title: string;
  vibe: string;
  pros: string[];
  cons: string[];
  tags: string[];
}

interface AISummaryCardProps {
  data: AISummaryData;
}

export default function AISummaryCard({ data }: AISummaryCardProps) {
  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-white shadow-sm max-w-full">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-800">
          <Sparkles className="w-4 h-4 text-green-600" />
          {data.title || "Tóm tắt từ AI"}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Vibe Summary */}
        <p className="text-xs text-gray-600 leading-relaxed italic">
          &ldquo;{data.vibe}&rdquo;
        </p>

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-[10px] bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Pros & Cons Split */}
        <div className="grid grid-cols-2 gap-3">
          {/* Pros */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold text-green-700 uppercase tracking-wide">
              Điểm cộng
            </h4>
            <ul className="space-y-1">
              {data.pros.map((pro, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 text-xs text-gray-700"
                >
                  <CircleCheckBig className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">
              Lưu ý
            </h4>
            <ul className="space-y-1">
              {data.cons.map((con, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 text-xs text-gray-700"
                >
                  <CircleX className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mock data for testing
export const MOCK_SUMMARY_DATA: AISummaryData = {
  type: "summary",
  title: "Tóm tắt đánh giá AI",
  vibe: "Không gian yên tĩnh, lãng mạn với tầm nhìn ra biển tuyệt đẹp. Phù hợp cho kỳ nghỉ dưỡng muốn tránh xa sự ồn ào.",
  pros: [
    "View biển trực diện từ ban công",
    "Nhân viên thân thiện, hỗ trợ nhanh",
    "Bữa sáng buffet đa dạng",
    "Hồ bơi vô cực đẹp",
  ],
  cons: [
    "Cách bãi biển 5 phút đi bộ",
    "Wi-Fi không ổn định ở tầng cao",
    "Không có thang máy cho block B",
  ],
  tags: ["Romantic", "Quiet", "Sea View", "Couple-friendly"],
};
