// app/components/BackgroundWave.tsx
"use client";

import { usePathname } from "next/navigation";

const EXCLUDED_PATHS = [
  "/search-service",
  "/chat",
  "/booking",
  "/admin",
  "/api-docs",
  "/hotels",
  "/cart",
  // Thêm route bạn muốn ẩn wave vào đây
];

export default function BackgroundWave() {
  const pathname = usePathname();
  if (!pathname) return null;
  const shouldHide = EXCLUDED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (shouldHide) {
    return null;
  }

  return (
    <div className="inset-0 -z-10">
      {/* Gradient (có thể xóa nếu không dùng) */}
      <div className="absolute inset-0" />

      {/* Wave background */}
      <div
        className="
          absolute top-0 left-0 w-full h-full mt-20 -z-10
          bg-[url('/assets/svg/line2.svg')]
          bg-no-repeat
          bg-top
          bg-[length:100%_100%]
          opacity-70
          pointer-events-none
        "
      />
    </div>
  );
}
