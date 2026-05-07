import React from "react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Sparkles } from "lucide-react";
import { getAIRecommendations } from "@/actions/get-ai-recommendations";
import FadeIn from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

export default async function AIRecommendationsSection() {
  const result = await getAIRecommendations();

  if (!result?.hotels?.length) return null;

  return (
    <section className="relative py-24 px-5 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <FadeIn delay={0}>
          <div className="mb-10 flex items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-px w-8 bg-zinc-400/40" />
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
                  Personalized
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
                Dành riêng cho bạn
              </h2>

              <p className="mt-3 text-sm text-zinc-400 max-w-xl leading-relaxed">
                Những nơi lưu trú phù hợp với sở thích và hành vi tìm kiếm gần
                đây của bạn.
              </p>
            </div>

            <div
              className="
                hidden md:flex
                items-center gap-2
                px-3 py-2 rounded-full
                border border-zinc-400/10
                bg-gray-500/10
                backdrop-blur-xl
              "
            >
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-sm text-zinc-800">AI Recommendations</span>
            </div>
          </div>
        </FadeIn>

        {/* Grid */}
        <BentoGrid>
          {result.hotels.slice(0, 4).map((hotel, i) => {
            let spanClass = "";

            if (i === 0) {
              spanClass = "lg:col-span-2 lg:row-span-2";
            } else if (i === 1) {
              spanClass = "lg:col-span-2";
            }

            return (
              <FadeIn
                key={hotel.id}
                delay={i * 120}
                className={cn(spanClass, "h-full")}
              >
                <BentoGridItem
                  featured={i === 0}
                  id={hotel.id}
                  title={hotel.title}
                  description={hotel.address}
                  image={
                    hotel.galleryImgs?.[0] ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200"
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
    </section>
  );
}
