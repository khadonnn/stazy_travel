import { FastifyInstance } from "fastify";
import { shouldBeAdmin, shouldBeUser } from "../middleware/authMiddleware";
import { Booking } from "@repo/booking-db";
import { createBooking } from "../utils/booking";
// Định nghĩa kiểu dữ liệu Body gửi lên để TS hiểu
interface CreateBookingBody {
  hotelId: number | string;
  roomId?: number; // Optional nếu bạn chưa làm logic phòng
  checkIn: string;
  checkOut: string;
  contactDetails: {
    fullName: string;
    email: string;
    phone: string;
  };
}
interface CheckAvailabilityQuery {
  hotelId: string | number;
  checkIn: string;
  checkOut: string;
}
// URL của Product Service (Nên để trong .env)
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:8000";

export const bookingRoute = async (fastify: FastifyInstance) => {
  // 1. API TẠO BOOKING (Quan trọng nhất)
  fastify.post<{ Body: CreateBookingBody }>(
    "/",
    { preHandler: shouldBeUser }, // Tạm tắt auth để test, sau này mở lại
    async (request, reply) => {
      const { hotelId, checkIn, checkOut, contactDetails } = request.body;
      // @ts-ignore
      // Nếu test script không gửi token, ta lấy userId từ body (nếu có) hoặc fake
      const userId =
        (request.body as any).userId || request.userId || "guest_user";

      try {
        // --- BƯỚC 1: LẤY DATA & TÍNH TOÁN (Logic chuẩn bị) ---
        const hotelRes = await fetch(
          `${PRODUCT_SERVICE_URL}/hotels/${hotelId}`,
        );
        if (!hotelRes.ok) {
          return reply
            .status(404)
            .send({ message: "Không tìm thấy khách sạn" });
        }
        const hotelData = await hotelRes.json();
        const realHotelId = Number(hotelData.id);

        if (isNaN(realHotelId)) {
          return reply
            .status(500)
            .send({ message: "Dữ liệu khách sạn lỗi (thiếu ID)" });
        }
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        const timeDiff = endDate.getTime() - startDate.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (nights <= 0)
          return reply.status(400).send({ message: "Ngày không hợp lệ" });

        const pricePerNight = hotelData.price || 0;
        const totalPrice = pricePerNight * nights;

        // --- BƯỚC 2: GỌI HÀM LOGIC CÓ KHÓA REDIS ---
        // Chúng ta truyền tất cả dữ liệu đã chuẩn bị vào hàm này
        const newBooking = await createBooking(userId, {
          hotelId: realHotelId,
          checkIn: startDate, // Truyền Date object luôn
          checkOut: endDate,
          totalAmount: totalPrice,
          // 🔥 Truyền thêm các dữ liệu phụ trợ để hàm utils lưu vào DB
          nights,
          contactDetails,
          bookingSnapshot: {
            hotel: {
              id: hotelData.id,
              name: hotelData.name || hotelData.title,
              slug: hotelData.slug,
              address: hotelData.address,
              image: hotelData.featuredImage || hotelData.image,
              stars: hotelData.starRating || 0,
            },
            room: {
              name: "Standard Room",
              priceAtBooking: pricePerNight,
            },
          },
        });

        // --- BƯỚC 3: TRẢ VỀ KẾT QUẢ ---
        return reply.code(201).send(newBooking);
      } catch (error: any) {
        console.error("❌ Booking Error:", error.message);

        // Bắt lỗi Redis Lock (Quan trọng cho bài test Race Condition)
        if (error.message.includes("giữ bởi khách khác")) {
          return reply.status(409).send({ message: error.message });
        }

        return reply
          .status(500)
          .send({ message: "Lỗi hệ thống khi tạo đơn hàng" });
      }
    },
  );

  // 2. API LẤY LỊCH SỬ CỦA USER
  fastify.get(
    "/user-bookings",
    { preHandler: shouldBeUser },
    async (request, reply) => {
      // @ts-ignore
      const userId = request.userId;

      // Lấy danh sách từ MongoDB, sắp xếp mới nhất lên đầu
      const bookings = await Booking.find({ userId: userId }).sort({
        createdAt: -1,
      });

      // Format lại dữ liệu cho Frontend dễ dùng (Optional)
      // Giúp Frontend không cần chọc sâu vào bookingSnapshot
      const formattedBookings = bookings.map((b) => ({
        id: b._id,
        status: b.status,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        totalPrice: b.totalPrice,
        nights: b.nights,
        // Lấy thông tin hotel từ snapshot ra ngoài cho dễ truy cập
        hotel: b.bookingSnapshot?.hotel,
        room: b.bookingSnapshot?.room,
        contactDetails: b.contactDetails,
        createdAt: b.createdAt,
      }));

      return reply.send(formattedBookings);
    },
  );

  // 3. API ADMIN (Xem tất cả)
  fastify.get(
    "/", // 🔥 Đổi từ "/bookings" thành "/" vì đã có prefix /bookings ở index.ts
    { preHandler: shouldBeAdmin }, // Nhớ bật lại auth admin
    async (request, reply) => {
      const bookings = await Booking.find().sort({ createdAt: -1 });
      return reply.send(bookings);
    },
  );

  // 3.5 API LẤY 5 BOOKING MỚI NHẤT (For Recent Bookings Widget)
  fastify.get(
    "/recent",
    // Không cần auth vì đây là public stats
    async (request, reply) => {
      const recentBookings = await Booking.find()
        .sort({ createdAt: -1 })
        .limit(5);
      return reply.send(recentBookings);
    },
  );

  // 4. API KIỂM TRA TÍNH KHẢ DỤNG (CHECK AVAILABILITY)
  fastify.get<{ Querystring: CheckAvailabilityQuery }>(
    "/check-availability",
    // Không cần middleware auth để ai cũng check được
    async (request, reply) => {
      try {
        const { hotelId, checkIn, checkOut } = request.query;

        // 1. Validate đầu vào
        if (!hotelId || !checkIn || !checkOut) {
          return reply.status(400).send({ message: "Thiếu thông tin tra cứu" });
        }

        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return reply.status(400).send({ message: "Ngày tháng không hợp lệ" });
        }

        // 2. Logic kiểm tra trùng lịch (Overlap)
        // (StartCũ < EndMới) && (EndCũ > StartMới)
        const conflictBooking = await Booking.findOne({
          hotelId: Number(hotelId), // Quan trọng: Convert string -> number
          checkIn: { $lt: endDate },
          checkOut: { $gt: startDate },
          // Các trạng thái được coi là "Đã đặt"
          status: { $in: ["CONFIRMED", "PENDING", "PAID"] },
        });

        // 3. Trả về kết quả
        if (conflictBooking) {
          return reply.send({
            available: false,
            message: "Phòng đã có người đặt trong thời gian này.",
          });
        }

        return reply.send({ available: true, message: "Phòng còn trống" });
      } catch (error) {
        console.error("Check Availability Error:", error);
        return reply.status(500).send({ message: "Lỗi server" });
      }
    },
  );
};
