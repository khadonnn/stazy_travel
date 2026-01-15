import { Booking } from "@repo/booking-db";
import { producer } from "./kafka";

export const updateBookingStatusToPaid = async (
  bookingId: string,
  paymentData: any
) => {
  console.log(`⚡ [Service] Bắt đầu xử lý Booking UUID: ${bookingId}`);

  // 🔍 DEBUG: In toàn bộ dữ liệu nhận được để kiểm tra
  console.log(
    "🔍 [DEBUG] Payment Data Raw:",
    JSON.stringify(paymentData, null, 2)
  );

  // ---------------------------------------------------------
  // 1. TRÍCH XUẤT DỮ LIỆU (FIX LỖI TẠI ĐÂY)
  // ---------------------------------------------------------
  // Payment Service gửi object: { hotelInfo: { name... }, customerEmail... }
  // Nên ta ưu tiên lấy từ hotelInfo trước, rồi đến root, rồi mới đến metadata (fallback)

  const hotelInfo = paymentData.hotelInfo || {};
  const meta = paymentData.metadata || {}; // Fallback cho code cũ

  // Lấy thông tin Hotel
  const incomingHotelId = Number(hotelInfo.id) || Number(meta.hotelId) || 1;

  const incomingHotelName =
    hotelInfo.name || // Ưu tiên 1: Trong hotelInfo
    paymentData.hotel || // Ưu tiên 2: Nằm phẳng ở root (do Webhook map ra)
    meta.hotelName; // Ưu tiên 3: Trong metadata cũ

  const incomingAddress = hotelInfo.address || meta.hotelAddress;
  const incomingImage = hotelInfo.image || meta.hotelImage;
  const incomingSlug = hotelInfo.slug || meta.hotelSlug;
  const incomingStars = Number(hotelInfo.stars) || Number(meta.hotelStars) || 0;

  // Lấy thông tin Khách hàng
  const incomingCustomerName =
    paymentData.customerName ||
    paymentData.user ||
    meta.customerName ||
    "Stripe Customer";

  const incomingCustomerEmail =
    paymentData.customerEmail ||
    paymentData.email ||
    meta.customerEmail ||
    "stripe@stazy.com";

  const incomingPhone = paymentData.customerPhone || meta.customerPhone || "";

  // ---------------------------------------------------------
  // 2. TÍNH TOÁN NGÀY
  // ---------------------------------------------------------
  const checkInDate = new Date(
    paymentData.checkInDate || meta.checkInDate || Date.now()
  );
  const checkOutDate = new Date(
    paymentData.checkOutDate || meta.checkOutDate || Date.now()
  );
  const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
  const calculatedNights = Math.max(
    1,
    Math.ceil(timeDiff / (1000 * 3600 * 24))
  );

  try {
    // 3. Tìm Booking cũ (nếu có) để merge data
    const existingBooking = await Booking.findOne({ bookingId });

    // Khởi tạo giá trị mặc định
    let finalHotelName = "Unknown Hotel";
    let finalAddress = "Address not provided";
    let finalSlug = "recovered-booking";
    let finalImage = "";
    let finalStars = 0;

    // LOGIC MERGE: Ưu tiên dữ liệu mới từ Payment > Dữ liệu cũ trong DB
    if (incomingHotelName) {
      finalHotelName = incomingHotelName;
      finalAddress = incomingAddress || finalAddress;
      finalSlug = incomingSlug || finalSlug;
      finalImage = incomingImage || finalImage;
      finalStars = incomingStars || finalStars;
    } else if (existingBooking?.bookingSnapshot?.hotel?.name) {
      // Nếu Payment không có tên hotel (hiếm), thì dùng lại cái cũ trong DB
      console.log("⚠️ Không nhận được tên Hotel từ Kafka, dùng lại DB cũ");
      const oldSnapshot = existingBooking.bookingSnapshot.hotel;
      finalHotelName = oldSnapshot.name;
      finalAddress = oldSnapshot.address || finalAddress;
      finalSlug = oldSnapshot.slug || finalSlug;
      finalImage = oldSnapshot.image || finalImage;
      finalStars = oldSnapshot.stars || finalStars;
    }

    // 4. TẠO SNAPSHOT HOÀN CHỈNH
    const fullSnapshot = {
      hotel: {
        id: incomingHotelId,
        name: finalHotelName,
        slug: finalSlug,
        address: finalAddress,
        image: finalImage,
        stars: finalStars,
      },
      room: {
        id: incomingHotelId, // Hoặc ID phòng nếu có
        name: "Standard Room",
        priceAtBooking: paymentData.amount || 0,
      },
    };

    console.log(
      "🛠 [DEBUG] Snapshot sẽ lưu:",
      JSON.stringify(fullSnapshot.hotel, null, 2)
    );

    // 5. UPDATE MONGODB
    const result = await Booking.findOneAndUpdate(
      { bookingId: bookingId },
      {
        $set: {
          status: "CONFIRMED",
          "payment.status": "PAID",
          "payment.stripeSessionId":
            paymentData.stripeSessionId || meta.stripeSessionId,
          updatedAt: new Date(),
          nights: calculatedNights,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          // Update Snapshot mới nhất
          bookingSnapshot: fullSnapshot,
          // Update Contact mới nhất
          contactDetails: {
            fullName: incomingCustomerName,
            email: incomingCustomerEmail,
            phone: incomingPhone,
          },
        },
        $setOnInsert: {
          bookingId: bookingId,
          userId: paymentData.userId || meta.userId || "guest_user",
          hotelId: incomingHotelId,
          totalPrice: paymentData.amount,
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    console.log(`✅ [Service] ĐÃ LƯU MONGODB THÀNH CÔNG!`);

    // Gửi Kafka Notification (Booking Confirmed)
    // ... (Giữ nguyên logic gửi Kafka notification của bạn)

    return result;
  } catch (error: any) {
    console.error("❌ [Service] Lỗi lưu MongoDB:", error.message);
    throw error;
  }
};
