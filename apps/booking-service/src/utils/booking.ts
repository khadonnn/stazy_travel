// services/booking.ts
import { Booking } from "@repo/booking-db"; // Import Model vừa sửa

export const updateBookingStatusToPaid = async (
  bookingId: string,
  paymentData: any
) => {
  console.log(`⚡ [Service] Xử lý Booking UUID: ${bookingId}`);

  try {
    const result = await Booking.findOneAndUpdate(
      { bookingId: bookingId }, // Tìm theo bookingId vừa thêm
      {
        $set: {
          status: "CONFIRMED",
          // Update nested object trong Mongoose phải dùng dấu chấm
          "payment.status": "PAID",
          "payment.stripeSessionId": paymentData.stripeSessionId,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          // Chỉ set khi tạo mới
          bookingId: bookingId, // 🔥 QUAN TRỌNG: Lưu UUID vào
          userId: paymentData.userId || "guest",
          hotelId: 1, // Hardcode tạm hoặc lấy từ metadata
          totalPrice: paymentData.amount,

          // Map đúng tên trường trong Schema: checkIn (không phải checkInDate)
          checkIn: new Date(paymentData.checkInDate || Date.now()),
          checkOut: new Date(paymentData.checkOutDate || Date.now()),
          nights: 1, // Tính toán logic ngày sau

          // Map Contact (Bắt buộc required)
          contactDetails: {
            fullName: paymentData.customerName || "Guest User",
            email: paymentData.customerEmail || "no-email@test.com",
            phone: paymentData.customerPhone || "0000000000",
          },

          // Map Snapshot (Để tránh lỗi required)
          bookingSnapshot: {
            hotel: {
              id: 1,
              name: "Stazy Hotel (From Stripe)",
              slug: "stazy-hotel",
            },
            room: {
              name: "Standard Room",
              priceAtBooking: paymentData.amount,
            },
          },
        },
      },
      { new: true, upsert: true } // Upsert: True
    );

    console.log(`✅ Đã lưu thành công! MongoID: ${result._id}`);
    return result;
  } catch (error) {
    console.error("❌ Lỗi Model Validate:", error);
    // Log chi tiết lỗi để biết sai trường nào
    throw error;
  }
};
