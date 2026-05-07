"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

export interface FavoriteHotel {
  id: number;
  hotelId: number;
  createdAt: string;
  hotel: {
    id: number;
    title: string;
    slug: string;
    featuredImage: string;
    galleryImgs: string[];
    address: string;
    price: string;
    reviewStar: number;
    reviewCount: number;
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    amenities: string[];
    saleOff: string | null;
    saleOffPercent: number;
    category: {
      id: number;
      name: string;
      slug: string;
      icon: string | null;
    };
  };
}

interface UseFavoritesReturn {
  favorites: FavoriteHotel[];
  isLoading: boolean;
  error: string | null;
  favoriteHotelIds: Set<number>;
  toggleFavorite: (hotelId: number) => Promise<boolean>;
  isFavorited: (hotelId: number) => boolean;
  removeFavorite: (hotelId: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useFavorites(): UseFavoritesReturn {
  const { isSignedIn, isLoaded } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteHotel[]>([]);
  const [favoriteHotelIds, setFavoriteHotelIds] = useState<Set<number>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!isSignedIn) {
      setFavorites([]);
      setFavoriteHotelIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/favorites?limit=100");
      if (!res.ok) throw new Error("Failed to fetch favorites");
      const data = await res.json();

      if (data.success) {
        setFavorites(data.data);
        setFavoriteHotelIds(
          new Set(data.data.map((f: FavoriteHotel) => f.hotelId)),
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      fetchFavorites();
    }
  }, [isLoaded, fetchFavorites]);

  const isFavorited = useCallback(
    (hotelId: number) => favoriteHotelIds.has(hotelId),
    [favoriteHotelIds],
  );

  const toggleFavorite = useCallback(
    async (hotelId: number): Promise<boolean> => {
      if (!isSignedIn) {
        // Redirect to sign in or show toast
        window.location.href = "/sign-in";
        return false;
      }

      const isCurrentlyFav = favoriteHotelIds.has(hotelId);

      // Optimistic update
      setFavoriteHotelIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFav) {
          next.delete(hotelId);
        } else {
          next.add(hotelId);
        }
        return next;
      });

      try {
        if (isCurrentlyFav) {
          // Remove
          const res = await fetch(`/api/favorites/${hotelId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to remove favorite");
          // Remove from list
          setFavorites((prev) => prev.filter((f) => f.hotelId !== hotelId));
        } else {
          // Add
          const res = await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hotelId }),
          });
          if (!res.ok) throw new Error("Failed to add favorite");
          // Refetch to get full hotel data
          await fetchFavorites();
        }
        return !isCurrentlyFav;
      } catch (err: any) {
        // Revert optimistic update on error
        setFavoriteHotelIds((prev) => {
          const next = new Set(prev);
          if (isCurrentlyFav) {
            next.add(hotelId);
          } else {
            next.delete(hotelId);
          }
          return next;
        });
        setError(err.message);
        return isCurrentlyFav;
      }
    },
    [isSignedIn, favoriteHotelIds, fetchFavorites],
  );

  const removeFavorite = useCallback(
    async (hotelId: number) => {
      // Optimistic update
      setFavoriteHotelIds((prev) => {
        const next = new Set(prev);
        next.delete(hotelId);
        return next;
      });
      setFavorites((prev) => prev.filter((f) => f.hotelId !== hotelId));

      try {
        const res = await fetch(`/api/favorites/${hotelId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to remove favorite");
      } catch (err: any) {
        // Revert on error
        await fetchFavorites();
        setError(err.message);
      }
    },
    [fetchFavorites],
  );

  return {
    favorites,
    isLoading,
    error,
    favoriteHotelIds,
    toggleFavorite,
    isFavorited,
    removeFavorite,
    refetch: fetchFavorites,
  };
}
