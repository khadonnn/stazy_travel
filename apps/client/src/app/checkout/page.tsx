"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useBookingStore } from "@/store/useBookingStore";
import StripePaymentForm from "@/components/StripePaymentForm";
import { Loader2 } from "lucide-react";

// Định nghĩa kiểu dữ liệu trả về từ API
type HotelData = {
  id: number;
  title: string;
  price: number;
  address: string;
  featuredImage: string;
  image?: string;
  rating?: number;
  reviewStar?: number;
};

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const { addItem, items, clearCart } = useCartStore();
  const { setDate, setGuests } = useBookingStore();

  // Thêm state lỗi để hiển thị rõ ràng hơn
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initCheckout = async () => {
      const hotelId = searchParams?.get("hotelId");
      const start = searchParams?.get("start");
      const end = searchParams?.get("end");
      const adults = searchParams?.get("adults");

      if (!hotelId) {
        setError("Thiếu mã khách sạn (hotelId) trên URL");
        setLoading(false);
        return;
      }

      try {
        // 🔥 SỬA QUAN TRỌNG: Dùng đường dẫn tương đối, không hardcode localhost:3000
        const res = await fetch(`/api/hotels/${hotelId}`);

        if (!res.ok) {
          throw new Error(`Lỗi API: ${res.statusText}`);
        }

        const hotelData: HotelData = await res.json();

        if (hotelData) {
          // Xóa giỏ hàng cũ để tránh trùng lặp
          clearCart();

          // Tính toán số đêm
          const startDate = start ? new Date(start) : new Date();
          const endDate = end
            ? new Date(end)
            : new Date(startDate.getTime() + 86400000); // +1 ngày

          // Tính khoảng cách ngày an toàn
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const nights = diffDays > 0 ? diffDays : 1;

          // Thêm vào Store
          addItem({
            id: hotelData.id,
            hotelId: hotelData.id,
            title: hotelData.title,
            name: hotelData.title,
            price: hotelData.price,
            featuredImage:
              hotelData.featuredImage || hotelData.image || "/placeholder.jpg",
            reviewStar: hotelData.reviewStar || hotelData.rating || 5,
            nights: nights,
            totalGuests: parseInt(adults || "2"),
            address: hotelData.address,
            slug: hotelData.id.toString(),
          });

          // Cập nhật Booking Store
          setDate({ from: startDate, to: endDate });
          setGuests({
            adults: parseInt(adults || "2"),
            children: 0,
            infants: 0,
          });
        } else {
          setError("Không tìm thấy dữ liệu khách sạn trong Database");
        }
      } catch (err: any) {
        console.error("Lỗi lấy thông tin phòng:", err);
        setError(err.message || "Có lỗi xảy ra khi tải thông tin");
      } finally {
        setLoading(false);
      }
    };

    initCheckout();
  }, [searchParams, addItem, clearCart, setDate, setGuests]);

  // --- RENDER UI ---

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin w-10 h-10 text-green-600" />
        <p className="text-gray-500">Đang chuẩn bị đơn hàng từ AI...</p>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <div className="text-red-500 font-bold text-xl">
          ⚠️ Lỗi: {error || "Không tìm thấy thông tin phòng"}
        </div>
        <p>Vui lòng thử tìm kiếm và đặt lại.</p>
        {/* Debug ID để bạn dễ kiểm tra */}
        <p className="text-sm text-gray-400">
          Hotel ID requested: {searchParams?.get("hotelId")}
        </p>
      </div>
    );
  }

  // Nếu thành công, hiển thị Form
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10">
      <h1 className="text-2xl font-bold mb-6">Xác nhận & Thanh toán</h1>

      {/* Card tóm tắt thông tin phòng */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 p-6 border border-gray-100 shadow-lg rounded-xl bg-white">
        <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden bg-gray-200 shrink-0">
          <img
            src={items[0]?.featuredImage}
            className="w-full h-full object-cover"
            alt="Room"
            onError={(e) =>
              (e.currentTarget.src =
                "https://placehold.co/600x400?text=No+Image")
            }
          />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-bold text-lg text-gray-800">{items[0]?.name}</h3>
          <p className="text-gray-500 text-sm">📍 {items[0]?.address}</p>
          <div className="flex gap-4 text-sm mt-2">
            <div className="bg-green-50 text-green-700 px-3 py-1 rounded-md border border-green-200">
              Check-in: <b>{searchParams?.get("start")}</b>
            </div>
            <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-md border border-orange-200">
              {items[0]?.nights} đêm • {items[0]?.totalGuests} khách
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col justify-center">
          <span className="text-gray-500 text-sm">Tổng thanh toán</span>
          <span className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(items[0]!.price * items[0]!.nights)}
          </span>
        </div>
      </div>

      {/* Form Stripe */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
        <h3 className="font-semibold mb-4 text-lg">Thông tin thẻ tín dụng</h3>
        <StripePaymentForm
          bookingInfo={{
            name: "",
            email: "",
            phone: "",
            address: "",
            city: "",
          }}
        />
      </div>
    </div>
  );
}
