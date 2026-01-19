"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import Scene from "@/components/cinematic/Scene";
import { useAbout } from "@/hooks/useAbout";
import Image from "next/image";

export default function HeroScene() {
  const { aboutData, loadData } = useAbout();
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aboutData) {
      loadData();
    }
  }, [aboutData, loadData]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.3 });

      // Masked text reveal - characters slide up
      if (titleRef.current) {
        const chars = titleRef.current.querySelectorAll(".char");
        tl.fromTo(
          chars,
          { y: 100, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.2,
            stagger: 0.05,
            ease: "power4.out",
          },
        );
      }

      // Subtitle fade in
      tl.fromTo(
        subRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" },
        "-=0.6",
      );

      // Overlay fade out
      tl.to(
        overlayRef.current,
        { opacity: 0, duration: 1.5, ease: "power2.inOut" },
        "-=1",
      );

      // 3D floating element rotation
      gsap.to(floatingRef.current, {
        rotateY: 360,
        rotateX: 15,
        duration: 20,
        repeat: -1,
        ease: "none",
      });

      // React to scroll speed
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => {
          const velocity = self.getVelocity();
          gsap.to(floatingRef.current, {
            rotateZ: velocity * 0.01,
            duration: 0.3,
          });
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const heroData = aboutData?.heroSection || {
    title: "Stazy Booking",
    description: "Quản Lý Khách Sạn Hiện Đại",
  };

  // Split title into characters for animation
  const titleChars = heroData.title.split("").map((char, i) => (
    <span
      key={i}
      className="char inline-block"
      style={{ transformOrigin: "bottom" }}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));

  return (
    <Scene className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white overflow-hidden">
      {/* Overlay for initial entrance */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-slate-950 z-20 pointer-events-none"
      />

      {/* 3D Floating Element */}
      <div
        ref={floatingRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 opacity-10 pointer-events-none"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="w-full h-full rounded-full bg-gradient-to-br from-[#4fae9b] to-teal-600 blur-3xl"
          style={{ transform: "translateZ(100px)" }}
        />
      </div>

      <div
        ref={containerRef}
        className="relative z-10 text-center max-w-6xl mx-auto px-6"
      >
        {/* Main Title with masked reveal */}
        <div className="overflow-hidden mb-8">
          <h1
            ref={titleRef}
            className="text-5xl md:text-5xl font-bold tracking-tight"
            style={{
              textShadow: "0 10px 30px rgba(79, 174, 155, 0.3)",
            }}
          >
            {titleChars}
          </h1>
        </div>

        {/* Subtitle */}
        <p
          ref={subRef}
          className="text-2xl md:text-4xl text-gray-300 font-light leading-relaxed"
        >
          {heroData.description}
        </p>

        {/* Decorative elements */}
        <div className="mt-16 flex justify-center gap-3">
          <div className="w-20 h-1 bg-gradient-to-r from-transparent via-[#4fae9b] to-transparent" />
        </div>
      </div>
    </Scene>
  );
}
