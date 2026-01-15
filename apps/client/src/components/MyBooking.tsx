"use client";

import React, { useState, useEffect } from "react";
import { Eye, Calendar, RefreshCw, MapPin } from "lucide-react"; // Thêm MapPin để icon địa chỉ đẹp hơn
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/useAuthStore";
import { bookingApi } from "@/lib/api/booking";

interface UserBooking {
  id: number;
  booking_number: string;
  hotel_id: number;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  status: string;
  total_amount: number;
  price_per_night: number;
  created_at: string;
  updated_at: string;
  // Đảm bảo API trả về object hotel đầy đủ
  hotel: {
    id: number;
    title: string;
    slug: string;
    featured_image: string;
    address: string;
    price_per_night: number;
  } | null; // Cho phép null để tránh lỗi crash nếu API thiếu data
  payments?: Array<{
    id: number;
    status: string;
    amount: number;
    created_at: string;
  }>;
}

const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "Đã thanh toán";
      case "pending":
        return "Chờ thanh toán";
      case "failed":
        return "Thất bại";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(
        status
      )}`}
    >
      {getStatusText(status)}
    </span>
  );
};

const MyBooking: React.FC = () => {
  const router = useRouter();
  const { authUser } = useAuthStore();
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPaymentStatus = (booking: UserBooking) => {
    if (booking.payments && booking.payments.length > 0) {
      const latestPayment = booking.payments.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      return latestPayment?.status === "completed"
        ? "paid"
        : latestPayment?.status === "failed"
          ? "failed"
          : "pending";
    }
    return "pending";
  };

  const loadBookings = async () => {
    if (!authUser) {
      setError("Vui lòng đăng nhập để xem lịch sử đặt phòng");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await bookingApi.getUserBookings({
        per_page: 50,
        sort_by: "created_at",
        sort_order: "desc",
      });

      if (response.success && response.data) {
        let bookingData;
        if (Array.isArray(response.data)) {
          bookingData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          bookingData = response.data.data;
        } else {
          bookingData = [];
        }
        setBookings(bookingData);
        setLastRefreshed(new Date());
      } else {
        throw new Error("Invalid API response");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Không thể tải lịch sử đặt phòng"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // 🔥 FIX 1: Logic chuyển trang dùng Slug (ưu tiên) hoặc ID
  const handleViewHotel = (hotel: UserBooking["hotel"], fallbackId: number) => {
    if (hotel && hotel.slug) {
      router.push(`/hotels/${hotel.slug}`);
    } else {
      // Fallback nếu không có slug thì dùng ID
      router.push(`/hotels/${fallbackId}`);
    }
  };

  const handleRefresh = async () => {
    await loadBookings();
  };

  // ... (Giữ nguyên các phần UI loading/error/not-logged-in) ...
  if (!authUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        Vui lòng đăng nhập.
      </div>
    );
  }

  if (loading && bookings.length === 0) {
    return <div className="max-w-7xl mx-auto px-4 py-8">Đang tải...</div>;
  }

  if (error && bookings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Lịch sử đặt phòng
          </h1>
          <p className="text-gray-600 mt-2">
            Quản lý và theo dõi tất cả các đặt phòng của bạn
            {lastRefreshed && (
              <span className="text-sm text-gray-400 ml-2">
                (Cập nhật: {lastRefreshed.toLocaleTimeString("vi-VN")})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Calendar className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Chưa có đặt phòng nào
          </h3>
          <button
            onClick={() => router.push("/hotels")}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Khám phá khách sạn
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã đặt phòng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách sạn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chi tiết
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.booking_number || `#${booking.id}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {authUser?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {authUser?.email}
                      </div>
                    </td>

                    {/* 🔥 FIX 2: Hiển thị đúng tên và địa chỉ khách sạn */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-[200px]">
                        <div
                          className="text-sm font-bold text-gray-900 truncate"
                          title={booking.hotel?.title}
                        >
                          {booking.hotel?.title ||
                            `Hotel ID: ${booking.hotel_id}`}
                        </div>

                        {booking.hotel?.address && (
                          <div
                            className="flex items-start text-xs text-gray-500 mt-1"
                            title={booking.hotel.address}
                          >
                            <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                            <span className="truncate">
                              {booking.hotel.address}
                            </span>
                          </div>
                        )}

                        {booking.price_per_night && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatCurrency(booking.price_per_night)}/đêm
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        In:{" "}
                        {booking.check_in_date
                          ? formatDate(booking.check_in_date)
                          : "N/A"}
                      </div>
                      <div className="text-sm text-gray-500">
                        Out:{" "}
                        {booking.check_out_date
                          ? formatDate(booking.check_out_date)
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.nights} đêm
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PaymentStatusBadge status={getPaymentStatus(booking)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                      {booking.total_amount
                        ? formatCurrency(booking.total_amount)
                        : "0đ"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        // 🔥 FIX 1: Gọi hàm xử lý Slug
                        onClick={() =>
                          handleViewHotel(booking.hotel, booking.hotel_id)
                        }
                        className="text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-full hover:bg-blue-50"
                        title="Xem chi tiết khách sạn"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBooking;
