import { Booking } from "@repo/booking-db";
import { producer } from "./kafka";

// ⚠️ QUAN TRỌNG: Nếu bạn có truy cập được vào DB Product thì nên import để fallback
// import { Hotel } from "@repo/product-db";

export const updateBookingStatusToPaid = async (
  bookingId: string,
  paymentData: any
) => {
  console.log(`⚡ [Service] Bắt đầu xử lý Booking UUID: ${bookingId}`);

  // 👉 Debug: Log toàn bộ metadata xem Stripe gửi về cái gì
  console.log(
    "🔍 [Debug] Raw Metadata received:",
    JSON.stringify(paymentData.metadata, null, 2)
  );

  const meta = paymentData.metadata || {};
  console.log("🔍 [Debug] Metadata:", JSON.stringify(meta, null, 2));

  // 2. Tính toán ngày (Giữ nguyên logic của bạn)
  const checkInDate = new Date(paymentData.checkInDate || Date.now());
  const checkOutDate = new Date(paymentData.checkOutDate || Date.now());
  const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
  const calculatedNights = Math.max(
    1,
    Math.ceil(timeDiff / (1000 * 3600 * 24))
  );

  // 3. Chuẩn bị dữ liệu để Update
  // Ưu tiên lấy từ Metadata nếu có, nếu không thì giữ nguyên logic fallback
  const hotelId = Number(meta.hotelId) || 1;
  const stripeHotelName = meta.hotelName;
  const stripeAddress = meta.hotelAddress;

  try {
    // 🔥 BƯỚC QUAN TRỌNG: Tìm Booking trước để xem nó đang lưu cái gì
    const existingBooking = await Booking.findOne({ bookingId });

    // Logic xác định tên khách sạn cuối cùng:
    // - Nếu metadata có tên -> Dùng metadata (để sửa sai cho DB).
    // - Nếu DB đã có tên (và không phải Unknown) -> Giữ nguyên DB.
    // - Nếu cả 2 đều không có -> Chấp nhận Unknown.
    let finalHotelName = "Unknown Hotel";
    let finalAddress = "Address not provided";

    if (stripeHotelName) {
      finalHotelName = stripeHotelName;
    } else if (
      existingBooking?.bookingSnapshot?.hotel?.name &&
      existingBooking.bookingSnapshot.hotel.name !== "Unknown Hotel"
    ) {
      finalHotelName = existingBooking.bookingSnapshot.hotel.name;
    }

    if (stripeAddress) {
      finalAddress = stripeAddress;
    } else if (existingBooking?.bookingSnapshot?.hotel?.address) {
      finalAddress = existingBooking.bookingSnapshot.hotel.address;
    }

    // Thực hiện Update
    const result = await Booking.findOneAndUpdate(
      { bookingId: bookingId },
      {
        // ✅ CẬP NHẬT CẢ THÔNG TIN SNAPSHOT VÀO $SET LUÔN
        // Để dù booking đã tồn tại thì nó vẫn bị ghi đè dữ liệu mới
        $set: {
          status: "CONFIRMED",
          "payment.status": "PAID",
          "payment.stripeSessionId": paymentData.stripeSessionId,
          updatedAt: new Date(),

          // Cập nhật lại snapshot nếu cần thiết
          "bookingSnapshot.hotel.name": finalHotelName,
          "bookingSnapshot.hotel.address": finalAddress,
          nights: calculatedNights,
          checkIn: checkInDate,
          checkOut: checkOutDate,
        },

        $setOnInsert: {
          bookingId: bookingId,
          userId: paymentData.userId || "guest_user",
          hotelId: hotelId,
          totalPrice: paymentData.amount,
          // ... Các trường snapshot đầy đủ khác cho trường hợp tạo mới tinh
          bookingSnapshot: {
            hotel: {
              id: hotelId,
              name: finalHotelName,
              slug: "recovered-booking",
              address: finalAddress,
              image: meta.hotelImage || "",
              stars: Number(meta.hotelStars) || 0,
            },
            room: {
              id: hotelId,
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
      { new: true, upsert: true }
    );

    console.log(`✅ [Service] ĐÃ LƯU MONGODB THÀNH CÔNG!`);
    console.log(`   👉 Nights: ${result.nights}`);
    console.log(`   👉 Hotel: ${result.bookingSnapshot?.hotel?.name}`);

    // ... (Phần bắn Kafka Notification giữ nguyên như cũ) ...
    const notificationPayload = {
      bookingId: result.bookingId,
      customerName: result.contactDetails?.fullName || "Khách hàng",
      hotelName: result.bookingSnapshot?.hotel?.name || "Khách sạn",
      totalPrice: result.totalPrice,
      status: "CONFIRMED",
      updatedAt: new Date(),
    };

    try {
      await producer.connect();
      await producer.send("booking.confirmed", notificationPayload);
      console.log(`📢 [Kafka] Đã gửi event 'booking.confirmed'`);
    } catch (kafkaError) {
      console.error("❌ [Kafka Error]", kafkaError);
    }

    return result;
  } catch (error: any) {
    console.error("❌ [Service] Lỗi lưu MongoDB:", error.message);
    throw error;
  }
};
