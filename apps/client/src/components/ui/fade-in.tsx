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
  threshold = 0.2, // Mặc định an toàn là 20%
  duration = 800, // Mặc định 800ms cho mượt
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
      { threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      // ✅ THÊM 'mx-auto' để luôn căn giữa
      // ✅ THÊM 'origin-center' để đảm bảo nó nở ra từ tâm
      className={cn(
        "mx-auto transition-all ease-out will-change-transform origin-center",
        isVisible
          ? "opacity-100 scale-100" // Trạng thái cuối: Full size
          : "opacity-0 scale-95", // Trạng thái đầu: Nhỏ hơn (95%) và mờ
        className
      )}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`, // Dùng style inline để tùy biến duration dễ hơn
      }}
    >
      {children}
    </div>
  );
}
