// src/app/page.tsx
import { Suspense } from "react";
import HeroSection from "@/components/home/hero-section";
import PersonalizedSection from "@/components/home/personalized-section";
import AIRecommendationsSection from "@/components/home/ai-recommendations-section";
import { ExplorePlace } from "@/components/ExplorePlace";
import StayListing from "@/components/StayListings";
// Import component FadeIn mới cập nhật
import FadeIn from "@/components/ui/fade-in";
import { PersonalizedSkeleton } from "@/components/personalized-skeleton";
export default function HomePage() {
  return (
    <>
      {/* Hero Section: Hiện ngay, không cần delay */}
      <HeroSection />

      {/* Personalized Section: Dựa trên sở thích user (Content-based) */}
      <Suspense
        fallback={
          <FadeIn>
            <div className="h-96 w-full animate-pulse bg-gray-200 rounded-xl max-w-7xl mx-auto mt-12" />
          </FadeIn>
        }
      >
        <FadeIn threshold={0.2} delay={100}>
          <Suspense fallback={<PersonalizedSkeleton />}>
            <PersonalizedSection />
          </Suspense>
        </FadeIn>
      </Suspense>

      {/* AI Recommendations Section: Collaborative Filtering (Chỉ hiện cho user có đủ interactions) */}
      <Suspense fallback={null}>
        <FadeIn threshold={0.2} delay={150}>
          <AIRecommendationsSection />
        </FadeIn>
      </Suspense>

      {/* Các section tiếp theo tăng delay để tạo hiệu ứng gợn sóng */}
      <FadeIn
        className="mb-24 flex w-full flex-col items-center px-4 sm:px-8"
        threshold={0.3}
        delay={200}
      >
        <ExplorePlace />
      </FadeIn>

      <FadeIn
        className="mb-24 flex w-full flex-col items-center px-4 sm:px-8"
        threshold={0.3}
        delay={300}
      >
        <StayListing />
      </FadeIn>
    </>
  );
}
