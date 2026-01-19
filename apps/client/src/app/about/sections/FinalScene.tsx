"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import Scene from "@/components/cinematic/Scene";
import { ArrowRight } from "lucide-react";

export default function FinalScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 60%",
        },
      });

      tl.fromTo(
        ".final-title",
        { opacity: 0, y: 80 },
        { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" },
      )
        .fromTo(
          ".final-subtitle",
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.6",
        )
        .fromTo(
          ".final-cta",
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" },
          "-=0.4",
        );

      // Floating CTA
      gsap.to(".final-cta", {
        y: -10,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <Scene className="bg-gradient-to-b from-slate-900 to-black text-white">
      <div
        ref={containerRef}
        className="text-center max-w-5xl mx-auto px-6 space-y-12"
      >
        <h2 className="final-title text-6xl md:text-8xl font-bold">
          Sẵn Sàng Bắt Đầu?
        </h2>
        <p className="final-subtitle text-2xl md:text-3xl text-gray-300">
          Cùng hàng trăm khách sạn đã tin tưởng Stazy
        </p>
        <div className="final-cta pt-8">
          <button className="group px-12 py-6 bg-gradient-to-r from-[#4fae9b] to-teal-600 hover:from-[#4fae9b] hover:to-emerald-600 rounded-full text-xl font-semibold shadow-2xl transition-all duration-300">
            <span className="flex items-center gap-4">
              Bắt Đầu Ngay
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </span>
          </button>
        </div>
      </div>
    </Scene>
  );
}
