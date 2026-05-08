"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const ease = [0.22, 1, 0.36, 1] as const;

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-44 overflow-hidden"
    >
      {/* Ambient glow nhẹ */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 md:px-8 lg:px-12">
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-950">
          <div className="relative h-[460px] md:h-[560px]">
            {/* Next.js Image */}
            <Image
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800"
              alt="Road trip adventure"
              fill
              className="object-cover"
              priority
              quality={85}
              sizes="(max-width: 768px) 100vw, 1200px"
            />

            {/* Overlay nhẹ hơn - ảnh sẽ sáng và rõ hơn */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/50 to-black/30" />

            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <div className="max-w-3xl">
                <motion.h2
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 1, ease }}
                  className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tighter text-white leading-[1.05]"
                >
                  Sẵn sàng cho
                  <br />
                  chuyến đi tiếp theo?
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 25 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.9, ease, delay: 0.15 }}
                  className="mx-auto mt-6 max-w-md text-lg md:text-xl text-zinc-200"
                >
                  Tham gia cùng hàng trăm nghìn du khách đang tìm kiếm nơi nghỉ
                  dưỡng tuyệt vời tiếp theo.
                </motion.p>

                {/* Buttons - không hover scale */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.9, ease, delay: 0.35 }}
                  className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                  <Link
                    href="/"
                    className="inline-flex h-14 min-w-[220px] items-center justify-center rounded-2xl bg-white px-8 font-semibold text-zinc-950 transition-all duration-200 hover:bg-zinc-100 active:scale-[0.985]"
                  >
                    Bắt đầu hành trình
                  </Link>

                  <Link
                    href="/"
                    className="inline-flex h-14 min-w-[220px] items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-8 font-medium text-white backdrop-blur-md transition-all duration-200 hover:border-white/50 hover:bg-white/15"
                  >
                    Khám phá điểm đến
                  </Link>
                </motion.div>

                {/* Trust badges */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ delay: 0.6 }}
                  className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    Không phí đặt phòng
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    Hỗ trợ 24/7
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    Hủy miễn phí
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative line */}
        <div className="mt-16 flex justify-center">
          <div className="h-px w-28 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </section>
  );
}
