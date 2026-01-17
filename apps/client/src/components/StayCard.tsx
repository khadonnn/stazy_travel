"use client";

import { useState } from "react";
import GallerySlider from "./GallerySlider";
import Link from "next/link";
import StartRating from "@/components/StarRating";
import BtnLikeIcon from "@/components/BtnLikeIcon";
import SaleOffBadge from "@/components/SaleOffBadge";
import Badge from "@/components/ui/BadgeCus";
import { formatPrice } from "@/lib/utils/formatPrice";
import rawCategories from "@/data/jsons/__category.json";
import { HotelFrontend } from "@repo/types";

// 1. IMPORT MOTION
import { motion, AnimatePresence } from "motion/react";

// 2. LOGIC ÉP KIỂU CATEGORY (Fix lỗi TypeScript cũ)
interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  icon?: string;
}
const categories = rawCategories as unknown as Category[];

// 3. HÀM RANDOM MÀU
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

export interface StayCardProps {
  className?: string;
  data?: HotelFrontend | Partial<HotelFrontend>;
  size?: "default" | "small";
}

function StayCard({ size = "default", className = "", data }: StayCardProps) {
  // 4. STATE QUẢN LÝ HOVER VÀ MÀU
  const [isHovered, setIsHovered] = useState(false);
  const [hoverColor, setHoverColor] = useState("");

  const {
    featuredImage,
    galleryImgs,
    categoryId,
    address,
    title,
    bedrooms,
    slug,
    like,
    saleOff,
    saleOffPercent,
    isAds,
    price,
    reviewStar,
    reviewCount,
    id,
  } = data || {};

  if (!data) {
    return null;
  }

  const category = categories.find((cat) => cat.id === categoryId);
  const categoryName = category?.name || "Khác";

  const renderSliderGallery = () => (
    <div className="relative w-full">
      <GallerySlider
        uniqueID={`StayCard_${id}`}
        ratioClass="aspect-[4/3]"
        featuredImage={featuredImage || ""}
        galleryImgs={galleryImgs || []}
        href={`/hotels/${slug}`}
        galleryClass={size === "default" ? undefined : ""}
        id={id}
      />
      <BtnLikeIcon isLiked={like} className="absolute right-3 top-3 z-[1]" />
      {saleOffPercent && Number(saleOffPercent) > 0 ? (
        <SaleOffBadge
          className="absolute left-3 top-3"
          desc={`-${saleOffPercent}% hôm nay`}
        />
      ) : saleOff ? (
        <SaleOffBadge className="absolute left-3 top-3" desc={saleOff} />
      ) : null}
    </div>
  );

  const renderContent = () => (
    <div className={size === "default" ? "p-4 space-y-4" : "p-3 space-y-1"}>
      <div className={size === "default" ? "space-y-2" : "space-y-1"}>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {categoryName} · {bedrooms} beds
        </span>
        <div className="flex items-center space-x-2">
          {isAds && <Badge name="ADS" color="green" />}
          <h2
            className={`font-semibold capitalize text-neutral-900 dark:text-white ${
              size === "default" ? "text-base" : "text-base"
            }`}
          >
            <span className="line-clamp-1">{title}</span>
          </h2>
        </div>
        <div className="flex items-center text-neutral-500 dark:text-neutral-400 text-sm space-x-1.5">
          {size === "default" && (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
          <span>{address}</span>
        </div>
      </div>
      <div className="w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
      <div className="flex justify-between items-center">
        <span className="text-base font-semibold">
          {formatPrice(price, { showCurrency: false })}{" "}
          {size === "default" && (
            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-normal">
              /đêm
            </span>
          )}
        </span>
        {!!reviewStar && (
          <StartRating reviewCount={reviewCount} point={reviewStar} />
        )}
      </div>
    </div>
  );

  return (
    // 5. OUTER WRAPPER: Xử lý hover + Motion
    <div
      className={`tw-StayCard group relative isolate ${className}`}
      // 'isolate' để tạo context stacking mới, giúp z-index hoạt động đúng
      onMouseEnter={() => {
        setIsHovered(true);
        setHoverColor(getRandomColor());
      }}
      onMouseLeave={() => setIsHovered(false)}
      data-nc-id="StayCard"
    >
      {/* 6. LỚP BACKGROUND MOTION */}
      <AnimatePresence>
        {isHovered && (
          <motion.span
            className="absolute inset-0 -z-10 rounded-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{
              scale: 1.05, // Bung ra lớn hơn card một chút
              opacity: 0.15, // Màu nhạt
              backgroundColor: hoverColor,
            }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* 7. INNER WRAPPER: Chứa giao diện Card gốc */}
      {/* Đưa bg-white, border, overflow-hidden vào đây để không bị background đè mất */}
      <div
        className={`bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow ${
          size === "default"
            ? "border border-neutral-300 dark:border-neutral-800"
            : ""
        }`}
      >
        {renderSliderGallery()}
        <Link href={`/hotels/${slug}`}>{renderContent()}</Link>
      </div>
    </div>
  );
}

export default StayCard;
