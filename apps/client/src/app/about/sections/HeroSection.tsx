"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { ArrowDown } from "lucide-react";
import Link from "next/link";

const ease = [0.22, 1, 0.36, 1] as const;

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Parallax on hero image
      if (imageRef.current) {
        gsap.to(imageRef.current, {
          y: 80,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* Background image with parallax */}
      <div ref={imageRef} className="absolute inset-0 -top-20">
        {/* Light overlay — keeps image visible */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-zinc-950/30 via-zinc-950/20 to-zinc-950/50" />
        {/* Radial glow for depth */}
        <div className="absolute left-1/3 top-1/4 z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        <img
          src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&q=80"
          alt="Beautiful tropical destination"
          className="h-[120%] w-full object-cover object-center opacity-50"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 mx-auto w-full max-w-6xl px-6 pb-20 pt-32 md:px-12 lg:px-20">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium tracking-widest text-zinc-400 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Về Stazy
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, ease, delay: 0.4 }}
            className="mt-8 text-5xl font-semibold leading-[1.1] tracking-tight text-white md:text-7xl lg:text-[5.5rem]"
          >
            Hành trình du lịch
            <br />
            <span className="text-zinc-400">trở nên dễ dàng.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.7 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 md:text-xl"
          >
            Stazy kết nối du khách với những kỳ nghỉ tuyệt vời trên khắp thế
            giới. Đặt phòng đơn giản, trải nghiệm đáng nhớ.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.9 }}
            className="mt-10 flex items-center gap-4"
          >
            <Link
              href="/"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-medium text-zinc-950 transition-all duration-300 hover:bg-zinc-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              Khám phá Stazy
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-7 text-sm font-medium text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            >
              Câu chuyện của chúng tôi
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[11px] tracking-widest text-zinc-500 uppercase">
            Cuộn xuống
          </span>
          <ArrowDown className="h-4 w-4 text-zinc-500" />
        </motion.div>
      </motion.div>
    </section>
  );
}
