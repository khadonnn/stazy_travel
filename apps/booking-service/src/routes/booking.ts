import { FastifyInstance } from "fastify";
import { shouldBeAdmin, shouldBeUser } from "../middleware/authMiddleware";
import { prisma } from "@repo/product-db";
import { createBooking } from "../utils/booking";
import { getSagaTimeoutQueue } from "../utils/queues.js";
import { RoomHoldError } from "../utils/redis-hold";
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
        const sagaTimeoutQueue = getSagaTimeoutQueue();
        const newBooking = await createBooking(
          userId,
          {
            hotelId: realHotelId,
            checkIn: startDate, // Truyền Date object luôn
            checkOut: endDate,
            totalAmount: totalPrice,
            //  Truyền thêm các dữ liệu phụ trợ để hàm utils lưu vào DB
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
          },
          sagaTimeoutQueue || undefined,
        );

        // --- BƯỚC 3: TRẢ VỀ KẾT QUẢ ---
        return reply.code(201).send(newBooking);
      } catch (error: any) {
        console.error("❌ Booking Error:", error.message);

        // Bắt lỗi Redis Hold (phòng đang được giữ chỗ bởi user khác)
        if (error instanceof RoomHoldError) {
          return reply.status(409).send({
            message: error.message,
            reason: "HELD",
            heldBy: error.heldByUserName,
            holdExpiresAt: error.holdExpiresAt.toISOString(),
            remainingSeconds: Math.max(
              0,
              Math.floor((error.holdExpiresAt.getTime() - Date.now()) / 1000),
            ),
          });
        }

        // Bắt lỗi Redis Lock (Race condition - Double-check locking)
        if (error.message.includes("giữ bởi khách khác")) {
          return reply.status(409).send({ message: error.message });
        }

        return reply
          .status(500)
          .send({ message: "Lỗi hệ thống khi tạo đơn hàng" });
      }
    },
  );

  // 2. API LẤY LỊCH SỬ CỦA USER (PostgreSQL)
  fastify.get(
    "/user-bookings",
    { preHandler: shouldBeUser },
    async (request, reply) => {
      // @ts-ignore
      const userId = request.userId;

      // Lấy danh sách từ PostgreSQL, sắp xếp mới nhất lên đầu
      const bookings = await prisma.booking.findMany({
        where: { userId: userId },
        orderBy: { createdAt: "desc" },
      });

      // Format lại dữ liệu cho Frontend dễ dùng
      const formattedBookings = bookings.map((b) => ({
        id: b.id,
        status: b.status,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        totalPrice: Number(b.totalAmount),
        nights: b.nights,
        // Lấy thông tin hotel từ snapshot ra ngoài cho dễ truy cập
        hotel: (b.bookingSnapshot as any)?.hotel || null,
        room: (b.bookingSnapshot as any)?.room || null,
        contactDetails: (b.contactDetails as any) || {
          fullName: b.guestName,
          email: b.guestEmail,
          phone: b.guestPhone,
        },
        createdAt: b.createdAt,
      }));

      return reply.send(formattedBookings);
    },
  );

  // 3. API ADMIN (Xem tất cả - PostgreSQL)
  fastify.get("/", { preHandler: shouldBeAdmin }, async (request, reply) => {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: { hotel: { select: { id: true, title: true, slug: true } } },
    });
    return reply.send(bookings);
  });

  // 3.5 API LẤY 5 BOOKING MỚI NHẤT (For Recent Bookings Widget - PostgreSQL)
  fastify.get("/recent", async (request, reply) => {
    const recentBookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        hotel: {
          select: { id: true, title: true, slug: true, featuredImage: true },
        },
      },
    });
    return reply.send(recentBookings);
  });

  // NOTE: /check-availability đã được chuyển sang routes/availability.ts
  // (Read-only API: kiểm tra PostgreSQL + Redis Hold)
};
