// src/components/home/personalized-section.tsx
import React from "react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { getPersonalizedHotels } from "@/actions/get-personalized-hotels";
import { Sparkles } from "lucide-react";
import FadeIn from "@/components/ui/fade-in"; // 👈 NHỚ IMPORT FADE-IN

export default async function PersonalizedSection() {
  const items = await getPersonalizedHotels();

  // Đảm bảo có ít nhất 1 item
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-12 px-4 md:px-8 max-w-9xl mx-auto ">
      {/* Tiêu đề hiện lên đầu tiên (delay 0) */}
      <FadeIn delay={0}>
        <div className="mb-8 flex items-center gap-2 ml-18">
          <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500 animate-pulse" />
          <h2 className="text-3xl font-bold tracking-tight">
            Dành riêng cho bạn
          </h2>
        </div>
      </FadeIn>

      <BentoGrid className="lg:grid-cols-4 auto-rows-[minmax(180px,auto)] rounded-4xl">
        {items.map((item, i) => {
          let spanClass = "";

          // --- LOGIC CHO 7 ITEMS ---
          if (i === 0) {
            // [0] Hero: Vuông lớn 2x2
            spanClass = "md:col-span-2 md:row-span-2";
          } else if (i === 6) {
            // [6] Item cuối: Dài 3 cột (để lấp đầy hàng cuối cùng 1+3=4)
            spanClass = "md:col-span-3 md:row-span-1";
          } else {
            // [1,2,3,4,5]: Các ô nhỏ 1x1
            spanClass = "md:col-span-1 md:row-span-1";
          }

          /* MÔ PHỎNG KẾT QUẢ (Grid 4 cột):
             [  TO (0)  ] [ NHỎ(1) ] [ NHỎ(2) ]
             [  TO (0)  ] [ NHỎ(3) ] [ NHỎ(4) ]
             [  NHỎ(5)  ] [    VỪA/DÀI (6)    ] 
          */

          return (
            <FadeIn
              key={item.id}
              delay={i * 100}
              className={`${spanClass} h-full w-full !m-0`}
            >
              <BentoGridItem
                className="h-full w-full"
                id={item.id}
                title={item.title}
                description={item.address}
                image={
                  item.galleryImgs?.[0] ||
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070"
                }
                price={Number(item.price)}
                rating={Number(item.reviewStar) || 5.0}
                category={(item as any).category?.name || "Stay"}
              />
            </FadeIn>
          );
        })}
      </BentoGrid>
    </section>
  );
}
