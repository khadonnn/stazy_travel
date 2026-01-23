// src/components/home/hero-section.tsx
"use client"; // ✅ Component này chứa tương tác nên dùng "use client"

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import StaySearchForm from "@/components/StaySearchForm"; // Import Form vào đây

export default function HeroSection() {
  const router = useRouter();

  return (
    <div className="mb-20 md:px-0 2xl:px-10 relative mt-10 mx-auto ">
      <div className="relative overflow-hidden rounded-3xl">
        {/* Background image */}
        <div className="aspect-video relative w-full">
          <Image
            src={"/assets/bg2.jpg"}
            alt="hero"
            className="rounded-xl object-cover object-center w-full h-full"
            fill
          />
        </div>

        {/* Overlay content */}
        <div className="absolute inset-x-0 top-[15%] mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="flex flex-col gap-y-5 xl:gap-y-8">
            <span className="font-semibold text-neutral-900 sm:text-lg md:text-xl">
              Trải nghiệm kỳ nghỉ tuyệt vời cùng Stazy
            </span>
            <h2 className="text-4xl leading-[1.15] font-bold text-black dark:text-white md:text-5xl lg:text-6xl xl:text-7xl">
              <span className="relative inline-block px-3 py-1 rounded-xl bg-white/5 dark:bg-black/10 backdrop-blur-sm">
                Vi vu mê say
              </span>
              <br />
              <span className="relative inline-block px-3 py-1 rounded-xl bg-white/5 dark:bg-black/10 backdrop-blur-sm">
                Chạm là đặt ngay
              </span>
            </h2>
          </div>

          <button
            onClick={() => router.push("/search-service")}
            type="button"
            className="mt-10 sm:mt-20 sm:text-lg relative inline-flex items-center justify-center px-6 py-3 font-medium rounded-full bg-primary text-white hover:bg-primary/80 focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all duration-300 ease-in-out cursor-pointer"
          >
            Bắt đầu khám phá <Sparkles size={20} className="ml-2" />
          </button>
        </div>
      </div>

      {/* Search Form nằm đè lên Hero */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-8 w-full max-w-6xl px-4 sm:px-8 z-20 ">
        <StaySearchForm />
      </div>
    </div>
  );
}
