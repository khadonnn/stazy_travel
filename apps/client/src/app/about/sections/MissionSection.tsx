"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const ease = [0.22, 1, 0.36, 1] as const;

export default function MissionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Line reveal animation
      if (lineRef.current) {
        gsap.fromTo(
          lineRef.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: lineRef.current,
              start: "top 85%",
              end: "top 60%",
              scrub: 0.3,
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 md:py-40">
      <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-20">
        {/* Divider line */}
        <div
          ref={lineRef}
          className="mb-20 h-px w-full origin-left bg-gradient-to-r from-white/10 via-white/[0.06] to-transparent"
        />

        <div className="grid items-start gap-16 md:grid-cols-2 md:gap-20">
          {/* Left: Label */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease }}
          >
            <span className="text-xs font-medium tracking-widest text-zinc-500 uppercase">
              Sứ Mệnh
            </span>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              Định nghĩa lại cách
              <br />
              mọi người tìm kiếm
              <br />
              <span className="text-zinc-500">nơi lưu trú.</span>
            </h2>
          </motion.div>

          {/* Right: Description */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease, delay: 0.2 }}
            className="pt-2"
          >
            <p className="text-lg leading-relaxed text-zinc-400">
              Chúng tôi tin rằng du lịch phải là trải nghiệm cá nhân, không chỉ
              đơn thuần là giao dịch. Stazy ra đời từ một ý tưởng đơn giản: nâng
              tầm trải nghiệm du lịch với AI agent chatbox.
            </p>
            <p className="mt-6 text-lg leading-relaxed text-zinc-400">
              Nền tảng của chúng tôi kết hợp tìm kiếm thông minh với trải nghiệm
              được tuyển chọn kỹ lưỡng, kết nối du khách với các khách sạn
              boutique, homestay độc đáo và những viên ngọc ẩn phù hợp với phong
              cách và ngân sách.
            </p>

            {/* Values grid */}
            <div className="mt-12 grid grid-cols-2 gap-8">
              {[
                { number: "01", label: "Đơn giản" },
                { number: "02", label: "Uy tín" },
                { number: "03", label: "Khám phá" },
                { number: "04", label: "Kết nối" },
              ].map((item, i) => (
                <motion.div
                  key={item.number}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, ease, delay: 0.3 + i * 0.1 }}
                >
                  <span className="text-xs font-mono text-zinc-600">
                    {item.number}
                  </span>
                  <p className="mt-1 text-sm font-medium text-zinc-300">
                    {item.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
