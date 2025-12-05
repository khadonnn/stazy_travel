import { create } from 'zustand';
import type { CartItem, PaymentData } from '@/types/payment';
import type { User } from '@/types/profile';
//  Định nghĩa UserPayment (đã được định nghĩa trước đó)
// interface User {
//     id: string;
//     name: string;
//     email: string;
// }

interface CartState {
    // Giỏ hàng
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: string | number) => void;
    clearCart: () => void;

    // Thanh toán — khởi tạo đầy đủ, không có optional
    paymentData: PaymentData;
    setPaymentData: (partialData: Partial<PaymentData>) => void;
    clearPaymentData: () => void;

    //  THÊM: Thông tin người dùng (có thể lấy từ auth)
    user: User | null;
    setUser: (user: User) => void;
    clearUser: () => void;
}

export const useCartStore = create<CartState>((set) => ({
    items: [],
    addItem: (item) =>
        set((state) => {
            const exists = state.items.find((i) => i.id === item.id);
            if (exists) return state;
            return { items: [...state.items, item] };
        }),
    removeItem: (id) =>
        set((state) => ({
            items: state.items.filter((i) => i.id !== id),
        })),
    clearCart: () =>
        set({
            items: [],
            paymentData: {
                cardHolder: '',
                cardNumber: '',
                expirationDate: '',
                cvv: '',
                paymentMethod: 'credit_card',
            },
        }),

    //  THANH TOÁN: KHỞI TẠO ĐẦY ĐỦ — KHÔNG CÓ OPTIONAL
    paymentData: {
        cardHolder: '', // ✅ Mặc định rỗng — để người dùng nhập
        cardNumber: '',
        expirationDate: '',
        cvv: '',
        paymentMethod: 'credit_card',
    },
    setPaymentData: (partialData) =>
        set((state) => ({
            paymentData: { ...state.paymentData, ...partialData },
        })),
    clearPaymentData: () =>
        set({
            paymentData: {
                cardHolder: '',
                cardNumber: '',
                expirationDate: '',
                cvv: '',
                paymentMethod: 'credit_card',
            },
        }),

    //  NGƯỜI DÙNG
    user: null,
    setUser: (user) => set({ user }),
    clearUser: () => set({ user: null }),
}));
