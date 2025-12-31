import { z } from "zod";

// ==========================================
// 1. CONSTANTS & ENUMS (Nguồn sự thật duy nhất)
// ==========================================
export const PAYMENT_METHODS = {
  STRIPE: 'stripe',
  VNPAY: 'vnpay',
  MOMO: 'momo',
  ZALOPAY: 'zalopay',
  CREDIT_CARD: 'credit_card', // Thêm cái này cho khớp với code cũ của bạn
} as const;

export type PaymentMethodType = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

// ==========================================
// 2. SCHEMAS (Validation)
// ==========================================

// A. Schema Form Thông tin khách hàng (Bước 2)
export const bookingContactSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập họ tên"),
  email: z.email("Email không hợp lệ"),
  phone: z.string().min(9, "Số điện thoại không hợp lệ"),
  address: z.string().min(1, "Vui lòng nhập địa chỉ"),
  city: z.string().optional(),
});

export type BookingContactInputs = z.infer<typeof bookingContactSchema>;

// B. Schema Form Thanh toán (Bước 3)
const paymentMethodValues = Object.values(PAYMENT_METHODS) as [string, ...string[]];

export const paymentFormSchema = z.object({
  cardHolder: z.string().min(1, "Vui lòng nhập tên chủ thẻ"),
  cardNumber: z
    .string()
    .min(13, "Số thẻ quá ngắn") // Thường thẻ từ 13-19 số
    .max(19, "Số thẻ quá dài")
    .regex(/^[\d\s]+$/, "Số thẻ chỉ được chứa chữ số"),
  expirationDate: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, "Định dạng MM/YY không hợp lệ"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV phải là 3 hoặc 4 chữ số"),
  paymentMethod: z.enum(paymentMethodValues),
});

export type PaymentFormInputs = z.infer<typeof paymentFormSchema>;

// ==========================================
// 3. TYPES CHO CART & BOOKING
// ==========================================

// Định nghĩa lại User rút gọn dùng cho Booking (Tránh import từ DB)
export type BookingUser = {
  id?: string; // Có thể null nếu user chưa login (khách vãng lai)
  email: string;
  name: string;
  phone: string;
  address?: string;
  avatar?: string | null;
};

// Item trong giỏ hàng (Chi tiết hơn cho Hotel)
export type CartItem = {
  id: number;                 // ID phòng/khách sạn
  title: string;              // Tên khách sạn
  slug?: string;              // Để tạo link quay lại trang chi tiết
  price: number;              // Giá 1 đêm
  address?: string;           // Địa chỉ khách sạn
  
  // Hình ảnh
  featuredImage?: string;     // Ảnh đại diện
  galleryImgs?: string[];     // Mảng ảnh (để hiển thị slider trong cart nếu cần)

  // Thông tin đặt phòng
  nights: number;             // Số đêm
  totalGuests: number;        // Tổng số khách (quan trọng để validate sức chứa)
  
  // Nếu bạn cho phép đặt nhiều phòng với ngày khác nhau trong 1 giỏ:
  // checkIn?: Date | string;
  // checkOut?: Date | string;
};

// ==========================================
// 4. TYPES PAYLOAD API
// ==========================================

export type FullPaymentData = {
  // User đặt phòng (đã merge giữa thông tin Login và thông tin Form nhập)
  user: BookingUser; 
  
  // Danh sách phòng
  items: CartItem[]; 
  
  // Thông tin thẻ (chỉ gửi lên nếu server cần xử lý trực tiếp, thường Stripe xử lý ở client)
  paymentData: PaymentFormInputs; 
  
  // Tổng quan đơn hàng
  totalAmount: number;
  currency: string;         // 'VND'
  timestamp: string;
  
  // Nếu giỏ hàng chỉ cho phép 1 khoảng thời gian chung cho tất cả phòng:
  checkInDate: Date | string; 
  checkOutDate: Date | string;
};

// ==========================================
// 5. ZUSTAND STORE TYPES
// ==========================================

export type CartStoreState = {
  items: CartItem[];
  paymentData: PaymentFormInputs | null; // Có thể null nếu chưa nhập
  // hasHydrated: boolean; // Nếu dùng persist
};

export type CartStoreActions = {
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void; // ID number cho khớp với CartItem
  clearCart: () => void;
  setPaymentData: (data: PaymentFormInputs) => void;
  // Các action tính toán (optional vì có thể tính trực tiếp trong component)
  // getTotalPrice: () => number;
};