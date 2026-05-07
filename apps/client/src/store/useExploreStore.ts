import { create } from "zustand";

export type ExploreHotel = {
  id: number;
  title: string;
  price: number;
  address: string;
  rating: number;
  image?: string;
  slug: string;
  map?: { lat: number; lng: number } | null;
  description?: string;
  amenities?: string[];
  suitableFor?: string[];
  accessibility?: string[];
  [key: string]: any;
};

/** Serializable message for transfer between pages */
export type ChatMessage = {
  id: number;
  text: string;
  sender: "ai" | "user" | "admin";
  imagePreview?: string | null;
  data?: {
    hotels?: ExploreHotel[];
    bookingLink?: string;
  };
  suggestions?: string[];
};

interface ExploreState {
  /** Hotels to display on the explore page map */
  hotels: ExploreHotel[];
  /** Chat messages transferred from ChatBox widget */
  messages: ChatMessage[];
  /** Currently active hotel ID (shared between list and map) */
  activeHotelId: number | null;
  /** Set hotels */
  setHotels: (hotels: ExploreHotel[]) => void;
  /** Set chat messages */
  setMessages: (messages: ChatMessage[]) => void;
  /** Set active hotel ID (clicking list item or map marker) */
  setActiveHotelId: (id: number | null) => void;
  /** Clear all data */
  clearAll: () => void;
}

export const useExploreStore = create<ExploreState>()((set) => ({
  hotels: [],
  messages: [],
  activeHotelId: null,
  setHotels: (hotels) => set({ hotels }),
  setMessages: (messages) => set({ messages }),
  setActiveHotelId: (id) => set({ activeHotelId: id }),
  clearAll: () => set({ hotels: [], messages: [], activeHotelId: null }),
}));
