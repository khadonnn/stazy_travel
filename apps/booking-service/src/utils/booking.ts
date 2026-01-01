import { Booking } from "@repo/booking-db";

// Hàm xử lý Kafka: Update trạng thái thanh toán
export const updateBookingStatusToPaid = async (
  bookingId: string,
  paymentData: any
) => {
  console.log(`⚡ [Service] Bắt đầu xử lý Booking UUID: ${bookingId}`);

  try {
    const result = await Booking.findOneAndUpdate(
      { bookingId: bookingId }, // Điều kiện tìm
      {
        $set: {
          status: "CONFIRMED",
          "payment.status": "PAID",
          "payment.stripeSessionId": paymentData.stripeSessionId,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          // Dữ liệu tạo mới (Phải khớp với Schema Required)
          bookingId: bookingId,
          userId: paymentData.userId || "guest_user",
          hotelId: 1, // Hardcode tạm nếu Kafka không gửi
          totalPrice: paymentData.amount,

          checkIn: new Date(paymentData.checkInDate || Date.now()),
          checkOut: new Date(paymentData.checkOutDate || Date.now()),
          nights: 1,

          // 👇 QUAN TRỌNG: Phải có cục này thì mới lưu được (như test-db.ts)
          bookingSnapshot: {
            hotel: {
              id: 1,
              name: "Stazy Hotel (From Stripe)",
              slug: "unknown-hotel",
              address: "Updating...",
              image: "",
              stars: 5,
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
      { new: true, upsert: true } // Upsert = True
    );

    console.log(`✅ [Service] ĐÃ LƯU MONGODB THÀNH CÔNG!`);
    console.log(`   👉 MongoID: ${result._id}`);
    console.log(`   👉 Status: ${result.status}`);
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

// Hàm createBooking giữ nguyên nếu bạn muốn
