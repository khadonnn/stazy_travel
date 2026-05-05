"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Độ trễ (ms)
  threshold?: number; // Tỷ lệ xuất hiện (0.1 - 1.0)
  duration?: number; // Thời gian hiệu ứng (ms)
}

export default function FadeIn({
  children,
  className,
  delay = 0,
  threshold = 0.2,
  duration = 700, // Giảm một chút xuống 700ms cho gọn gàng, không bị lê thê
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto transition-all ease-out will-change-transform origin-center",
        isVisible
          ? "opacity-100 scale-100 translate-y-0" // Hiện: Kéo về vị trí gốc
          : "opacity-0 scale-95 translate-y-8", // Ẩn: Nằm thấp hơn 32px (translate-y-8)
        className,
      )}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}
