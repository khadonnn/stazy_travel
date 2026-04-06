"use client";

import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { useAuth, useUser } from "@clerk/nextjs";
import { useCartStore } from "@/store/useCartStore";
import { useBookingStore } from "@/store/useBookingStore";
import {
  FullPaymentData,
  BookingContactInputs,
  PaymentFormInputs,
} from "@repo/types";

// Khởi tạo Stripe Promise (Nên để key trong .env)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

interface StripePaymentFormProps {
  bookingInfo: BookingContactInputs; // Thông tin khách hàng từ Bước 2
}

const StripePaymentForm = ({ bookingInfo }: StripePaymentFormProps) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { items } = useCartStore();
  const { checkInDate, checkOutDate } = useBookingStore();

  //  Hàm này tương đương với đoạn fetch trong ví dụ của bạn
  // Stripe sẽ tự gọi hàm này khi component mount để lấy secret
  const fetchClientSecret = useCallback(async () => {
    const token = await getToken();
    const firstItem = items[0];

    //  Validate email trước khi gửi
    const userEmail =
      bookingInfo.email ||
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      console.error("❌ No valid email found!");
      throw new Error("Vui lòng đăng nhập hoặc nhập email hợp lệ");
    }

    // 1. Chuẩn bị dữ liệu FullPaymentData để gửi lên Backend
    const payload: FullPaymentData = {
      user: {
        id: user?.id, // Có thể undefined nếu là khách vãng lai
        email: userEmail,
        name: bookingInfo.name || user?.fullName || "Khách hàng",
        phone: bookingInfo.phone || "",
        address: `${bookingInfo.address}, ${bookingInfo.city || ""}`,
      },
      items: items,
      // PaymentData để trống vì Stripe tự lo phần thẻ
      paymentData: {} as PaymentFormInputs,
      totalAmount: items.reduce(
        (sum, item) => sum + item.price * (item.nights || 1),
        0,
      ),
      checkInDate: checkInDate
        ? checkInDate.toString()
        : new Date().toISOString(),
      checkOutDate: checkOutDate
        ? checkOutDate.toString()
        : new Date().toISOString(),
      currency: "VND",
      timestamp: new Date().toISOString(),
      hotelId: firstItem?.hotelId, // Lấy ID khách sạn (cần thêm vào CartItem)
      hotelName: firstItem?.name, // Lấy Tên khách sạn (cần thêm vào CartItem)
      hotelImage: firstItem?.featuredImage,
      hotelStars: firstItem?.reviewStar,
      roomId: firstItem?.id,
      roomName: firstItem?.name,
    };

    // 2. Gọi API Backend
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL}/sessions/create-checkout-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Gửi token Clerk để backend check 'shouldBeUser'
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorData = await res.json();
        console.error("Backend Error:", errorData);
        throw new Error(errorData.error || "Failed to create session");
      } else {
        const errorText = await res.text();
        console.error("Backend Error (non-JSON):", errorText);
        throw new Error(
          `Payment service error: ${res.status} ${res.statusText}`,
        );
      }
    }

    const data = await res.json();

    // Trả về clientSecret string cho Provider
    return data.clientSecret;
  }, [items, bookingInfo, checkInDate, checkOutDate, getToken, user]);

  return (
    <div
      id="checkout"
      className="w-full bg-white p-4 rounded-lg border shadow-sm"
    >
      {/* Đây chính là Provider trong ví dụ của bạn.
         Đối với ui_mode: 'embedded', tên chuẩn là EmbeddedCheckoutProvider 
      */}
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        {/* Component này sẽ render ra toàn bộ form nhập thẻ, chọn ngân hàng... */}
        <EmbeddedCheckout className="min-h-[400px]" />
      </EmbeddedCheckoutProvider>
    </div>
  );
};

export default StripePaymentForm;
