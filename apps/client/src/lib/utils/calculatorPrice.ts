import type { DateRange } from 'react-day-picker';

export interface CalculatorPriceParams {
    pricePerNight: number;
    date: DateRange | undefined;
}

export const calculatorPrice = ({
    pricePerNight,
    date,
}: CalculatorPriceParams) => {
    // Tính số đêm
    const nights =
        date?.from && date?.to
            ? Math.max(
                  1,
                  Math.ceil(
                      (date.to.getTime() - date.from.getTime()) /
                          (1000 * 60 * 60 * 24),
                  ),
              )
            : 1;

    // Tổng tiền
    const total = pricePerNight * nights;

    return {
        nights,
        total,
    };
};

// Additional utility functions
export const calculateRoomPrice = (priceString: string, nights: number): number => {
    const basePrice = Number(priceString.replace(/[^\d]/g, '')) || 1500000;
    return Math.round(basePrice * nights);
};

export const extractPrice = (price: string | number | undefined): number => {
    if (!price) return 0;
    if (typeof price === 'number') return price;
    return Number(price.replace(/[^\d]/g, '')) || 0;
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
};

export const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

export const generateBookingNumber = (index: number): string => {
    return `BK-2025-${String(index + 1).padStart(4, '0')}`;
};



export const calculateNights = (checkIn: Date | string, checkOut: Date | string): number => {
    const checkInDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
    const checkOutDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;
    return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
};
