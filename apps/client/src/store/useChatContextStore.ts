import { create } from "zustand";

export type CurrentHotelContext = {
  id: number;
  name: string;
  address: string;
  price: number;
  rating: number;
  image?: string;
  slug: string;
  destination?: string;
  category?: string;
  amenities?: string[];
  description?: string;
  map?: { lat: number; lng: number } | null;
};

interface ChatContextState {
  /** Current hotel context when user is on a hotel detail page */
  currentHotel: CurrentHotelContext | null;
  /** Set the current hotel context */
  setCurrentHotel: (hotel: CurrentHotelContext | null) => void;
  /** Clear hotel context */
  clearHotelContext: () => void;
}

export const useChatContextStore = create<ChatContextState>()((set) => ({
  currentHotel: null,
  setCurrentHotel: (hotel) => set({ currentHotel: hotel }),
  clearHotelContext: () => set({ currentHotel: null }),
}));
