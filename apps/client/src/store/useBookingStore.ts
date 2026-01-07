import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DateRange } from "react-day-picker";
import type { BookingFormInputs } from "@/types/cart"; // Đảm bảo đường dẫn đúng

interface BookingState {
  // --- State cho Ngày & Khách ---
  date: DateRange | undefined;
  checkInDate: Date | undefined;
  checkOutDate: Date | undefined;
  guests: {
    adults: number;
    children: number;
    infants: number;
  };

  // --- State MỚI: Thông tin khách hàng (Contact Info) ---
  bookingDetails: BookingFormInputs | null;

  // --- Actions ---
  setDate: (date: DateRange | undefined) => void;
  setGuests: (guests: BookingState["guests"]) => void;
  setBookingDetails: (details: BookingFormInputs) => void;

  clearDate: () => void;
  clearGuests: () => void;
  resetStore: () => void; // Reset toàn bộ sau khi Booking thành công
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      // 1. Khởi tạo giá trị ban đầu
      date: undefined,
      checkInDate: undefined,
      checkOutDate: undefined,
      guests: { adults: 2, children: 0, infants: 0 },
      bookingDetails: null,

      // 2. Các hàm cập nhật
      setDate: (date) =>
        set({
          date,
          checkInDate: date?.from,
          checkOutDate: date?.to,
        }),

      setGuests: (guests) => set({ guests }),

      setBookingDetails: (details) => set({ bookingDetails: details }),

      // 3. Các hàm xóa / Reset
      clearDate: () =>
        set({
          date: undefined,
          checkInDate: undefined,
          checkOutDate: undefined,
        }),

      clearGuests: () =>
        set({
          guests: { adults: 1, children: 0, infants: 0 },
        }),

      resetStore: () =>
        set({
          date: undefined,
          checkInDate: undefined,
          checkOutDate: undefined,
          guests: { adults: 2, children: 0, infants: 0 },
          bookingDetails: null,
        }),
    }),
    {
      name: "booking-storage", // Tên key trong LocalStorage
      storage: createJSONStorage(() => localStorage),

      // 🔥 QUAN TRỌNG: Tự động chuyển chuỗi JSON thành Date Object khi load lại trang
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (state.date?.from && typeof state.date.from === "string") {
          state.date.from = new Date(state.date.from);
        }
        if (state.date?.to && typeof state.date.to === "string") {
          state.date.to = new Date(state.date.to);
        }
        if (state.checkInDate && typeof state.checkInDate === "string") {
          state.checkInDate = new Date(state.checkInDate);
        }
        if (state.checkOutDate && typeof state.checkOutDate === "string") {
          state.checkOutDate = new Date(state.checkOutDate);
        }
      },
    }
  )
);
