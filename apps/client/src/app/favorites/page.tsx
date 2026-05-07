"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { useFavoritesContext } from "@/contexts/FavoritesContext";
import StayCard from "@/components/StayCard";
import type { HotelFrontend } from "@repo/types";

export default function FavoritesPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { favorites, isLoading, removeFavorite } = useFavoritesContext();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-4" />
        <p className="text-neutral-500 dark:text-neutral-400">
          Đang tải danh sách yêu thích...
        </p>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return null; // Will redirect via useEffect
  }

  // Empty state
  if (favorites.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6">
          <Heart className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
        </div>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
          Chưa có khách sạn yêu thích
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8 text-center max-w-md">
          Hãy nhấn vào biểu tượng trái tim trên các khách sạn bạn thích để lưu
          lại và xem lại sau.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-full font-medium transition-colors"
        >
          Khám phá khách sạn
        </button>
      </div>
    );
  }

  // Convert favorite data to Partial<HotelFrontend> format for StayCard
  const favoriteHotels: Partial<HotelFrontend>[] = favorites.map((fav) => ({
    id: fav.hotel.id,
    title: fav.hotel.title,
    slug: fav.hotel.slug,
    featuredImage: fav.hotel.featuredImage,
    galleryImgs: fav.hotel.galleryImgs,
    address: fav.hotel.address,
    price: Number(fav.hotel.price),
    reviewStar: fav.hotel.reviewStar,
    reviewCount: fav.hotel.reviewCount,
    maxGuests: fav.hotel.maxGuests,
    bedrooms: fav.hotel.bedrooms,
    bathrooms: fav.hotel.bathrooms,
    amenities: fav.hotel.amenities,
    saleOff: fav.hotel.saleOff || undefined,
    saleOffPercent: fav.hotel.saleOffPercent,
    categoryId: fav.hotel.category.id,
    like: true,
  }));

  return (
    <div className="container mx-auto px-4 py-8 mt-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-7 w-7 text-red-500 fill-red-500" />
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Danh sách yêu thích
          </h1>
        </div>
        <p className="text-neutral-500 dark:text-neutral-400">
          {favorites.length} khách sạn đã lưu
        </p>
      </div>

      {/* Grid of favorite hotels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favoriteHotels.map((hotel) => (
          <StayCard key={hotel.id} data={hotel} />
        ))}
      </div>
    </div>
  );
}
