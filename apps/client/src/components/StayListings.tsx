"use client";

import { useState } from "react";
import StayCard from "@/components/StayCard";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PaginationCus from "@/components/PaginationCus";
import axios from "axios";
import type { StayApiResponse } from "@/lib/mappers/listings";
import { mapStay } from "@/lib/mappers/listings";
import homeStayDataJson from "@/data/jsons/__homeStay.json";
import { useQuery } from "@tanstack/react-query";
import { HotelFrontend } from "@repo/types";

// IMPORT MOTION
import { motion, AnimatePresence } from "motion/react";
import FadeIn from "./ui/fade-in";

const ITEMS_PER_PAGE = 4;

const getRandomColor = () => {
  const colors = [
    "#FFD700",
    "#FF6347",
    "#40E0D0",
    "#EE82EE",
    "#98FB98",
    "#FFB6C1",
    "#87CEEB",
  ];
  return colors[Math.floor(Math.random() * colors.length)] || "#FFD700";
};

const fetchStays = async (): Promise<HotelFrontend[]> => {
  // ... (Logic cũ giữ nguyên để code gọn)
  const FORCE_FALLBACK = false;
  const mapStaticStays = () =>
    homeStayDataJson.slice(0, 8).map(
      (hotel) =>
        ({
          // ... (mapping cũ) ...
          id: hotel.id,
          title: hotel.title,
          price: hotel.price ?? 500000,
          // ... fake data mapping ...
        }) as unknown as HotelFrontend,
    );

  if (FORCE_FALLBACK) return mapStaticStays();

  try {
    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/hotels`,
      { withCredentials: true },
    );
    return res.data.data.map((post: StayApiResponse) => mapStay(post));
  } catch (error) {
    return mapStaticStays();
  }
};

export default function StayListing() {
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [hoverColor, setHoverColor] = useState<string>("");

  const {
    data: stays = [],
    isLoading,
    isError,
  } = useQuery<HotelFrontend[], Error>({
    queryKey: ["stayListings"],
    queryFn: fetchStays,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading)
    return <p className="text-center py-10">Đang tải dữ liệu...</p>;
  if (isError) console.error("Lỗi data");

  const totalPages = Math.ceil(stays.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = stays.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-12 sm:space-y-8 mx-auto w-full">
      <div className="mb-8 flex items-end justify-between gap-4">
        {/* Phần nội dung bên trái */}
        <div>
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px w-8 bg-zinc-400/40" />
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              Thịnh hành
              <Flame className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
            </span>
          </div>

          {/* Tiêu đề chính */}
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
            Nổi bật nhất
          </h2>

          {/* Đoạn mô tả (Có thể bỏ nếu không cần thiết) */}
          <p className="mt-3 text-sm text-zinc-400 max-w-xl leading-relaxed">
            Những địa điểm lưu trú đang thu hút nhiều sự quan tâm
          </p>
        </div>

        {/* Nút Xem tất cả bên phải */}
        <div className="shrink-0 mb-1">
          <Link href="/hotels">
            <Button
              variant="link"
              className="text-zinc-500 hover:text-zinc-900 px-0 flex items-center gap-1"
            >
              Xem tất cả
              {/* Nếu bạn có import ArrowRight từ lucide-react thì thêm dòng dưới vào sẽ rất đẹp */}
              {/* <ArrowRight className="w-4 h-4" /> */}
            </Button>
          </Link>
        </div>
      </div>

      {currentItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Không có dữ liệu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-center">
          {currentItems.map((stay, index) => (
            <FadeIn key={stay.id} delay={index * 100} className="h-full w-full">
              <div
                className="relative group block h-full w-full"
                onMouseEnter={() => {
                  // 2. SỬA LỖI TRIGGER 2 LẦN: Chỉ random màu mới nếu ID khác với thẻ đang hover
                  if (hoveredId !== stay.id) {
                    setHoveredId(stay.id);
                    setHoverColor(getRandomColor());
                  }
                }}
                onMouseLeave={() => setHoveredId(null)}
              >
                <AnimatePresence>
                  {hoveredId === stay.id && (
                    <motion.span
                      // 3. QUAN TRỌNG: Thêm 'pointer-events-none' để cái bóng "tàng hình" với con trỏ chuột,
                      // chuột không chạm vào nó được nên sẽ không bị chớp giật sự kiện nữa.
                      className="absolute inset-0 block h-full w-full rounded-3xl -z-10 bg-opacity-20 pointer-events-none"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{
                        scale: 1.05,
                        opacity: 0.1,
                        backgroundColor: hoverColor,
                      }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{
                        duration: 0.1,
                        ease: "easeOut",
                      }}
                    />
                  )}
                </AnimatePresence>

                <StayCard data={stay} />
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <PaginationCus
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
