// app/components/BackgroundWave.tsx
"use client";

import { usePathname } from "next/navigation";

type BackgroundRule = {
  pattern: RegExp;
  svg: string | null;
};

const DEFAULT_SVG = "/assets/svg/seaside-booking-wave.svg";

// Quy tắc ưu tiên từ trên xuống dưới.
// - svg: null => Ẩn background
// - svg: "..." => Dùng SVG tương ứng cho route đó
const BACKGROUND_RULES: BackgroundRule[] = [
  // Ẩn riêng cho profile chi tiết: /profile/:id
  { pattern: /^\/profile\/[^/]+$/, svg: null },

  // Các trang muốn ẩn background
  { pattern: /^\/search-service(\/|$)/, svg: null },
  { pattern: /^\/chat(\/|$)/, svg: null },
  { pattern: /^\/booking(\/|$)/, svg: null },
  { pattern: /^\/admin(\/|$)/, svg: null },
  { pattern: /^\/api-docs(\/|$)/, svg: null },
  { pattern: /^\/hotels(\/|$)/, svg: null },
  { pattern: /^\/cart(\/|$)/, svg: null },

  // Ví dụ dùng SVG khác cho 1 trang cụ thể:
  // { pattern: /^\/about(\/|$)/, svg: "/assets/svg/paper-plane-trail.svg" },
];

function getSvgForPath(pathname: string): string | null {
  const matched = BACKGROUND_RULES.find((rule) => rule.pattern.test(pathname));
  return matched ? matched.svg : DEFAULT_SVG;
}

export default function BackgroundWave() {
  const pathname = usePathname();
  if (!pathname) return null;

  const svgPath = getSvgForPath(pathname);
  if (!svgPath) {
    return null;
  }

  return (
    <div className="inset-0 -z-10">
      {/* Gradient (có thể xóa nếu không dùng) */}
      <div className="absolute inset-0" />

      {/* Wave background */}
      <div
        className="
          absolute top-0 left-0 w-full h-full -z-10 bg-white
          bg-no-repeat
          bg-top
          bg-size-[100%_100%]
          opacity-70
          pointer-events-none
        "
        style={{ backgroundImage: `url('${svgPath}')` }}
      />
    </div>
  );
}
