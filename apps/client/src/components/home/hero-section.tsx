"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import StaySearchForm from "@/components/StaySearchForm";

export default function HeroSection() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Đảm bảo Math.random() chỉ chạy trên Client-side để tránh lệch cấu trúc render với Server
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative w-full mb-20 px-10 mt-20">
      <div className="relative w-full max-w-7xl mx-auto overflow-hidden rounded-3xl bg-[#f3f4f0] aspect-video">
        {/* === Top Divider Line === */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[96%] h-px bg-[rgba(30,90,68,0.2)] z-40">
          <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full bg-[#1e5a44]" />
        </div>

        {/* === Header Row === */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[92%] flex justify-between items-center z-45 font-[family-name:var(--font-archivo)] text-xs font-extrabold text-[#1e5a44] tracking-[0.15em] uppercase">
          <span>STAZY TRAVEL</span>
          <span>2026</span>
        </div>

        {/* === LỚP 1 (z-10) — Text Layer === */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-start pt-[5vh] pointer-events-none">
          <div className="font-[family-name:var(--font-archivo)] text-[clamp(0.7rem,1.2vw,1rem)] font-extrabold text-[#1e5a44] tracking-[0.35em] uppercase text-center leading-relaxed">
            <div>VI VU MÊ SAY</div>
            <div>CHẠM LÀ ĐẶT NGAY</div>
          </div>
          <h1 className="font-[family-name:var(--font-archivo)] text-[clamp(4rem,13vw,11rem)] font-black text-[#1e5a44] tracking-[-0.04em] uppercase text-center leading-[0.8] mt-[1.5vh]">
            STAZY
          </h1>
        </div>

        {/* === LỚP 2 (z-20) — Mountain & Water === */}
        <div className="absolute left-0 right-0 bottom-0 h-[90%] z-20 pointer-events-none">
          <Image
            src="/assets/hero/moutain_water.png"
            alt="Mountain and water landscape"
            fill
            priority
            quality={100}
            unoptimized
            className="object-cover object-bottom !w-full !h-full [image-rendering:crisp-edges]"
          />
        </div>

        {/* === LỚP 3a (z-30) — Search Form === */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 w-full max-w-6xl px-6 z-30 flex flex-col items-center">
          <StaySearchForm />
        </div>

        {/* === LỚP 3b (z-35) — CTA Button với Hiệu ứng Hạt Bụi Ẩn Bên Trong === */}
        {/* === LỚP 3b (z-35) — CTA Button với Hiệu ứng Hạt Bụi Hoàn Hảo === */}
        <div className="absolute inset-0 z-35 flex items-center justify-center pointer-events-none">
          {/* CONTAINER VỎ NGOÀI: Nhận nhiệm vụ làm nền xanh, bo góc, đổ bóng và CẮT BỤI TRÀN (overflow-hidden) */}
          <div className="relative translate-y-24 inline-block group pointer-events-auto overflow-hidden rounded-full bg-green-800 transition-all duration-300 hover:scale-105 shadow-lg">
            {/* HỆ THỐNG HẠT BỤI: Bây giờ mang z-10 (Nằm trên nền xanh nhưng dưới chữ) */}
            {mounted &&
              Array.from({ length: 20 }).map((_, i) => {
                const size = 2.5 + Math.random() * 2; // Kích thước hạt nhỏ mịn hạt lựu
                return (
                  <span
                    key={i}
                    className="dust-particle absolute rounded-full pointer-events-none bg-white z-10"
                    style={{
                      left: `${10 + Math.random() * 80}%`,
                      top: `${40 + Math.random() * 40}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      animationDelay: `-${Math.random() * 2}s`,
                      animationDuration: `${1.0 + Math.random() * 1.2}s`,
                      boxShadow: "0 0 6px #ffffff, 0 0 12px #ffffff", // Trắng sáng chói
                    }}
                  />
                );
              })}

            {/* BUTTON THẬT: Mang z-20, nền TRONG SUỐT (bg-transparent) để lộ bụi bơi phía sau */}
            <button
              onClick={() => router.push("/search-service")}
              type="button"
              className="relative z-20 inline-flex items-center justify-center px-10 py-3.5 font-[family-name:var(--font-archivo)] text-lg font-black text-white bg-transparent uppercase tracking-[0.2em] cursor-pointer whitespace-nowrap"
            >
              Bắt đầu khám phá
              <Sparkles className="ml-2 w-[1.1rem] h-[1.1rem]" />
            </button>
          </div>

          {/* SỬ DỤNG THẺ STYLE TIÊU CHUẨN: Đảm bảo chạy mượt 100% trong Next.js App Router */}
          <style>{`
    /* Trạng thái mặc định: Ẩn hoàn toàn và đứng yên */
    .dust-particle {
      position: absolute;
      opacity: 0;
      will-change: transform, opacity;
    }

    /* CHỈ KHI HOVER vào group vỏ ngoài thì bụi mới kích hoạt animation */
    .group:hover .dust-particle {
      animation-name: flyAroundInside;
      animation-timing-function: ease-in-out;
      animation-iteration-count: infinite;
    }

    /* Quỹ đạo cuộn mượt mà trọn vẹn trong lòng nút bấm */
    @keyframes flyAroundInside {
      0% {
        transform: translate3d(0, 0, 0) scale(0.5);
        opacity: 0;
      }
      20% {
        opacity: 1; /* Phát sáng chói lọi khi bắt đầu bay */
      }
      50% {
        /* Loe rộng sang phải, nâng lên nhẹ */
        transform: translate3d(20px, -12px, 0) scale(1.2); 
      }
      80% {
        /* Cuộn sang trái, nâng cao lên sát viền trên */
        opacity: 0.8;
        transform: translate3d(-20px, -28px, 0) scale(0.8); 
      }
      100% {
        /* Thu nhỏ bóp gọn góc rồi tan biến hoàn toàn trước khi chạm viền capsule */
        transform: translate3d(10px, -42px, 0) scale(0.2); 
        opacity: 0;
      }
    }

    /* --- Leaflet Custom Popup Overrides (Giữ nguyên cho bản đồ) --- */
    .custom-popup .leaflet-popup-content-wrapper {
      background: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
      border-radius: 0 !important;
    }
    .custom-popup .leaflet-popup-content {
      margin: 0 !important;
      width: auto !important;
    }
    .custom-popup .leaflet-popup-close-button {
      color: white !important;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
      z-index: 100;
      top: 12px !important;
      right: 12px !important;
    }
    .custom-popup .leaflet-popup-tip-container {
      margin-top: -2px;
    }
    .custom-popup .leaflet-popup-tip {
      background-color: white !important;
    }
  `}</style>
        </div>
      </div>{" "}
      {/* << CÁI NÀY CHÍNH LÀ THẺ ĐÓNG CỦA HERO CONTAINER BỊ THIẾU */}
      {/* STYLE BLOCK: Đã sửa lại comment chuẩn CSS (dùng /* */
      /* thay vì //) */}
      <style jsx global>{`
        /* Trạng thái mặc định: Ẩn hoàn toàn và đứng yên */
        .dust-particle {
          position: absolute;
          pointer-events: none;
          opacity: 0;
          will-change: transform, opacity;
          animation: none;
        }

        /* CHỈ KHI HOVER vào nút (.group) thì bụi mới kích hoạt bay */
        .group:hover .dust-particle {
          animation-name: flyAroundInside;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        /* Tinh chỉnh biên độ để bụi bay cuộn bên trong lớp nền xanh của nút rồi tự biến mất */
        @keyframes flyAroundInside {
          0% {
            transform: translate3d(0, 0, 0) scale(0.5);
            opacity: 0;
          }
          15% {
            opacity: 0.9; /* Bắt đầu chói sáng rực rỡ */
          }
          50% {
            /* Loe rộng sang phải, dịch chuyển nhẹ lên trên */
            transform: translate3d(25px, -15px, 0) scale(1.1);
          }
          80% {
            /* Cuộn sang trái, nâng cao lên sát mép trên nút */
            opacity: 0.7;
            transform: translate3d(-25px, -30px, 0) scale(0.8);
          }
          100% {
            /* Chạm tới giới hạn trên, thu nhỏ thành điểm sáng biến mất */
            transform: translate3d(10px, -45px, 0) scale(0.3);
            opacity: 0;
          }
        }

        /* --- Leaflet Custom Popup Overrides --- */
        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .custom-popup .leaflet-popup-close-button {
          color: white !important;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
          z-index: 100;
          top: 12px !important;
          right: 12px !important;
        }
        .custom-popup .leaflet-popup-close-button:hover {
          color: #f3f4f6 !important;
        }
        .custom-popup .leaflet-popup-tip-container {
          margin-top: -2px;
        }
        .custom-popup .leaflet-popup-tip {
          background-color: white !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </section>
  );
}
