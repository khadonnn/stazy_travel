// src/app/page.tsx
import { Suspense } from "react";
import HeroSection from "@/components/home/hero-section";
import PersonalizedSection from "@/components/home/personalized-section";
import AIRecommendationsSection from "@/components/home/ai-recommendations-section";
import { ExplorePlace } from "@/components/ExplorePlace";
import StayListing from "@/components/StayListings";
import FadeIn from "@/components/ui/fade-in";
import { PersonalizedSkeleton } from "@/components/personalized-skeleton";

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* Các khối lớn này không có list bên trong, cứ giữ FadeIn bình thường */}
      <Suspense
        fallback={
          <FadeIn>
            <div className="h-96 w-full animate-pulse bg-gray-200 rounded-xl max-w-7xl mx-auto mt-12" />
          </FadeIn>
        }
      >
        <FadeIn threshold={0.2}>
          <Suspense fallback={<PersonalizedSkeleton />}>
            <PersonalizedSection />
          </Suspense>
        </FadeIn>
      </Suspense>

      <Suspense fallback={null}>
        <FadeIn threshold={0.2}>
          <AIRecommendationsSection />
        </FadeIn>
      </Suspense>

      {/* ĐÃ XOÁ FADE-IN VÀ THAY BẰNG DIV BÌNH THƯỜNG */}
      <div className="mb-24 flex w-full flex-col items-center px-4 sm:px-8">
        <ExplorePlace />
      </div>

      {/* ĐÃ XOÁ FADE-IN VÀ THAY BẰNG DIV BÌNH THƯỜNG */}
      <div className="mb-24 flex w-full flex-col items-center px-4 sm:px-8">
        <StayListing />
      </div>
    </>
  );
}
