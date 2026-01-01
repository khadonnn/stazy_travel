// apps/booking-service/src/test-db.ts
import { Booking, connectBookingDB } from "@repo/booking-db";

const runTest = async () => {
  console.log("🔵 Đang bắt đầu test kết nối...");

  // Kiểm tra xem biến môi trường đã được nạp từ lệnh chạy chưa
  if (!process.env.MONGO_URL) {
    console.error(
      "❌ LỖI: Không tìm thấy biến MONGO_URL. Bạn đã chạy thiếu cờ --env-file=.env chưa?"
    );
    process.exit(1);
  }

  try {
    // 1. Kết nối (Sẽ dùng MONGO_URL từ env)
    await connectBookingDB();
    console.log("✅ Kết nối DB thành công!");

    // 2. Tạo dữ liệu mẫu (Khớp với Schema của bạn)
    const fakeId = "TEST-UUID-" + Date.now();
    const newBooking = new Booking({
      bookingId: fakeId,
      userId: "user_test_123",
      hotelId: 1,
      totalPrice: 100000,
      status: "CONFIRMED",
      checkIn: new Date(),
      checkOut: new Date(),
      nights: 1,
      contactDetails: {
        fullName: "Test User",
        email: "test@gmail.com",
        phone: "0999999999",
      },
      bookingSnapshot: {
        hotel: {
          id: 1,
          name: "Test Hotel",
          slug: "test",
          address: "VN",
          image: "",
          stars: 5,
        },
        room: { id: 1, name: "Test Room", priceAtBooking: 100000 },
      },
    });

    // 3. Lưu thử
    const saved = await newBooking.save();
    console.log("🎉 LƯU THÀNH CÔNG! MongoDB ID:", saved._id);
  } catch (error: any) {
    console.error("❌ LỖI KHI LƯU:", error.message);
    if (error.errors)
      console.error("🔍 Chi tiết:", JSON.stringify(error.errors, null, 2));
  } finally {
    process.exit(0);
  }
};

runTest();
