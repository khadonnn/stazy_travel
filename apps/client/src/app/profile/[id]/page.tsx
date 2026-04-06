"use client";

import ProfileUserPage from "@/pages/ProfileUserPage";

const STARS = [
  {
    className: "left-[6%] top-[12%]",
    size: "4px",
    delay: "0s",
    duration: "2.5s",
  },
  {
    className: "left-[16%] top-[26%]",
    size: "3px",
    delay: "0.6s",
    duration: "3.2s",
  },
  {
    className: "left-[28%] top-[10%]",
    size: "2px",
    delay: "1.1s",
    duration: "2.2s",
  },
  {
    className: "left-[34%] top-[36%]",
    size: "3px",
    delay: "1.7s",
    duration: "3s",
  },
  {
    className: "left-[46%] top-[18%]",
    size: "4px",
    delay: "0.3s",
    duration: "2.8s",
  },
  {
    className: "left-[56%] top-[30%]",
    size: "2px",
    delay: "2.1s",
    duration: "2.3s",
  },
  {
    className: "right-[30%] top-[8%]",
    size: "3px",
    delay: "1.4s",
    duration: "2.7s",
  },
  {
    className: "right-[18%] top-[20%]",
    size: "4px",
    delay: "0.9s",
    duration: "3.1s",
  },
  {
    className: "right-[9%] top-[34%]",
    size: "3px",
    delay: "1.9s",
    duration: "2.9s",
  },
  {
    className: "right-[14%] bottom-[20%]",
    size: "2px",
    delay: "0.2s",
    duration: "2.4s",
  },
  {
    className: "left-[10%] bottom-[22%]",
    size: "3px",
    delay: "1.5s",
    duration: "3.4s",
  },
  {
    className: "left-[42%] bottom-[15%]",
    size: "4px",
    delay: "2.4s",
    duration: "2.6s",
  },
];

const CELESTIAL_OBJECTS = [
  {
    className: "left-[8%] top-[58%] w-24 h-24",
    type: "moon",
    delay: "0s",
    duration: "14s",
  },
  {
    className: "right-[24%] top-[14%] w-16 h-16",
    type: "earth",
    delay: "0.8s",
    duration: "13s",
  },
];

const SHOOTING_STARS = [
  {
    className: "left-[18%] top-[22%]",
    delay: "0.5s",
    duration: "7.5s",
  },
  {
    className: "left-[62%] top-[16%]",
    delay: "2.2s",
    duration: "8.5s",
  },
  {
    className: "left-[72%] top-[40%]",
    delay: "1.4s",
    duration: "9s",
  },
  {
    className: "left-[8%] top-[48%]",
    delay: "3.1s",
    duration: "8.2s",
  },
  {
    className: "left-[42%] top-[8%]",
    delay: "4.2s",
    duration: "7.8s",
  },
  {
    className: "right-[18%] top-[28%]",
    delay: "5.1s",
    duration: "8.8s",
  },
  {
    className: "right-[28%] top-[64%]",
    delay: "6.3s",
    duration: "9.2s",
  },
];

const RIGHT_LIGHT_LAYERS = [
  {
    className: "right-[2%] top-[48%] w-[760px] h-[760px]",
    opacity: "0.26",
    blur: "54px",
  },
  {
    className: "right-[6%] top-[54%] w-[500px] h-[500px]",
    opacity: "0.18",
    blur: "34px",
  },
  {
    className: "right-[10%] top-[60%] w-[260px] h-[260px]",
    opacity: "0.14",
    blur: "18px",
  },
];

const ProfilePage = () => {
  return (
    <div className="relative min-h-screen -mt-10">
      {/* Nền đen nhiều lớp */}
      <div className="absolute inset-0 z-0 bg-black" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12),transparent_35%)]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_78%_12%,rgba(255,255,255,0.08),transparent_28%)]" />

      {/* Vũ trụ animation background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0">
          {RIGHT_LIGHT_LAYERS.map((layer, index) => (
            <span
              key={`right-light-${index}`}
              className={`absolute rounded-full right-light ${layer.className}`}
              style={{
                opacity: layer.opacity,
                filter: `blur(${layer.blur})`,
                animationDelay: `${index * 0.6}s`,
              }}
            />
          ))}
        </div>

        {STARS.map(({ className, size, delay, duration }, index) => (
          <span
            key={index}
            className={`absolute rounded-full bg-white star-twinkle ${className}`}
            style={{
              width: size,
              height: size,
              animationDelay: delay,
              animationDuration: duration,
            }}
          />
        ))}

        {CELESTIAL_OBJECTS.map(
          ({ className, type, delay, duration }, index) => (
            <span
              key={`planet-${index}`}
              className={`absolute planet-float ${className} ${
                type === "moon"
                  ? "rounded-full border border-white/30 bg-white/10 moon-glow"
                  : "rounded-full border border-white/20"
              } ${
                type === "earth"
                  ? "bg-linear-to-br from-blue-200/45 via-sky-300/30 to-teal-200/20 earth-glow"
                  : ""
              }`}
              style={{ animationDelay: delay, animationDuration: duration }}
            />
          ),
        )}

        {SHOOTING_STARS.map(({ className, delay, duration }, index) => (
          <span
            key={`shoot-${index}`}
            className={`absolute shooting-star ${className}`}
            style={{ animationDelay: delay, animationDuration: duration }}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-0 bg-black/40" />

      {/* Content - nằm phía trước */}
      <div className="relative z-10 py-16">
        <ProfileUserPage />
      </div>

      <style jsx>{`
        .star-twinkle {
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
          animation-name: twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .right-light {
          background:
            radial-gradient(
              circle at center,
              rgba(255, 255, 255, 0.46) 0%,
              rgba(255, 255, 255, 0.22) 16%,
              rgba(255, 255, 255, 0.1) 34%,
              rgba(255, 255, 255, 0) 68%
            ),
            radial-gradient(
              circle at 45% 45%,
              rgba(255, 255, 255, 0.28) 0%,
              rgba(255, 255, 255, 0.12) 24%,
              rgba(255, 255, 255, 0) 58%
            );
          box-shadow:
            0 0 68px rgba(255, 255, 255, 0.12),
            0 0 140px rgba(255, 255, 255, 0.06);
          mix-blend-mode: screen;
          animation: lightPulse 10s ease-in-out infinite;
          transform-origin: center;
        }

        .planet-float {
          animation-name: planetFloat;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .moon-glow {
          box-shadow:
            inset 8px -8px 18px rgba(255, 255, 255, 0.12),
            0 0 24px rgba(255, 255, 255, 0.16);
        }

        .earth-glow {
          box-shadow:
            inset 8px -8px 14px rgba(255, 255, 255, 0.1),
            0 0 20px rgba(125, 211, 252, 0.24);
        }

        .shooting-star {
          width: 120px;
          height: 2px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.2) 55%,
            rgba(255, 255, 255, 0.98) 100%
          );
          transform: rotate(100deg) translateX(0);
          transform-origin: left center;
          opacity: 0;
          animation-name: shooting;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }

        @keyframes twinkle {
          0% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.25);
          }
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
        }

        @keyframes planetFloat {
          0% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-12px) translateX(3px);
          }
          100% {
            transform: translateY(0px) translateX(0px);
          }
        }

        @keyframes shooting {
          0% {
            opacity: 0;
            transform: rotate(100deg) translateX(0);
          }
          12% {
            opacity: 0.9;
          }
          52% {
            opacity: 0;
            transform: rotate(100deg) translateX(260px);
          }
          100% {
            opacity: 0;
            transform: rotate(100deg) translateX(260px);
          }
        }

        @keyframes lightPulse {
          0% {
            transform: scale(1);
            opacity: 0.13;
          }
          50% {
            transform: scale(1.008);
            opacity: 0.18;
          }
          100% {
            transform: scale(1);
            opacity: 0.13;
          }
        }
      `}</style>
    </div>
  );
};
export default ProfilePage;
