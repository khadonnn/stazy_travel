import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PaymentData } from "@/types/payment";
import type { User } from "@/types/profile";
import { CartItem } from "@repo/types";
// Lưu ý: Đảm bảo type CartItem đã bao gồm các trường hotelId, featuredImage...

interface CartState {
  // --- Giỏ hàng ---
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string | number) => void;
  clearCart: () => void;

  // --- Thanh toán ---
  paymentData: PaymentData;
  setPaymentData: (partialData: Partial<PaymentData>) => void;
  clearPaymentData: () => void;

  // --- Người dùng (Optional - thường dùng Clerk hook trực tiếp thì tốt hơn) ---
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

const initialPaymentData: PaymentData = {
  cardHolder: "",
  cardNumber: "",
  expirationDate: "",
  cvv: "",
  paymentMethod: "credit_card",
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          // Logic: Nếu đã có phòng này rồi thì ghi đè (hoặc bỏ qua tùy business logic)
          // Với đặt phòng khách sạn, thường mỗi lần checkout chỉ 1 phòng.
          // Nên ta có thể clear cũ trước khi add mới, HOẶC cho phép add nhiều.
          // Ở đây giữ logic add nhiều (Cart):
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
          paymentData: initialPaymentData,
        }),

      // --- THANH TOÁN ---
      paymentData: initialPaymentData,

      setPaymentData: (partialData) =>
        set((state) => ({
          paymentData: { ...state.paymentData, ...partialData },
        })),

      clearPaymentData: () =>
        set({
          paymentData: initialPaymentData,
        }),

      // --- USER ---
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "cart-storage", // Lưu giỏ hàng vào LocalStorage
      storage: createJSONStorage(() => localStorage),
      // Giỏ hàng thường không chứa Date object phức tạp nên không cần onRehydrateStorage
    }
  )
);
