//  Các type dành riêng cho thanh toán — dễ tìm, dễ reuse
export type ItemPayment = {
    id: string;
    name: string;
    price: number;
    quantity: number;
};

export type UserPayment = {
    id: string;
    name: string;
    email: string;
};

export type PaymentFormInputs = {
    cardHolder: string;
    cardNumber: string;
    expirationDate: string;
    cvv: string;
    paymentMethod: 'credit_card' | 'momo' | 'zalopay' | 'vnpay' | 'stripe';
};

import type { User } from '@/types/profile';
import type { StayDataType } from '@/types/stay';

//  Giỏ hàng: giữ nguyên
export interface CartItem extends StayDataType {
    nights: number;
    totalGuests: number;
}

//  THANH TOÁN: KHÔNG DÙNG OPTIONAL — PHẢI CÓ GIÁ TRỊ MẶC ĐỊNH
export interface PaymentData {
    cardHolder: string;
    cardNumber: string;
    expirationDate: string;
    cvv: string;
    paymentMethod: 'credit_card' | 'momo' | 'zalopay' | 'vnpay' | 'stripe';
}

//  Tổng thể dữ liệu thanh toán để gửi API
export type FullPaymentData = {
    user: User;
    items: CartItem[];
    paymentData: PaymentData;
    totalAmount: number;
    currency: 'VND';
    checkInDate: Date;
    checkOutDate: Date;
    timestamp: string;
};
