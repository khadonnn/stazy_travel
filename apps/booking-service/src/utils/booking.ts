import { Booking } from "@repo/booking-db";
import { producer } from "./kafka";
// 🔥 1. Import Redlock từ file cấu hình ở bước trước
import { redlock } from "../utils/redis";
import crypto from "crypto";
import { prisma } from "@repo/product-db"; // Thêm Prisma để sync PostgreSQL

// =========================================================
// 🔥 HÀM SYNC BOOKING SANG POSTGRESQL
// =========================================================
const syncBookingToPostgres = async (mongoBooking: any) => {
  try {
    const userId = mongoBooking.userId;
    const hotelId = Number(mongoBooking.hotelId);
    const contactDetails = mongoBooking.contactDetails || {};
    const guestCount = mongoBooking.guestCount || {};
    const totalPrice = Number(mongoBooking.totalPrice || 0);
    const nights = Number(mongoBooking.nights || 1);
    const basePrice = nights > 0 ? totalPrice / nights : totalPrice;

    // Map status từ MongoDB sang PostgreSQL enum
    let pgStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" =
      "PENDING";
    if (
      mongoBooking.status === "CONFIRMED" ||
      mongoBooking.payment?.status === "PAID"
    ) {
      pgStatus = "CONFIRMED";
    } else if (mongoBooking.status === "CANCELLED") {
      pgStatus = "CANCELLED";
    } else if (mongoBooking.status === "COMPLETED") {
      pgStatus = "COMPLETED";
    }

    // Map paymentStatus enum (PENDING, SUCCEEDED, FAILED, REFUNDED)
    let pgPaymentStatus: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" =
      "PENDING";
    if (mongoBooking.payment?.status === "PAID") {
      pgPaymentStatus = "SUCCEEDED";
    }

    // Upsert vào PostgreSQL
    await prisma.booking.upsert({
      where: { id: mongoBooking.bookingId },
      create: {
        id: mongoBooking.bookingId,
        userId: userId,
        hotelId: hotelId,
        guestName: contactDetails.fullName || "Guest",
        guestEmail: contactDetails.email || "guest@example.com",
        guestPhone: contactDetails.phone || "",
        adults: Number(guestCount.adults || 1),
        children: Number(guestCount.children || 0),
        checkIn: new Date(mongoBooking.checkIn),
        checkOut: new Date(mongoBooking.checkOut),
        nights: nights,
        basePrice: basePrice,
        discount: 0,
        totalAmount: totalPrice,
        currency: "VND",
        paymentMethod: "STRIPE",
        paymentStatus: pgPaymentStatus,
        paymentIntentId:
          mongoBooking.payment?.paymentIntentId ||
          mongoBooking.payment?.stripeSessionId ||
          null,
        status: pgStatus,
      },
      update: {
        status: pgStatus,
        paymentStatus: pgPaymentStatus,
        guestName: contactDetails.fullName || "Guest",
        guestEmail: contactDetails.email || "guest@example.com",
        guestPhone: contactDetails.phone || "",
        adults: Number(guestCount.adults || 1),
        children: Number(guestCount.children || 0),
        nights: nights,
        basePrice: basePrice,
        totalAmount: totalPrice,
        paymentIntentId:
          mongoBooking.payment?.paymentIntentId ||
          mongoBooking.payment?.stripeSessionId ||
          null,
        updatedAt: new Date(),
      },
    });

    console.log(`🔄 Synced booking ${mongoBooking.bookingId} to PostgreSQL`);
  } catch (error: any) {
    console.error("❌ Sync to PostgreSQL failed:", error.message);
    throw error;
  }
};

// =========================================================
// 🔥 HÀM MỚI: TẠO BOOKING (CÓ REDIS LOCK)
// Gọi hàm này ở Controller khi User bấm "Đặt phòng"
// =========================================================
export const createBooking = async (userId: string, bookingData: any) => {
  const {
    hotelId,
    checkIn,
    checkOut,
    totalAmount,
    nights,
    contactDetails,
    bookingSnapshot,
  } = bookingData;
  const resource = `locks:hotel:${hotelId}:${checkIn}`;
  const ttl = 5000;

  let lock;

  try {
    lock = await redlock.acquire([resource], ttl);
    console.log(`🔒 Đã khóa tài nguyên: ${resource}`);

    const conflict = await Booking.findOne({
      hotelId: Number(hotelId),
      status: { $in: ["CONFIRMED", "PENDING"] },
      $or: [
        { checkIn: { $lt: new Date(checkOut), $gte: new Date(checkIn) } },
        { checkOut: { $gt: new Date(checkIn), $lte: new Date(checkOut) } },
      ],
    });

    if (conflict) {
      throw new Error("Rất tiếc, phòng này vừa có người đặt!");
    }

    const newBooking = await Booking.create({
      bookingId: crypto.randomUUID(),
      userId,
      hotelId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      totalPrice: totalAmount,
      status: "PENDING",

      nights: nights || 1,
      contactDetails: contactDetails || {},
      bookingSnapshot: bookingSnapshot || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 🔥 GỬI KAFKA NOTIFICATION (Đã thêm)
    // Gửi sự kiện để Email Service gửi mail "Đơn hàng đã được tạo, vui lòng thanh toán"
    await producer.send("booking-events", {
      event: "BOOKING_CREATED",
      bookingId: newBooking.bookingId,
      email: "test@example.com", // Hoặc lấy từ user info
      amount: totalAmount,
    });

    // 🔥 AUTO-SYNC SANG POSTGRESQL NGAY KHI TẠO BOOKING (PENDING)
    try {
      await syncBookingToPostgres(newBooking);
      console.log(
        `🔄 Auto-synced PENDING booking ${newBooking.bookingId} to PostgreSQL`,
      );
    } catch (syncError: any) {
      console.error("⚠️ Auto-sync failed:", syncError.message);
      // Không throw để không fail booking creation
    }

    return newBooking;
  } catch (error: any) {
    if (error.name === "ExecutionError") {
      throw new Error(
        "Phòng đang được giữ bởi khách khác, vui lòng thử lại sau giây lát.",
      );
    }
    throw error;
  } finally {
    if (lock) {
      await lock
        .unlock()
        .catch((err) => console.error("Lỗi nhả khóa Redis:", err));
      console.log(`🔓 Đã mở khóa: ${resource}`);
    }
  }
};

// =========================================================
// ♻️ HÀM CŨ: UPDATE STATUS (GIỮ NGUYÊN CODE CỦA BẠN)
// =========================================================
export const updateBookingStatusToPaid = async (
  bookingId: string,
  paymentData: any,
) => {
  console.log(`⚡ [Service] Bắt đầu xử lý Booking UUID: ${bookingId}`);

  // 🔍 DEBUG: In toàn bộ dữ liệu nhận được để kiểm tra
  console.log(
    "🔍 [DEBUG] Payment Data Raw:",
    JSON.stringify(paymentData, null, 2),
  );

  // ---------------------------------------------------------
  // 1. TRÍCH XUẤT DỮ LIỆU
  // ---------------------------------------------------------
  const hotelInfo = paymentData.hotelInfo || {};
  const meta = paymentData.metadata || {};

  // Lấy thông tin Hotel
  const incomingHotelId = Number(hotelInfo.id) || Number(meta.hotelId) || 1;

  const incomingHotelName =
    hotelInfo.name || paymentData.hotel || meta.hotelName;

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
    paymentData.checkInDate || meta.checkInDate || Date.now(),
  );
  const checkOutDate = new Date(
    paymentData.checkOutDate || meta.checkOutDate || Date.now(),
  );
  const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
  const calculatedNights = Math.max(
    1,
    Math.ceil(timeDiff / (1000 * 3600 * 24)),
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

    if (incomingHotelName) {
      finalHotelName = incomingHotelName;
      finalAddress = incomingAddress || finalAddress;
      finalSlug = incomingSlug || finalSlug;
      finalImage = incomingImage || finalImage;
      finalStars = incomingStars || finalStars;
    } else if (existingBooking?.bookingSnapshot?.hotel?.name) {
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
        id: incomingHotelId,
        name: "Standard Room",
        priceAtBooking: paymentData.amount || 0,
      },
    };

    console.log(
      "🛠 [DEBUG] Snapshot sẽ lưu:",
      JSON.stringify(fullSnapshot.hotel, null, 2),
    );

    // 5. UPDATE MONGODB
    // Logic: Nếu đã có PENDING (do hàm createBooking tạo) -> Update thành PAID
    // Nếu chưa có (Webhook chạy trước hoặc lỗi) -> Upsert mới
    const result = await Booking.findOneAndUpdate(
      { bookingId: bookingId },
      {
        $set: {
          status: "CONFIRMED",
          "payment.status": "PAID",
          "payment.stripeSessionId":
            paymentData.stripeSessionId || meta.stripeSessionId,
          paymentMethod: "stripe", // Thêm field paymentMethod
          updatedAt: new Date(),
          nights: calculatedNights,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          bookingSnapshot: fullSnapshot,
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
      { new: true, upsert: true },
    );

    console.log(`✅ [Service] ĐÃ LƯU MONGODB THÀNH CÔNG!`);

    // 🔥 SYNC SANG POSTGRESQL (Quan trọng để hiển thị Recent Bookings trên Admin)
    try {
      await syncBookingToPostgres(result);
      console.log(`✅ [Service] ĐÃ SYNC SANG POSTGRESQL!`);
    } catch (syncError: any) {
      console.error("⚠️ [Service] Lỗi sync PostgreSQL:", syncError.message);
      // Không throw error để không fail toàn bộ quá trình
    }

    return result;
  } catch (error: any) {
    console.error("❌ [Service] Lỗi lưu MongoDB:", error.message);
    throw error;
  }
};
