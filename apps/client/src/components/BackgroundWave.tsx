// app/components/BackgroundWave.tsx
"use client";

import { usePathname } from "next/navigation";

type BackgroundRule = {
  pattern: RegExp;
  visible: boolean;
};

// Quy tắc ưu tiên từ trên xuống dưới.
const BACKGROUND_RULES: BackgroundRule[] = [
  { pattern: /^\/profile\/[^/]+$/, visible: false },
  { pattern: /^\/search-service(\/|$)/, visible: false },
  { pattern: /^\/chat(\/|$)/, visible: false },
  { pattern: /^\/booking(\/|$)/, visible: false },
  { pattern: /^\/admin(\/|$)/, visible: false },
  { pattern: /^\/api-docs(\/|$)/, visible: false },
  { pattern: /^\/hotels(\/|$)/, visible: false },
  { pattern: /^\/cart(\/|$)/, visible: false },
];

function isVisible(pathname: string): boolean {
  const matched = BACKGROUND_RULES.find((rule) => rule.pattern.test(pathname));
  return matched ? matched.visible : true;
}

export default function BackgroundWave() {
  const pathname = usePathname();
  if (!pathname || !isVisible(pathname)) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes wave-move-1 {
          0% {
            transform: translateX(0) translateY(0);
          }
          25% {
            transform: translateX(-40px) translateY(-8px);
          }
          50% {
            transform: translateX(-20px) translateY(6px);
          }
          75% {
            transform: translateX(30px) translateY(-4px);
          }
          100% {
            transform: translateX(0) translateY(0);
          }
        }
        @keyframes wave-move-2 {
          0% {
            transform: translateX(0) translateY(0);
          }
          25% {
            transform: translateX(35px) translateY(6px);
          }
          50% {
            transform: translateX(-15px) translateY(-10px);
          }
          75% {
            transform: translateX(-30px) translateY(4px);
          }
          100% {
            transform: translateX(0) translateY(0);
          }
        }
        @keyframes wave-move-3 {
          0% {
            transform: translateX(0) translateY(0);
          }
          25% {
            transform: translateX(-25px) translateY(10px);
          }
          50% {
            transform: translateX(25px) translateY(-6px);
          }
          75% {
            transform: translateX(15px) translateY(8px);
          }
          100% {
            transform: translateX(0) translateY(0);
          }
        }
        .wave-back {
          animation: wave-move-3 14s ease-in-out infinite;
        }
        .wave-mid {
          animation: wave-move-2 10s ease-in-out infinite;
        }
        .wave-front {
          animation: wave-move-1 7s ease-in-out infinite;
        }
      `}</style>

      <div
        className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
        style={{ width: "100vw", left: 0, right: 0 }}
      >
        <svg
          className="absolute bottom-0 left-0 w-full h-[55vh] min-h-[300px]"
          viewBox="0 0 1440 400"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%" }}
        >
          <defs>
            <linearGradient id="wg1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ccfbf1" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="wg2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#99f6e4" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="wg3" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#5eead4" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Wave layer 3 - back */}
          <path
            className="wave-back"
            d="M0 260 C240 200, 480 320, 720 260 C960 200, 1200 300, 1440 240 L1440 400 L0 400Z"
            fill="url(#wg3)"
          />

          {/* Wave layer 2 - mid */}
          <path
            className="wave-mid"
            d="M0 300 C180 260, 360 340, 540 300 C720 260, 900 340, 1080 300 C1260 260, 1380 320, 1440 290 L1440 400 L0 400Z"
            fill="url(#wg2)"
          />

          {/* Wave layer 1 - front */}
          <path
            className="wave-front"
            d="M0 340 C120 310, 240 370, 360 340 C480 310, 600 370, 720 340 C840 310, 960 370, 1080 340 C1200 310, 1320 360, 1440 330 L1440 400 L0 400Z"
            fill="url(#wg1)"
          />
        </svg>
      </div>
    </>
  );
}
