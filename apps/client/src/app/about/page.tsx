"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { ArrowUp } from "lucide-react";
import HeroSection from "./sections/HeroSection";
import MissionSection from "./sections/MissionSection";
import WhyStazySection from "./sections/WhyStazySection";
import StatsSection from "./sections/StatsSection";
import TeamSection from "./sections/TeamSection";
import CTASection from "./sections/CTASection";
import AnimatedParticles from "./sections/AnimatedParticles";

export default function AboutPage() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Global GSAP smooth scroll setup
    ScrollTrigger.config({ limitCallbacks: true });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main
      ref={mainRef}
      className="relative min-h-screen bg-zinc-950 text-white selection:bg-white/10"
    >
      {/* Global particles background */}
      <AnimatedParticles />

      {/* Subtle radial gradient for depth */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="
      absolute left-1/4 top-0
      h-[600px] w-[600px]
      -translate-x-1/2
      rounded-full
      bg-emerald-400/[0.08]
      blur-[140px]
    "
        />

        <div
          className="
      absolute bottom-1/4 right-0
      h-[500px] w-[500px]
      rounded-full
      bg-sky-400/[0.07]
      blur-[120px]
    "
        />
      </div>

      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <HeroSection />
      <MissionSection />
      <WhyStazySection />
      <StatsSection />
      <TeamSection />
      <CTASection />

      {/* Scroll to Top */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 text-white shadow-xl backdrop-blur-md transition-all duration-500 hover:bg-zinc-800/80 ${
          showScrollTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </main>
  );
}
