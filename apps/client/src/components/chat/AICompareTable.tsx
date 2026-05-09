"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Scale, Trophy } from "lucide-react";

export interface CompareDimension {
  criteria: string;
  hotelA: string;
  hotelB: string;
  winner: "A" | "B" | "tie";
}

export interface AICompareData {
  type: "compare";
  title: string;
  hotelA: { name: string; price?: string };
  hotelB: { name: string; price?: string };
  dimensions: CompareDimension[];
  conclusion: string;
}

interface AICompareTableProps {
  data: AICompareData;
}

export default function AICompareTable({ data }: AICompareTableProps) {
  return (
    <div className="space-y-3 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Scale className="w-4 h-4 text-blue-600" />
        {data.title || "So sánh khách sạn"}
      </div>

      {/* Comparison Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-[11px] font-bold text-gray-500 uppercase w-[90px] py-2 px-3">
                Tiêu chí
              </TableHead>
              <TableHead className="text-[11px] font-bold text-blue-700 uppercase py-2 px-3">
                <div className="flex items-center gap-1">
                  {data.hotelA.name}
                </div>
              </TableHead>
              <TableHead className="text-[11px] font-bold text-purple-700 uppercase py-2 px-3">
                <div className="flex items-center gap-1">
                  {data.hotelB.name}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.dimensions.map((dim, idx) => (
              <TableRow key={idx} className="border-t border-gray-100">
                <TableCell className="text-[11px] font-semibold text-gray-600 py-2 px-3 bg-gray-50/50">
                  {dim.criteria}
                </TableCell>
                <TableCell
                  className={`text-xs py-2 px-3 ${
                    dim.winner === "A"
                      ? "bg-blue-50 font-semibold text-blue-800"
                      : "text-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {dim.winner === "A" && (
                      <Trophy className="w-3 h-3 text-blue-500" />
                    )}
                    {dim.hotelA}
                  </div>
                </TableCell>
                <TableCell
                  className={`text-xs py-2 px-3 ${
                    dim.winner === "B"
                      ? "bg-purple-50 font-semibold text-purple-800"
                      : "text-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {dim.winner === "B" && (
                      <Trophy className="w-3 h-3 text-purple-500" />
                    )}
                    {dim.hotelB}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Conclusion */}
      <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
        <span className="font-semibold text-blue-700">Kết luận: </span>
        {data.conclusion}
      </p>
    </div>
  );
}

// Mock data for testing
export const MOCK_COMPARE_DATA: AICompareData = {
  type: "compare",
  title: "So sánh khách sạn tương tự",
  hotelA: { name: "Sunrise Villa", price: "1.200.000đ" },
  hotelB: { name: "Ocean Breeze Resort", price: "1.500.000đ" },
  dimensions: [
    {
      criteria: "Vibe",
      hotelA: "Yên tĩnh, lãng mạn",
      hotelB: "Sôi động, năng động",
      winner: "A",
    },
    {
      criteria: "Giá",
      hotelA: "1.200.000đ/đêm",
      hotelB: "1.500.000đ/đêm",
      winner: "A",
    },
    {
      criteria: "Vị trí",
      hotelA: "Trung tâm, đi bộ 5 phút ra biển",
      hotelB: "Bãi biển riêng, xa trung tâm",
      winner: "B",
    },
    {
      criteria: "Tiện nghi",
      hotelA: "Hồ bơi, gym, spa",
      hotelB: "Hồ bơi vô cực, nhà hàng, bar rooftop",
      winner: "B",
    },
    {
      criteria: "Phù hợp",
      hotelA: "Couple, gia đình nhỏ",
      hotelB: "Nhóm bạn, gia đình đông người",
      winner: "tie",
    },
  ],
  conclusion:
    "Nếu bạn muốn không gian yên tĩnh và tiết kiệm, Sunrise Villa là lựa chọn tốt. Nếu bạn thích trải nghiệm cao cấp với bãi biển riêng, Ocean Breeze Resort đáng để thử.",
};
