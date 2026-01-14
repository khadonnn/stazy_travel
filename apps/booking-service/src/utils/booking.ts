import { Booking } from "@repo/booking-db";
import { producer } from "./kafka";

export const updateBookingStatusToPaid = async (
  bookingId: string,
  paymentData: any
) => {
  console.log(`⚡ [Service] Bắt đầu xử lý Booking UUID: ${bookingId}`);

  // 1. Parse Metadata
  const meta = paymentData.metadata || {};

  // 2. Tính toán ngày
  const checkInDate = new Date(paymentData.checkInDate || Date.now());
  const checkOutDate = new Date(paymentData.checkOutDate || Date.now());
  const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
  const calculatedNights = Math.max(
    1,
    Math.ceil(timeDiff / (1000 * 3600 * 24))
  );

  const hotelId = Number(meta.hotelId) || 1;
  const stripeHotelName = meta.hotelName;
  const stripeAddress = meta.hotelAddress;

  try {
    // 🔥 3. Tìm Booking cũ để Merge dữ liệu (Giữ nguyên logic hay của bạn)
    const existingBooking = await Booking.findOne({ bookingId });

    let finalHotelName = "Unknown Hotel";
    let finalAddress = "Address not provided";
    let finalSlug = "recovered-booking";
    let finalImage = meta.hotelImage || "";
    let finalStars = Number(meta.hotelStars) || 0;

    // Logic ưu tiên: Metadata > DB cũ > Default
    if (stripeHotelName) {
      finalHotelName = stripeHotelName;
    } else if (
      existingBooking?.bookingSnapshot?.hotel?.name &&
      existingBooking.bookingSnapshot.hotel.name !== "Unknown Hotel"
    ) {
      finalHotelName = existingBooking.bookingSnapshot.hotel.name;
      // Nếu lấy từ DB cũ thì lấy luôn các trường khác cho đồng bộ
      finalAddress =
        existingBooking.bookingSnapshot.hotel.address || finalAddress;
      finalSlug = existingBooking.bookingSnapshot.hotel.slug || finalSlug;
      finalImage = existingBooking.bookingSnapshot.hotel.image || finalImage;
      finalStars = existingBooking.bookingSnapshot.hotel.stars || finalStars;
    }

    if (stripeAddress && !finalAddress.includes("provided")) {
      finalAddress = stripeAddress;
    }

    // 🔥 4. TẠO OBJECT SNAPSHOT HOÀN CHỈNH TẠI ĐÂY (TRÁNH CONFLICT MONGO)
    const fullSnapshot = {
      hotel: {
        id: hotelId,
        name: finalHotelName,
        slug: finalSlug,
        address: finalAddress,
        image: finalImage,
        stars: finalStars,
      },
      room: {
        id: hotelId, // Hoặc roomId nếu có
        name: "Standard Room",
        priceAtBooking: paymentData.amount,
      },
    };

    // 5. Thực hiện Update (Chỉ dùng $set cho snapshot)
    const result = await Booking.findOneAndUpdate(
      { bookingId: bookingId },
      {
        $set: {
          status: "CONFIRMED",
          "payment.status": "PAID",
          "payment.stripeSessionId": paymentData.stripeSessionId,
          updatedAt: new Date(),

          nights: calculatedNights,
          checkIn: checkInDate,
          checkOut: checkOutDate,

          // ✅ QUAN TRỌNG: Set nguyên cục snapshot vào đây
          // Nó sẽ hoạt động cho cả trường hợp Insert mới lẫn Update cũ
          bookingSnapshot: fullSnapshot,
        },

        $setOnInsert: {
          bookingId: bookingId,
          userId: paymentData.userId || "guest_user",
          hotelId: hotelId,
          totalPrice: paymentData.amount,
          createdAt: new Date(),
          contactDetails: {
            fullName: paymentData.customerName || "Stripe Customer",
            email: paymentData.customerEmail || "stripe@stazy.com",
            phone: paymentData.customerPhone || "0000000000",
          },
          // ❌ TUYỆT ĐỐI KHÔNG ĐỂ bookingSnapshot Ở ĐÂY NỮA
        },
      },
      { new: true, upsert: true }
    );

    console.log(`✅ [Service] ĐÃ LƯU MONGODB THÀNH CÔNG!`);
    console.log(`   👉 Hotel: ${result.bookingSnapshot?.hotel?.name}`);

    // ... (Phần gửi Kafka Notification giữ nguyên) ...
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
