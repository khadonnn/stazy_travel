import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DateRange } from 'react-day-picker';
import type { BookingFormInputs } from '@/types/cart'; // Import kiểu dữ liệu của Form

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

    // --- State MỚI: Thông tin khách hàng ---
    bookingDetails: BookingFormInputs | null;

    // --- Actions ---
    setDate: (date: DateRange | undefined) => void;
    setGuests: (guests: BookingState['guests']) => void;
    
    // Action MỚI: Lưu thông tin form
    setBookingDetails: (details: BookingFormInputs) => void;

    clearDate: () => void;
    clearGuests: () => void;
    resetStore: () => void; // Reset toàn bộ store khi đặt xong
}

export const useBookingStore = create<BookingState>()(
    persist(
        (set) => ({
            // 1. Khởi tạo giá trị ban đầu
            date: undefined,
            checkInDate: undefined,
            checkOutDate: undefined,
            guests: { adults: 2, children: 1, infants: 1 },
            bookingDetails: null, // Mặc định là null

            // 2. Các hàm cập nhật
            setDate: (date) =>
                set({
                    date,
                    checkInDate: date?.from,
                    checkOutDate: date?.to,
                }),

            setGuests: (guests) => set({ guests }),

            // Hàm lưu thông tin khách hàng từ Form
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
                    guests: { adults: 0, children: 0, infants: 0 },
                }),

            // Dùng hàm này khi Thanh toán thành công để xóa sạch dữ liệu
            resetStore: () => set({
                date: undefined,
                checkInDate: undefined,
                checkOutDate: undefined,
                guests: { adults: 2, children: 1, infants: 1 },
                bookingDetails: null
            })
        }),
        {
            name: 'booking-storage', // Tên key trong LocalStorage
            storage: createJSONStorage(() => localStorage),
            // (Tùy chọn) Nếu Date bị lỗi khi load lại trang (do JSON biến Date thành string),
            // bạn có thể cần xử lý thêm onRehydrateStorage, nhưng cơ bản bookingDetails là quan trọng nhất ở đây.
        }
    )
);