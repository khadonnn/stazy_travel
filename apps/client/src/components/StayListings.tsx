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
        }) as unknown as HotelFrontend
    );

  if (FORCE_FALLBACK) return mapStaticStays();

  try {
    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/hotels`,
      { withCredentials: true }
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
      <div className="flex items-center justify-between space-x-3">
        <div className="flex items-center space-x-3">
          <h2 className="text-3xl font-semibold">Nổi bật</h2>
          <Flame className="inline-block text-red-500 h-8 w-8" />
        </div>
        <Link href="/hotels">
          <Button variant="link">Xem tất cả</Button>
        </Link>
      </div>

      {currentItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Không có dữ liệu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-center">
          {currentItems.map((stay) => (
            <div
              key={stay.id}
              className="relative group block h-full w-full"
              onMouseEnter={() => {
                setHoveredId(stay.id);
                setHoverColor(getRandomColor());
              }}
              onMouseLeave={() => setHoveredId(null)}
            >
              <AnimatePresence>
                {hoveredId === stay.id && (
                  <motion.span
                    className="absolute inset-0 block h-full w-full rounded-3xl -z-10 bg-opacity-20"
                    // 1. Initial: Bắt đầu hơi nhỏ một chút (0.95) để cảm giác bung ra
                    initial={{ scale: 0.95, opacity: 0 }}
                    // 2. Animate: Scale lên vừa phải, đệm opacity
                    animate={{
                      scale: 1.05,
                      opacity: 0.1,
                      backgroundColor: hoverColor,
                    }}
                    // 3. Exit: Thu về lại
                    exit={{ scale: 0.9, opacity: 0 }}
                    // 4. Transition: Dùng easeOut để mượt, không dùng spring (lò xo)
                    transition={{
                      duration: 0.1, // Tốc độ nhanh (0.2s)
                      ease: "easeOut", // Hiệu ứng ra mượt
                    }}

                    // 5. BỎ layoutId để không bị hiệu ứng "bay" từ ô này sang ô kia
                    // layoutId="hoverBackground"
                  />
                )}
              </AnimatePresence>

              <StayCard data={stay} />
            </div>
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
