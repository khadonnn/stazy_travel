"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import Scene from "@/components/cinematic/Scene";
import { useAbout } from "@/hooks/useAbout";

export default function MissionScene() {
  const { aboutData } = useAbout();
  const containerRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Expanding space effect - starts small and opens up
      gsap.fromTo(
        spaceRef.current,
        { scale: 0.3, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "+=150%",
            scrub: 1,
            pin: true,
          },
        },
      );

      // Mission text reveal with stagger
      gsap.fromTo(
        ".mission-text",
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.5,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "+=150%",
            scrub: 1,
          },
        },
      );

      // Nature elements floating in
      gsap.fromTo(
        ".nature-element",
        { opacity: 0, scale: 0, rotate: -180 },
        {
          opacity: 0.15,
          scale: 1,
          rotate: 0,
          stagger: 0.3,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "+=150%",
            scrub: 1,
          },
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const missionData = aboutData?.mission || {
    title: "Sứ Mệnh Của Chúng Tôi",
    description:
      "Chúng tôi cam kết xây dựng một nền tảng công nghệ tiên tiến nhất",
  };

  return (
    <Scene className="relative bg-gradient-to-br from-black via-slate-950 to-slate-900 text-white overflow-hidden">
      {/* Nature-inspired floating elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="nature-element absolute top-20 left-10 w-64 h-64 rounded-full bg-[#4fae9b]/20 blur-3xl" />
        <div className="nature-element absolute bottom-20 right-10 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="nature-element absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div ref={containerRef} className="relative z-10">
        <div
          ref={spaceRef}
          className="max-w-5xl mx-auto px-6 text-center space-y-12"
          style={{ perspective: "1000px" }}
        >
          <h2 className="mission-text text-5xl md:text-7xl font-light mb-8">
            {missionData.title}
          </h2>
          <div className="mission-text w-20 h-1 bg-gradient-to-r from-transparent via-[#4fae9b] to-transparent mx-auto" />
          <p className="mission-text text-2xl md:text-3xl text-gray-300 leading-relaxed max-w-4xl mx-auto">
            {missionData.description}
          </p>
        </div>
      </div>
    </Scene>
  );
}
