import { z } from "zod";

// ==========================================
// 1. CONSTANTS & ENUMS
// ==========================================
export const PAYMENT_METHODS = {
  STRIPE: "stripe",
  VNPAY: "vnpay",
  MOMO: "momo",
  ZALOPAY: "zalopay",
  CREDIT_CARD: "credit_card",
} as const;

export type PaymentMethodType =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

// ==========================================
// 2. SCHEMAS (Validation)
// ==========================================

// A. Schema Form Thông tin khách hàng
export const bookingContactSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập họ tên"),
  email: z.email("Email không hợp lệ"),
  phone: z.string().min(9, "Số điện thoại không hợp lệ"),
  address: z.string().min(1, "Vui lòng nhập địa chỉ"),
  city: z.string().optional(),
});

export type BookingContactInputs = z.infer<typeof bookingContactSchema>;

// B. Schema Form Thanh toán
const paymentMethodValues = Object.values(PAYMENT_METHODS) as [
  string,
  ...string[],
];

export const paymentFormSchema = z.object({
  cardHolder: z.string().min(1, "Vui lòng nhập tên chủ thẻ"),
  cardNumber: z
    .string()
    .min(13, "Số thẻ quá ngắn")
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

export type BookingUser = {
  id?: string;
  email: string;
  name: string;
  phone: string;
  address?: string;
  avatar?: string | null;
};

/**
 * Item trong giỏ hàng
 * Đã sửa để khớp field với Prisma Hotel Model giúp việc map dữ liệu dễ dàng hơn
 */
export type CartItem = {
  // --- A. THÔNG TIN PHÒNG (Sản phẩm con - Unique ID của giỏ hàng) ---
  id: number; // Room ID (Dùng làm key để xóa/sửa trong cart)
  name: string; // Tên phòng (VD: "Standard Room")
  price: number; // Giá phòng (Decimal convert sang number)

  // --- B. THÔNG TIN KHÁCH SẠN (Lấy từ Prisma Hotel Model) ---
  hotelId: number; // Hotel ID
  title: string; // Tên khách sạn (Khớp Hotel.title)
  slug: string; // Slug khách sạn (Khớp Hotel.slug)
  featuredImage: string; // Ảnh đại diện (Khớp Hotel.featuredImage)
  reviewStar: number; // Số sao (Khớp Hotel.reviewStar)
  address: string; // Địa chỉ (Khớp Hotel.address)
  nameRoom?: string; // Tên phòng, ví dụ "Standard Room"

  // --- C. THÔNG TIN ĐẶT ---
  nights: number; // Số đêm
  totalGuests: number; // Tổng số khách

  // Các field optional khác nếu cần
  checkIn?: string;
  checkOut?: string;
};

// ==========================================
// 4. TYPES PAYLOAD API
// ==========================================

export type FullPaymentData = {
  user: BookingUser;
  items: CartItem[];

  // 👇 Các trường này gửi lên để Backend nhét vào Metadata Stripe
  // Map từ CartItem ra
  hotelId?: number;
  hotelName?: string; // Map từ item.title
  hotelImage?: string; // Map từ item.featuredImage
  hotelStars?: number; // Map từ item.reviewStar

  roomId?: number; // Map từ item.id
  roomName?: string; // Map từ item.name

  // Thông tin thanh toán
  paymentData: PaymentFormInputs;
  totalAmount: number;
  currency: string;
  timestamp: string;

  checkInDate: Date | string;
  checkOutDate: Date | string;
};

// ==========================================
// 5. ZUSTAND STORE TYPES
// ==========================================

export type CartStoreState = {
  items: CartItem[];
  paymentData: PaymentFormInputs | null;
  user: BookingUser | null; // Thêm user vào state store nếu cần
};

export type CartStoreActions = {
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  setPaymentData: (data: Partial<PaymentFormInputs>) => void; // Partial để update từng phần
  clearPaymentData: () => void;
  setUser: (user: BookingUser) => void;
  clearUser: () => void;
};
