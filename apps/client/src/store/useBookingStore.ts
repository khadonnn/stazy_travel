import { create } from 'zustand';
import type { DateRange } from 'react-day-picker';

interface BookingState {
    date: DateRange | undefined;
    checkInDate: Date | undefined;
    checkOutDate: Date | undefined;
    guests: {
        adults: number;
        children: number;
        infants: number;
    };
    setDate: (date: DateRange | undefined) => void;
    setGuests: (guests: BookingState['guests']) => void;
    clearDate: () => void;
    clearGuests: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
    date: undefined,
    checkInDate: undefined,
    checkOutDate: undefined,
    guests: { adults: 2, children: 1, infants: 1 },

    setDate: (date) =>
        set({
            date,
            checkInDate: date?.from,
            checkOutDate: date?.to,
        }),

    setGuests: (guests) => set({ guests }),

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
}));
