"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavoritesSafe } from "@/contexts/FavoritesContext";

interface LikeSaveBtnsProps {
  hotelId?: number;
}

const LikeSaveBtns = ({ hotelId }: LikeSaveBtnsProps) => {
  const { isFavorited, toggleFavorite } = useFavoritesSafe();
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine liked state: use context if hotelId provided, else false
  const isLiked = hotelId !== undefined ? isFavorited(hotelId) : false;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hotelId || isProcessing) return;

    setIsProcessing(true);
    try {
      await toggleFavorite(hotelId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        // Clipboard not available
      }
    }
  };

  return (
    <div className="flow-root">
      <div className="flex text-neutral-700 dark:text-neutral-300 text-sm -mx-3 -my-1.5">
        {/* Share button */}
        <button
          type="button"
          onClick={handleShare}
          className="py-1.5 px-3 flex rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span className="hidden sm:block ml-2.5">Share</span>
        </button>

        {/* Like/Save button */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          disabled={!hotelId || isProcessing}
          className={`py-1.5 px-3 flex rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors ${
            !hotelId ? "opacity-50 cursor-not-allowed" : ""
          } ${isProcessing ? "opacity-50" : ""}`}
          title={isLiked ? "Bỏ yêu thích" : "Yêu thích"}
        >
          <Heart
            className={`h-5 w-5 transition-all duration-200 ${
              isLiked ? "text-red-500 fill-red-500" : ""
            } ${isProcessing ? "animate-pulse" : ""}`}
            strokeWidth={1.5}
          />
          <span className="hidden sm:block ml-2.5">
            {isLiked ? "Đã lưu" : "Lưu"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default LikeSaveBtns;
