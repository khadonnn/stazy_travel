"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import StaySearchForm from "@/components/StaySearchForm";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

export default function HeroSection() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dustActive, setDustActive] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);

  const springX = useSpring(pointerX, {
    stiffness: 120,
    damping: 18,
    mass: 0.6,
  });
  const springY = useSpring(pointerY, {
    stiffness: 120,
    damping: 18,
    mass: 0.6,
  });

  const rotateY = useTransform(springX, [0, 1], ["-14deg", "14deg"]);
  const rotateX = useTransform(springY, [0, 1], ["10deg", "-10deg"]);
  const titleLift = useTransform(springY, [0, 1], ["6px", "-6px"]);
  const imageLift = useTransform(springY, [0, 1], ["10px", "-16px"]);
  const imageScale = useTransform(springX, [0, 1], [1, 1.06]);

  // Đảm bảo Math.random() chỉ chạy trên Client-side để tránh lệch cấu trúc render với Server
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !heroRef.current) return;

    const rect = heroRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    pointerX.set(Math.max(0, Math.min(1, x)));
    pointerY.set(Math.max(0, Math.min(1, y)));
  };

  const resetPointer = () => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

  return (
    <section className="relative mb-20 w-full px-10 mt-20">
      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={resetPointer}
        className="relative mx-auto aspect-video w-full max-w-7xl overflow-hidden rounded-3xl bg-[#f3f4f0]"
        style={{ perspective: 1600 }}
      >
        {/* === Top Divider Line === */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[96%] h-px bg-[rgba(30,90,68,0.2)] z-40">
          <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full bg-[#1e5a44]" />
        </div>

        {/* === Header Row === */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[92%] flex justify-between items-center z-45 font-(family-name:--font-archivo) text-xs font-extrabold text-[#1e5a44] tracking-[0.15em] uppercase">
          <span>STAZY TRAVEL</span>
          <span>2026</span>
        </div>

        {/* === LỚP 1 (z-10) — Text Layer === */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-start pt-[5vh] pointer-events-none"
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="text-center font-(family-name:--font-archivo) text-[clamp(0.7rem,1.2vw,1rem)] font-extrabold uppercase leading-relaxed tracking-[0.35em] text-[#1e5a44]"
            style={{ y: titleLift, translateZ: 36 }}
            initial={
              shouldReduceMotion
                ? undefined
                : { opacity: 0, y: 14, rotateX: 10 }
            }
            animate={
              shouldReduceMotion ? undefined : { opacity: 1, y: 0, rotateX: 0 }
            }
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>VI VU MÊ SAY</div>
            <div>CHẠM LÀ ĐẶT NGAY</div>
          </motion.div>
          <motion.h1
            className="mt-[1.5vh] text-center font-(family-name:--font-archivo) text-[clamp(4rem,13vw,11rem)] font-black uppercase leading-[0.8] tracking-[-0.04em] text-[#1e5a44]"
            style={{
              y: titleLift,
              translateZ: 90,
              textShadow:
                "0 1px 0 rgba(255,255,255,0.65), 0 20px 35px rgba(30, 90, 68, 0.15)",
            }}
            initial={
              shouldReduceMotion
                ? undefined
                : { opacity: 0, y: 34, scale: 0.96 }
            }
            animate={
              shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }
            }
            transition={{
              duration: 1.05,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.08,
            }}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
          >
            STAZY
          </motion.h1>
        </motion.div>

        {/* === LỚP 2 (z-20) — Mountain & Water === */}
        <motion.div
          className="absolute left-0 right-0 bottom-0 z-20 h-[80%] pointer-events-none"
          style={{
            rotateX,
            rotateY,
            scale: imageScale,
            y: imageLift,
            transformStyle: "preserve-3d",
          }}
          initial={
            shouldReduceMotion ? undefined : { opacity: 0, y: 30, scale: 0.98 }
          }
          animate={
            shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }
          }
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              translateZ: 24,
              filter: "drop-shadow(0 30px 45px rgba(30, 90, 68, 0.12))",
            }}
            animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/assets/hero/moutain_water.png"
              alt="Mountain and water landscape"
              fill
              priority
              quality={100}
              unoptimized
              className="object-cover object-bottom w-full! h-full! [image-rendering:crisp-edges]"
            />
          </motion.div>
        </motion.div>

        {/* === LỚP 3a (z-30) — Search Form === */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 w-full max-w-6xl px-6 z-30 flex flex-col items-center">
          <StaySearchForm />
        </div>

        {/* === LỚP 3b (z-35) — CTA Button với Hiệu ứng Hạt Bụi Ẩn Bên Trong === */}
        {/* === LỚP 3b (z-35) — CTA Button với Hiệu ứng Hạt Bụi Hoàn Hảo === */}
        {/* === LỚP 3b — CTA Button với Dust Effect === */}
        {/* === DUST EFFECT - Premium Version === */}
        {/* === DUST EFFECT - Premium Version === */}
        <div className="absolute inset-0 z-35 flex items-center justify-center pointer-events-none">
          <div
            className="relative translate-y-24 inline-block group pointer-events-auto overflow-hidden rounded-full bg-green-800/95 backdrop-blur-sm transition-all duration-300 hover:scale-[1.06] shadow-2xl"
            onMouseEnter={() => setDustActive(true)}
            onMouseLeave={() => setDustActive(false)}
          >
            {/* Dust Particles - Sang trọng & Tự nhiên */}
            {mounted &&
              Array.from({ length: 18 }).map((_, i) => {
                const isOrb = i < 5;
                const size = isOrb
                  ? 7 + Math.random() * 13
                  : 1.4 + Math.random() * 2.8;

                const duration = isOrb
                  ? 3.8 + Math.random() * 2.4
                  : 2.1 + Math.random() * 2.2;

                const delay = -Math.random() * (isOrb ? 3 : 2.2);

                return (
                  <span
                    key={i}
                    className={
                      isOrb
                        ? "dust-orb absolute rounded-full pointer-events-none z-10"
                        : "dust-particle absolute rounded-full pointer-events-none z-10"
                    }
                    style={{
                      left: `${22 + Math.random() * 56}%`,
                      bottom: `${12 + Math.random() * 18}%`, // Spawn từ dưới
                      width: `${size}px`,
                      height: `${size}px`,

                      animationName: dustActive
                        ? isOrb
                          ? "orbFloatPremium"
                          : "dustDriftPremium"
                        : "none",

                      animationDelay: `${delay}s`,
                      animationDuration: `${duration}s`,
                      animationTimingFunction:
                        "cubic-bezier(0.25, 0.1, 0.25, 1)",
                      animationIterationCount: "infinite",
                      animationFillMode: "forwards",

                      opacity: dustActive ? (isOrb ? 0.75 : 0.85) : 0,
                      filter: isOrb
                        ? `blur(${2 + Math.random() * 3}px)`
                        : "blur(0.8px)",
                      boxShadow: isOrb
                        ? "0 0 20px rgba(255,255,255,0.85), 0 0 40px rgba(180,240,200,0.5)"
                        : "0 0 8px rgba(255,255,255,0.95)",
                    }}
                  />
                );
              })}

            {/* Button */}
            <button
              onClick={() => router.push("/search-service")}
              type="button"
              className="relative z-20 inline-flex items-center justify-center px-11 py-4 font-(family-name:--font-archivo) text-lg font-black text-white bg-transparent uppercase tracking-[0.2em] cursor-pointer whitespace-nowrap transition-colors"
            >
              Bắt đầu khám phá
              <Sparkles className="ml-2.5 w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .floating-particle {
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 255, 255, 0.18) 45%,
            rgba(255, 255, 255, 0.05) 70%,
            transparent 100%
          );

          mix-blend-mode: screen;

          will-change: transform, opacity;
        }

        @keyframes dustDriftPremium {
          0% {
            transform: translate3d(0, 10px, 0) scale(0.4) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 0.9;
          }
          38% {
            transform: translate3d(18px, -48px, 0) scale(1.18) rotate(55deg);
          }
          65% {
            transform: translate3d(-22px, -92px, 0) scale(0.92) rotate(165deg);
          }
          100% {
            transform: translate3d(12px, -138px, 0) scale(0.35) rotate(310deg);
            opacity: 0;
          }
        }

        @keyframes orbFloatPremium {
          0% {
            transform: translate3d(0, 8px, 0) scale(0.7);
            opacity: 0;
          }
          15% {
            opacity: 0.92;
          }
          45% {
            transform: translate3d(26px, -55px, 0) scale(1.25);
          }
          72% {
            transform: translate3d(-18px, -105px, 0) scale(0.95);
          }
          100% {
            transform: translate3d(15px, -155px, 0) scale(0.6);
            opacity: 0;
          }
        }

        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }

        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }

        .custom-popup .leaflet-popup-close-button {
          color: white !important;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
          z-index: 100;
          top: 12px !important;
          right: 12px !important;
        }

        .custom-popup .leaflet-popup-close-button:hover {
          color: #f3f4f6 !important;
        }

        .custom-popup .leaflet-popup-tip-container {
          margin-top: -2px;
        }

        .custom-popup .leaflet-popup-tip {
          background-color: white !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </section>
  );
}
