"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavoritesSafe } from "@/contexts/FavoritesContext";

export interface BtnLikeIconProps {
  className?: string;
  colorClass?: string;
  isLiked?: boolean;
  hotelId?: number;
}

function BtnLikeIcon({
  className = "",
  colorClass = "text-white bg-black bg-opacity-30 hover:bg-opacity-50",
  isLiked = false,
  hotelId,
}: BtnLikeIconProps) {
  const { isFavorited, toggleFavorite } = useFavoritesSafe();
  const [isProcessing, setIsProcessing] = useState(false);

  // Nếu có hotelId, dùng state từ context;否则 dùng prop isLiked
  const isLikedState = hotelId !== undefined ? isFavorited(hotelId) : isLiked;
  const [localLiked, setLocalLiked] = useState(isLiked);

  const likedState = hotelId !== undefined ? isLikedState : localLiked;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing) return;

    if (hotelId !== undefined) {
      setIsProcessing(true);
      try {
        await toggleFavorite(hotelId);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setLocalLiked(!localLiked);
    }
  };

  return (
    <div
      className={`cus-BtnLikeIcon w-8 h-8 flex items-center justify-center rounded-full cursor-pointer ${
        likedState ? "cus-BtnLikeIcon--liked" : ""
      } ${colorClass} ${className}`}
      data-nc-id="BtnLikeIcon"
      title={likedState ? "Bỏ yêu thích" : "Yêu thích"}
      onClick={handleClick}
    >
      <Heart
        className={`h-5 w-5 transition-all duration-200 ${
          likedState ? "text-red-500 fill-red-500" : "text-current"
        } ${isProcessing ? "opacity-50" : ""}`}
        strokeWidth={1.5}
      />
    </div>
  );
}

export default BtnLikeIcon;
