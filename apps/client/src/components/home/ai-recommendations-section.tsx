"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Sparkles, Loader2 } from "lucide-react";
import {
  getAIRecommendations,
  type AIInsightChip,
  type RecommendedHotel,
  type AIRecommendationResult,
} from "@/actions/get-ai-recommendations";
import { cn } from "@/lib/utils";

export default function AIRecommendationsSection() {
  const { isSignedIn, isLoaded } = useUser();
  const [hotels, setHotels] = useState<RecommendedHotel[]>([]);
  const [chips, setChips] = useState<AIInsightChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReranking, setIsReranking] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchRecommendations = useCallback(async (chipSignal?: string) => {
    try {
      setError(null);
      console.log("[ai-recommend] 📞 Calling getAIRecommendations...");
      const result: AIRecommendationResult | null =
        await getAIRecommendations(chipSignal);
      console.log(
        "[ai-recommend] 📥 Result:",
        result ? `${result.hotels.length} hotels` : "null",
      );
      if (!mountedRef.current) return;
      if (result && result.hotels.length > 0) {
        setHotels(result.hotels);
        setChips(result.chips);
      } else {
        setHotels([]);
        setChips([]);
      }
    } catch (e: any) {
      if (!mountedRef.current) return;
      console.error("Failed to fetch AI recommendations:", e);
      setError("Không thể tải gợi ý. Vui lòng thử lại.");
    }
  }, []);

  useEffect(() => {
    // Don't fetch recommendations if user is not signed in
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        await fetchRecommendations();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    // Auto-refresh when user performs HIGH-INTENT interactions
    // Only fires for: ADD_TO_WISHLIST, BOOK, RATE_POSITIVE, RATE_NEGATIVE, CLICK_BOOK_NOW
    // VIEW interactions do NOT trigger this (tracker.ts filters them out)
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleInteraction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log(
        "[ai-recommend] High-intent interaction, refreshing...",
        detail,
      );
      if (!cancelled) {
        // Debounce: wait 500ms for rapid interactions (e.g. multiple wishlist adds)
        if (refreshTimeout) clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          if (!cancelled) fetchRecommendations();
        }, 500);
      }
    };
    window.addEventListener("interaction:tracked", handleInteraction);

    return () => {
      cancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      window.removeEventListener("interaction:tracked", handleInteraction);
    };
  }, [fetchRecommendations, isLoaded, isSignedIn]);

  const handleChipClick = useCallback(
    async (chip: AIInsightChip) => {
      if (isReranking) return;
      const isDeselecting = activeChip === chip.id;
      const newActive = isDeselecting ? null : chip.id;
      setActiveChip(newActive);
      setIsReranking(true);
      try {
        await fetchRecommendations(isDeselecting ? undefined : chip.signal);
      } finally {
        if (mountedRef.current) setIsReranking(false);
      }
    },
    [activeChip, isReranking, fetchRecommendations],
  );

  // Don't render until Clerk loads. If loaded but not signed in, hide.
  if (isLoaded && !isSignedIn) return null;
  // If Clerk not loaded yet, don't render (prevents hydration mismatch)
  if (!isLoaded) return null;

  if (loading) {
    return (
      <section className="relative py-24 px-5 md:px-8 pointer-events-none">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-10 w-80 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "bg-gray-100 rounded-xl animate-pulse",
                  i === 0
                    ? "lg:col-span-2 lg:row-span-2 h-[480px] md:h-[560px]"
                    : "h-[240px] md:h-[280px]",
                )}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error && hotels.length === 0) {
    return (
      <section className="relative py-24 px-5 md:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-zinc-400">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchRecommendations().finally(() => {
                if (mountedRef.current) setLoading(false);
              });
            }}
            className="mt-3 text-sm text-[#3B7F70] hover:underline"
          >
            Thử lại
          </button>
        </div>
      </section>
    );
  }

  if (!hotels.length) return null;

  return (
    <section className="relative py-24 px-5 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-8 bg-zinc-400/40" />
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
                AI Personalized
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
              Dành riêng cho bạn
            </h2>
            <p className="mt-3 text-sm text-zinc-400 max-w-xl leading-relaxed">
              Gợi ý thông minh dựa trên hành vi và sở thích của bạn.
            </p>
          </div>

          {chips.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap relative z-10">
              {isReranking && (
                <Loader2 className="w-4 h-4 text-[#3B7F70] animate-spin" />
              )}
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChipClick(chip);
                  }}
                  disabled={isReranking}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer",
                    activeChip === chip.id
                      ? "bg-[#3B7F70] text-white border-[#3B7F70] shadow-md"
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-[#3B7F70]/40 hover:text-[#3B7F70]",
                    isReranking && "opacity-60 cursor-wait pointer-events-none",
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            "transition-opacity duration-300",
            isReranking && "opacity-50 pointer-events-none",
          )}
        >
          {/* 12-column grid, 2 rows, 4 cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-2 gap-4 auto-rows-[240px] lg:h-[500px]">
            {/* Hotel 0: Large featured left card (6 cols × 2 rows) */}
            <div className="lg:col-span-6 lg:row-span-2 h-[280px] lg:h-full">
              {hotels[0] && (
                <BentoGridItem
                  featured={true}
                  id={hotels[0].id}
                  title={hotels[0].title}
                  description={hotels[0].address}
                  image={
                    hotels[0].galleryImgs?.[0] ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200"
                  }
                  price={hotels[0].price}
                  rating={hotels[0].reviewStar || 4.8}
                  category={hotels[0].category?.name || "Khách sạn"}
                />
              )}
            </div>

            {/* Hotel 1: Medium top-right card (6 cols × 1 row) */}
            <div className="lg:col-start-7 lg:col-span-6 h-[200px] lg:h-full">
              {hotels[1] && (
                <BentoGridItem
                  id={hotels[1].id}
                  title={hotels[1].title}
                  description={hotels[1].address}
                  image={
                    hotels[1].galleryImgs?.[0] ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200"
                  }
                  price={hotels[1].price}
                  rating={hotels[1].reviewStar || 4.8}
                  category={hotels[1].category?.name || "Khách sạn"}
                />
              )}
            </div>

            {/* Hotel 2: Small card (3 cols × 1 row) */}
            <div className="lg:col-start-7 lg:col-span-3 lg:row-start-2 h-[200px] lg:h-full">
              {hotels[2] && (
                <BentoGridItem
                  id={hotels[2].id}
                  title={hotels[2].title}
                  description={hotels[2].address}
                  image={
                    hotels[2].galleryImgs?.[0] ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200"
                  }
                  price={hotels[2].price}
                  rating={hotels[2].reviewStar || 4.8}
                  category={hotels[2].category?.name || "Khách sạn"}
                />
              )}
            </div>

            {/* Hotel 3: Small card (3 cols × 1 row) */}
            <div className="lg:col-start-10 lg:col-span-3 lg:row-start-2 h-[200px] lg:h-full">
              {hotels[3] && (
                <BentoGridItem
                  id={hotels[3].id}
                  title={hotels[3].title}
                  description={hotels[3].address}
                  image={
                    hotels[3].galleryImgs?.[0] ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200"
                  }
                  price={hotels[3].price}
                  rating={hotels[3].reviewStar || 4.8}
                  category={hotels[3].category?.name || "Khách sạn"}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
