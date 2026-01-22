"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, RefreshCw, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

// --- 1. Định nghĩa Interface khớp với Backend trả về ---
interface HotelSnapshot {
  id: number;
  name: string; // Backend trả về 'name' (hoặc title tùy snapshot)
  slug: string;
  address: string;
  image: string;
  stars: number;
}

interface Booking {
  id: string; // MongoDB ID thường là string
  status: string; // "PENDING", "CONFIRMED", "CANCELLED"...
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  nights: number;
  hotel?: HotelSnapshot; // Snapshot có thể null nếu lỗi data cũ
  contactDetails: {
    fullName: string;
    email: string;
    phone: string;
  };
  createdAt: string;
}

// --- Component Badge hiển thị trạng thái ---
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getBadgeStyle = (s: string) => {
    // Chuyển về chữ thường để so sánh cho chắc
    const lowerStatus = s.toLowerCase();
    switch (lowerStatus) {
      case "confirmed":
      case "completed":
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (s: string) => {
    const lowerStatus = s.toLowerCase();
    switch (lowerStatus) {
      case "confirmed":
        return "Đã xác nhận";
      case "completed":
        return "Hoàn thành";
      case "pending":
        return "Đang xử lý";
      case "cancelled":
        return "Đã hủy";
      default:
        return s;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(status)}`}
    >
      {getStatusText(status)}
    </span>
  );
};

const MyBooking: React.FC = () => {
  const router = useRouter();
  // Lấy getToken để gọi API
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // URL của Booking Service (Nên đưa vào biến môi trường NEXT_PUBLIC_API_URL)
  const BOOKING_API_URL =
    process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || "http://localhost:8001";

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

  const loadBookings = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // --- 2. Lấy Token từ Clerk ---
      const token = await getToken();

      // --- 3. Gọi API trực tiếp với Header Authorization ---
      const res = await fetch(`${BOOKING_API_URL}/bookings/user-bookings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Quan trọng: Gửi token để middleware backend verify
        },
      });

      if (!res.ok) {
        throw new Error(`Lỗi tải dữ liệu: ${res.statusText}`);
      }

      const data: Booking[] = await res.json();
      setBookings(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể tải lịch sử đặt phòng");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken, BOOKING_API_URL]);

  useEffect(() => {
    if (isLoaded) {
      loadBookings();
    }
  }, [isLoaded, loadBookings]);

  // --- Render Loading / Auth Check ---
  if (!isLoaded) {
    return (
      <div className="p-12 text-center animate-pulse">Đang xác thực...</div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center ">
        <h1 className="text-2xl font-bold mb-4">Lịch sử đặt phòng</h1>
        <p className="text-gray-600 mb-4">
          Vui lòng đăng nhập để xem thông tin.
        </p>
        <button
          onClick={() => router.push("/sign-in")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  if (loading && bookings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse ">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadBookings}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // --- Render Main Content ---
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh]">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Lịch sử đặt phòng
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Cập nhật: {lastRefreshed.toLocaleTimeString("vi-VN")}
          </p>
        </div>
        <button
          onClick={loadBookings}
          disabled={loading}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            Chưa có đặt phòng nào
          </h3>
          <p className="text-gray-500 mb-6 mt-2">
            Hãy trải nghiệm kỳ nghỉ tuyệt vời cùng Stazy Hotel
          </p>
          <button
            onClick={() => router.push("/hotels")}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition"
          >
            Khám phá ngay
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã Booking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Khách sạn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chi tiết
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Cột ID: Backend trả về _id nhưng format lại thành id trong Booking Interface */}
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      #{booking.id.slice(-6).toUpperCase()}
                    </td>

                    {/* Cột Hotel: Lấy từ snapshot */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">
                        {booking.hotel?.name || "Khách sạn không tồn tại"}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {booking.hotel?.address}
                      </div>
                    </td>

                    {/* Cột Thời gian: Dùng checkIn / checkOut thay vì check_in_date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>Nhận: {formatDate(booking.checkIn)}</div>
                      <div>Trả: {formatDate(booking.checkOut)}</div>
                      <div className="text-xs text-gray-400">
                        ({booking.nights} đêm)
                      </div>
                    </td>

                    {/* Cột Tiền: Dùng totalPrice */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(booking.totalPrice || 0)}
                    </td>

                    {/* Cột Trạng thái */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={booking.status} />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        // Nếu có hotelId thì mới redirect được, fallback về trang chủ hoặc hiện thông báo
                        onClick={() =>
                          booking.hotel?.id
                            ? router.push(`/hotels/${booking.hotel.id}`)
                            : null
                        }
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition"
                        title="Xem khách sạn"
                        disabled={!booking.hotel?.id}
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
