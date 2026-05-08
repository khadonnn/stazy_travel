"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const ease = [0.22, 1, 0.36, 1] as const;

const stats = [
  {
    value: 50,
    suffix: "+",
    label: "Quốc gia",
    description: "Điểm đến toàn cầu",
  },
  {
    value: 12,
    suffix: "K+",
    label: "Nơi lưu trú",
    description: "Được tuyển chọn kỹ",
  },
  {
    value: 98,
    suffix: "%",
    label: "Hài lòng",
    description: "Du khách vui vẻ",
  },
  {
    value: 500,
    suffix: "K+",
    label: "Đặt phòng",
    description: "Và không ngừng tăng",
  },
];

function StatCounter({
  value,
  suffix,
  isInView,
}: {
  value: number;
  suffix: string;
  isInView: boolean;
}) {
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isInView || !counterRef.current) return;

    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 2,
      ease: "power2.out",
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = Math.round(obj.val).toString();
        }
      },
    });
  }, [isInView, value]);

  return (
    <span className="tabular-nums">
      <span ref={counterRef}>0</span>
      <span>{suffix}</span>
    </span>
  );
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Subtle horizontal parallax on the stats bar
      gsap.fromTo(
        ".stats-bar",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-10 md:py-8">
      <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-20">
        <div className="stats-bar rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm md:p-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  <StatCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    isInView={isInView}
                  />
                </div>
                <p className="mt-1 text-sm font-medium text-zinc-400">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  {stat.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
