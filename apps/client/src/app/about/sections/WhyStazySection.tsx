"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { Search, Shield, Zap, Globe, Heart, Sparkles } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    icon: Search,
    title: "Tìm kiếm thông minh",
    description:
      "Tìm kiếm bằng AI hiểu sở thích của bạn và gợi ý những nơi nghỉ bạn thực sự yêu thích.",
  },
  {
    icon: Shield,
    title: "Đáng tin & Xác minh",
    description:
      "Mỗi danh sách đều được kiểm duyệt. Ảnh thật, đánh giá thật, an tâm cho mọi đặt phòng.",
  },
  {
    icon: Zap,
    title: "Đặt phòng tức thì",
    description:
      "Không cần qua lại nhiều lần. Đặt phòng trong vài giây với xác nhận trống và giá minh bạch.",
  },
  {
    icon: Globe,
    title: "Phạm vi toàn cầu",
    description:
      "Từ penthouse Tokyo đến treehouse Bali — tiếp cận nơi nghỉ độc đáo tại hơn 50 quốc gia.",
  },
  {
    icon: Heart,
    title: "Trải nghiệm tuyển chọn",
    description:
      "Bộ sưu tập được chọn lọc cho mọi tâm trạng: lãng mạn, team building, phiêu lưu gia đình.",
  },
  {
    icon: Sparkles,
    title: "Cam kết giá tốt nhất",
    description:
      "So sánh đa nền tảng. Chúng tôi đảm bảo bạn luôn nhận được mức giá tốt nhất.",
  },
];

export default function WhyStazySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { y: 60 },
          {
            y: -60,
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.5,
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 md:py-40">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />

      <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-20">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
          className="text-center"
        >
          <span className="text-xs font-medium tracking-widest text-zinc-500 uppercase">
            Tại sao chọn Stazy
          </span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Xây dựng cho du khách hiện đại
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Chúng tôi kết hợp công nghệ với thiết kế tinh tế để mọi bước trong
            hành trình của bạn liền mạch.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease, delay: 0.1 + i * 0.08 }}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-500 hover:-translate-y-[2px] hover:border-white/[0.1] hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(255,255,255,0.02)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] transition-colors duration-300 group-hover:bg-white/[0.1]">
                  <Icon className="h-5 w-5 text-zinc-400 transition-colors duration-300 group-hover:text-zinc-200" />
                </div>
                <h3 className="mt-5 text-[15px] font-medium text-zinc-200">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Image showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease, delay: 0.4 }}
          className="mt-24 overflow-hidden rounded-2xl border border-white/[0.06]"
        >
          <div ref={imageRef} className="relative aspect-[21/9] h-[140%]">
            <img
              src="https://res.cloudinary.com/dtj7wfwzu/image/upload/v1778055270/featuredImage/sapa_featuredImage_6.jpg"
              alt="Luxury resort aerial view"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/30" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
