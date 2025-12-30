// packages/types/src/cart.ts

import { User } from "@repo/product-db";
import z from "zod";

// 1. Enum Phương thức thanh toán
export type PaymentMethod = 'stripe' | 'vnpay' | 'momo' | 'zalopay';
// 2. Schema Validate Form Thanh Toán (Zod)
export const paymentFormSchema = z.object({
  cardHolder: z.string().min(1, "Vui lòng nhập tên chủ thẻ"),
  cardNumber: z
    .string()
    .min(1, "Vui lòng nhập số thẻ")
    .regex(/^[\d\s]+$/, "Số thẻ chỉ được chứa chữ số"), // Regex cơ bản
  expirationDate: z.string().min(1, "Vui lòng nhập hạn sử dụng (MM/YY)"),
  cvv: z.string().min(3, "CVV không hợp lệ").max(4, "CVV không hợp lệ"),
  paymentMethod:  z.enum(['stripe', 'vnpay', 'momo', 'zalopay'] as const),
});

// Type được infer từ Zod để dùng trong React Hook Form
export type PaymentFormInputs = z.infer<typeof paymentFormSchema>;

// 3. Định nghĩa Item trong giỏ hàng (CartItem) cho Booking
// Thay vì size/color, booking cần số đêm (nights), ngày checkin/out (nếu lưu per item)
export type CartItem = {
  id: string | number;       // ID của phòng hoặc khách sạn
  title: string;             // Tên khách sạn/phòng
  image?: string;            // Ảnh thumbnail
  price: number;             // Giá 1 đêm
  nights: number;            // Số đêm lưu trú
  // Các thông tin bổ sung nếu cần
  hotelId?: string | number; 
  address?: string;
};

// 4. Type PaymentData lưu trong Store (giống PaymentFormInputs nhưng có thể mở rộng)
export type PaymentData = PaymentFormInputs;

// 5. Type FullPaymentData gửi xuống API (Payload)
// Dùng trong handlePaymentForm ở frontend
export type FullPaymentData = {
  user: User | null;          // Thông tin người dùng
  items: CartItem[];          // Danh sách phòng đặt
  paymentData: PaymentFormInputs; // Thông tin thẻ/thanh toán
  totalAmount: number;        // Tổng tiền
  checkInDate: Date | string; // Ngày check-in toàn cục
  checkOutDate: Date | string;// Ngày check-out toàn cục
  currency: string;           // 'VND'
  timestamp: string;          // Thời gian tạo đơn
};

// 6. (Optional) Type cho Store State nếu muốn strict typing ở package chung
export type CartStoreState = {
  items: CartItem[];
  paymentData: PaymentData;
  user: User | null;
};

export type CartStoreActions = {
  addItem: (item: CartItem) => void;
  removeItem: (id: string | number) => void;
  clearCart: () => void;
  setPaymentData: (partialData: Partial<PaymentData>) => void;
  clearPaymentData: () => void;
  setUser: (user: User) => void;
  clearUser: () => void;
};