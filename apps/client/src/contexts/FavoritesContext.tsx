"use client";

import { createContext, useContext, ReactNode } from "react";
import { useFavorites, FavoriteHotel } from "@/hooks/useFavorites";

interface FavoritesContextType {
  favorites: FavoriteHotel[];
  isLoading: boolean;
  error: string | null;
  favoriteHotelIds: Set<number>;
  toggleFavorite: (hotelId: number) => Promise<boolean>;
  isFavorited: (hotelId: number) => boolean;
  removeFavorite: (hotelId: number) => Promise<void>;
  refetch: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const favoritesData = useFavorites();

  return (
    <FavoritesContext.Provider value={favoritesData}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error(
      "useFavoritesContext must be used within a FavoritesProvider",
    );
  }
  return context;
}

// Optional: Hook that returns safe defaults when outside provider
export function useFavoritesSafe() {
  const context = useContext(FavoritesContext);
  if (!context) {
    return {
      favorites: [] as FavoriteHotel[],
      isLoading: false,
      error: null,
      favoriteHotelIds: new Set<number>(),
      toggleFavorite: async () => false,
      isFavorited: () => false,
      removeFavorite: async () => {},
      refetch: async () => {},
    };
  }
  return context;
}
