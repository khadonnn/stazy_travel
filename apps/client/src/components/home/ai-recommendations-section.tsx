// src/components/home/ai-recommendations-section.tsx
import React from "react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Brain, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAIRecommendations } from "@/actions/get-ai-recommendations";
import FadeIn from "@/components/ui/fade-in"; //  THÊM IMPORT

const gradientText =
  "bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent";

export default async function AIRecommendationsSection() {
  const result = await getAIRecommendations();

  if (!result?.hotels?.length) {
    return null;
  }

  const isFromCache = result.isFromCache;

  return (
    <section className="py-16 px-5 md:px-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl border border-border/40 bg-muted/70 p-8 md:p-12 overflow-hidden">
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted-foreground)/0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Content */}
        <div className="relative">
          {/*  BỌC FADE-IN CHO HEADER (Hiện ngay lập tức) */}
          <FadeIn delay={0}>
            {/* Header */}
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-primary/30 p-3">
                  <Brain className="w-7 h-7 text-primary" />
                </div>

                <div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                    AI Gợi Ý Dành Riêng Cho Bạn
                  </h2>
                  <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap
                      className="w-4 h-4 text-amber-500"
                      fill="currentColor"
                    />
                    <span>Đề xuất thông minh dựa trên sở thích của bạn</span>
                  </div>
                </div>
              </div>

              <Badge variant="secondary" className="px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI Powered
              </Badge>
            </div>

            {/* Cache / Fresh indicator */}
            <div className="mb-8">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  isFromCache
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                {isFromCache
                  ? `Đã lưu cache • ${new Date(result.cachedAt).toLocaleString("vi-VN")}`
                  : "Dự đoán mới nhất"}
              </div>
            </div>
          </FadeIn>

          {/* Bento Grid */}
          <BentoGrid className="lg:grid-cols-4 auto-rows-fr gap-5">
            {result.hotels.slice(0, 4).map((hotel, i) => {
              //  TÁCH CLASS CHIA CỘT RA ĐỂ GÁN CHO FADE-IN
              let spanClass = "";
              if (i === 0) spanClass = "lg:col-span-2 lg:row-span-2";
              else if (i === 1) spanClass = "lg:col-span-2";

              return (
                <FadeIn
                  key={hotel.id}
                  delay={i * 100} // Gợn sóng
                  className={`${spanClass} h-full w-full !m-0`} //  Ép khít ô lưới
                >
                  <BentoGridItem
                    className="border border-border/60 hover:border-primary/40 h-full w-full" //  Thêm h-full w-full
                    id={hotel.id}
                    title={hotel.title}
                    description={hotel.address}
                    image={
                      hotel.galleryImgs?.[0] ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800"
                    }
                    price={Number(hotel.price)}
                    rating={Number(hotel.reviewStar) || 4.8}
                    category={hotel.category?.name || "Khách sạn"}
                  />
                </FadeIn>
              );
            })}
          </BentoGrid>
        </div>
      </div>
    </section>
  );
}
