"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  Award,
  Users,
  Globe,
  Heart,
  Zap,
  Shield,
  Clock,
  Star,
} from "lucide-react";
import { useAbout } from "@/hooks/useAbout";

const defaultValues = [
  {
    id: "quality",
    title: "Chất Lượng",
    description: "Cam kết sản phẩm và dịch vụ tốt nhất",
    icon: Award,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "customer",
    title: "Khách Hàng Là Trung Tâm",
    description: "Đặt trải nghiệm khách hàng lên hàng đầu",
    icon: Users,
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    id: "innovation",
    title: "Đổi Mới Sáng Tạo",
    description: "Không ngừng cải tiến công nghệ",
    icon: Globe,
    gradient: "from-[#4fae9b] to-emerald-600",
  },
  {
    id: "passion",
    title: "Đam Mê Du Lịch",
    description: "Kết nối mọi người và khám phá thế giới",
    icon: Heart,
    gradient: "from-rose-500 to-pink-600",
  },
  {
    id: "speed",
    title: "Tốc Độ",
    description: "Phản hồi nhanh, giải quyết hiệu quả",
    icon: Zap,
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    id: "trust",
    title: "Tin Cậy",
    description: "Bảo mật và minh bạch tuyệt đối",
    icon: Shield,
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    id: "support",
    title: "Hỗ Trợ 24/7",
    description: "Luôn sẵn sàng phục vụ mọi lúc, mọi nơi",
    icon: Clock,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "prestige",
    title: "Uy Tín",
    description: "Xây dựng niềm tin qua từng dịch vụ chất lượng",
    icon: Star,
    gradient: "from-violet-500 to-purple-600",
  },
];

export default function ValuesScene() {
  const { aboutData } = useAbout();
  const containerRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const horizontal = horizontalRef.current;
      if (!horizontal) return;

      const cards = horizontal.querySelectorAll(".value-card");
      const cardWidth = 420; // Increased card width
      const gap = 48; // 3rem gap
      const totalWidth = cards.length * cardWidth + (cards.length - 1) * gap;

      // Desktop: Horizontal scroll
      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        gsap.to(horizontal, {
          x: -(totalWidth - window.innerWidth + 100),
          ease: "power1.inOut",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: () => `+=${totalWidth}`, // Moderate scroll distance
            scrub: 0.8, // More responsive scrub
            pin: true,
            anticipatePin: 1,
          },
        });

        // Stagger fade in cards with parallax effect
        gsap.fromTo(
          cards,
          { opacity: 0, scale: 0.8, x: 100 },
          {
            opacity: 1,
            scale: 1,
            x: 0,
            stagger: 0.12,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top center",
            },
          },
        );

        // Add continuous subtle animation to each card
        cards.forEach((card, i) => {
          gsap.to(card, {
            y: Math.sin(i) * 10,
            duration: 2 + i * 0.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
        });
      });

      // Mobile: Vertical stack
      mm.add("(max-width: 767px)", () => {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.2,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 70%",
            },
          },
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const valuesData = aboutData?.values?.items || defaultValues;

  return (
    <div
      ref={containerRef}
      className="relative h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white overflow-hidden"
    >
      <div className="absolute inset-0 flex items-center">
        <div className="w-full">
          {/* Title */}
          <h2 className="text-5xl md:text-6xl font-bold text-center mb-12 md:mb-20 px-6">
            Giá Trị Cốt Lõi
          </h2>

          {/* Horizontal Scroll Container */}
          <div
            ref={horizontalRef}
            className="flex flex-row md:flex-row flex-col gap-8 md:gap-12 px-6 md:px-12"
            style={{
              width: "max-content",
            }}
          >
            {valuesData.map((value: any) => {
              const Icon =
                defaultValues.find((v) => v.id === value.id)?.icon || Award;
              const gradient =
                defaultValues.find((v) => v.id === value.id)?.gradient ||
                "from-blue-500 to-cyan-600";

              return (
                <div
                  key={value.id}
                  className="value-card group w-full md:w-[420px] flex-shrink-0"
                >
                  <div className="relative h-[480px] bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-[#4fae9b]/50 transition-all duration-500 overflow-hidden shadow-2xl hover:shadow-[#4fae9b]/20">
                    {/* Gradient overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                    />

                    <div className="relative z-10 h-full flex flex-col">
                      {/* Icon */}
                      <div
                        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl`}
                      >
                        <Icon className="w-10 h-10 text-white" />
                      </div>

                      {/* Title */}
                      <h3 className="text-3xl font-bold mb-4">{value.title}</h3>

                      {/* Description */}
                      <p className="text-lg text-gray-400 leading-relaxed flex-1">
                        {value.description}
                      </p>

                      {/* Decorative line */}
                      <div
                        className={`w-16 h-1 bg-gradient-to-r ${gradient} mt-6`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scroll indicator on desktop */}
      <div className="hidden md:block absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm text-gray-500 mb-2">Scroll để xem thêm →</p>
      </div>
    </div>
  );
}
