import { Booking } from "@repo/booking-db";

// Hàm xử lý Kafka: Update trạng thái thanh toán
export const updateBookingStatusToPaid = async (
  bookingId: string,
  paymentData: any
) => {
  console.log(`⚡ [Service] Bắt đầu xử lý Booking UUID: ${bookingId}`);

  // 🔴 1. Lấy thông tin từ Metadata (Được gửi từ Payment Service sang)
  // Lưu ý: Metadata của Stripe luôn trả về dạng string, cần ép kiểu nếu là số
  const meta = paymentData.metadata || {};

  const hotelName = meta.hotelName || "Stazy Hotel (From Stripe)";
  const hotelImage = meta.hotelImage || ""; // Link ảnh khách sạn
  const hotelStars = Number(meta.hotelStars) || 0; // Số sao
  const hotelAddress = meta.hotelAddress || "Updating...";
  const hotelId = Number(meta.hotelId) || 1;

  try {
    const result = await Booking.findOneAndUpdate(
      { bookingId: bookingId }, // Điều kiện tìm kiếm
      {
        // A. Cập nhật nếu tìm thấy (Booking đã tồn tại)
        $set: {
          status: "CONFIRMED",
          "payment.status": "PAID",
          "payment.stripeSessionId": paymentData.stripeSessionId,
          updatedAt: new Date(),
        },

        // B. Tạo mới nếu KHÔNG tìm thấy (Logic Recover Booking)
        $setOnInsert: {
          bookingId: bookingId,
          userId: paymentData.userId || "guest_user",

          // Sử dụng ID thật lấy từ metadata
          hotelId: hotelId,

          totalPrice: paymentData.amount,
          checkIn: new Date(paymentData.checkInDate || Date.now()),
          checkOut: new Date(paymentData.checkOutDate || Date.now()),
          nights: 1,

          // 👇 QUAN TRỌNG: Lưu Snapshot với dữ liệu thật
          bookingSnapshot: {
            hotel: {
              id: hotelId,
              name: hotelName, // ✅ Tên khách sạn thật
              slug: "recovered-booking",
              address: hotelAddress, // ✅ Địa chỉ thật (nếu có gửi kèm)
              image: hotelImage, // ✅ Ảnh thật
              stars: hotelStars, // ✅ Số sao thật
            },
            room: {
              id: 1,
              name: "Standard Room",
              priceAtBooking: paymentData.amount,
            },
          },

          contactDetails: {
            fullName: paymentData.customerName || "Stripe Customer",
            email: paymentData.customerEmail || "stripe@stazy.com",
            phone: paymentData.customerPhone || "0000000000",
          },
        },
      },
      { new: true, upsert: true } // Upsert = True: Không thấy thì tạo mới
    );

    console.log(`✅ [Service] ĐÃ LƯU MONGODB THÀNH CÔNG!`);
    console.log(`   👉 MongoID: ${result._id}`);
    console.log(`   👉 Status: ${result.status}`);
    console.log(`   👉 Hotel: ${result.bookingSnapshot?.hotel?.name}`); // Log ra để kiểm tra

    return result;
  } catch (error: any) {
    console.error("❌ [Service] Lỗi lưu MongoDB:", error.message);
    if (error.errors) {
      console.error(
        "🔍 Validation Errors:",
        JSON.stringify(error.errors, null, 2)
      );
    }
    throw error;
  }
};
