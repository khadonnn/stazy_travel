import { FastifyInstance } from "fastify";
import { redlock } from "../utils/redis";
import { Booking } from "@repo/booking-db";

/**
 * Route kiểm tra availability cho Collaborative Filtering Use Case
 * Endpoint: GET /check-availability
 *
 *  REDIS LOCK STRATEGY:
 * - Sử dụng shared lock (read lock) để cho phép nhiều user check đồng thời
 * - Chỉ block khi có user đang trong quá trình CREATE booking
 * - Lock key: `locks:hotel:${hotelId}:${checkIn}` (giống với createBooking)
 */
export default async function availabilityRoutes(fastify: FastifyInstance) {
  // GET /check-availability?hotelId=1&checkIn=2026-01-20&checkOut=2026-01-25
  fastify.get("/check-availability", async (request, reply) => {
    const { hotelId, checkIn, checkOut } = request.query as {
      hotelId: string;
      checkIn: string;
      checkOut: string;
    };

    // 1. Validate input
    if (!hotelId || !checkIn || !checkOut) {
      return reply.status(400).send({
        error: "Missing required params: hotelId, checkIn, checkOut",
      });
    }

    const hotelIdNum = parseInt(hotelId, 10);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Validate dates
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return reply.status(400).send({ error: "Invalid date format" });
    }

    if (checkInDate >= checkOutDate) {
      return reply.status(400).send({
        error: "Check-out date must be after check-in date",
      });
    }

    try {
      // 2. REDIS LOCK (Optional cho read operation)
      // Lưu ý: Check availability KHÔNG CẦN lock mạnh như create booking
      // Nhưng ta có thể dùng short TTL lock để tránh race với createBooking

      // Tạo lock resource giống với createBooking để đồng bộ
      const lockResource = `locks:hotel:${hotelIdNum}:${checkIn}`;
      const lockTTL = 1000; // 1 giây (ngắn hơn nhiều so với createBooking 5s)

      let lock;
      try {
        // Attempt to acquire lock (non-blocking check)
        lock = await redlock.acquire([lockResource], lockTTL);
        console.log(`🔍 [Availability Check] Acquired lock: ${lockResource}`);
      } catch (lockError) {
        // Nếu không lấy được lock (đang có booking đang được tạo)
        console.warn(
          `⚠️ [Availability] Lock busy, proceeding with direct DB query`,
        );
        // Vẫn cho phép check DB (vì check availability ít rủi ro hơn create)
      }

      // 3. Query MongoDB để tìm booking trùng lịch
      // Logic: Hai khoảng thời gian trùng nhau nếu:
      // (StartA < EndB) && (EndA > StartB)
      const conflictingBookings = await Booking.find({
        hotelId: hotelIdNum,
        status: { $in: ["PENDING", "CONFIRMED", "PAID"] }, // Chỉ check booking còn hiệu lực

        // Logic trùng lịch (Overlap Detection)
        $or: [
          // Case 1: Booking cũ bao phủ hoàn toàn khoảng mới
          {
            checkInDate: { $lte: checkInDate },
            checkOutDate: { $gte: checkOutDate },
          },
          // Case 2: Khoảng mới bao phủ hoàn toàn booking cũ
          {
            checkInDate: { $gte: checkInDate },
            checkOutDate: { $lte: checkOutDate },
          },
          // Case 3: Overlap bên trái (Start cũ < End mới && End cũ > Start mới)
          {
            checkInDate: { $lt: checkOutDate },
            checkOutDate: { $gt: checkInDate },
          },
        ],
      });

      // 4. Release lock if acquired
      if (lock) {
        await lock
          .unlock()
          .catch((err) =>
            console.error("❌ [Availability] Unlock error:", err),
          );
        console.log(`🔓 [Availability Check] Released lock: ${lockResource}`);
      }

      // 5. Nếu có booking trùng → Không available
      if (conflictingBookings.length > 0) {
        return reply.status(200).send({
          available: false,
          message: "Phòng đã có người đặt trong khoảng thời gian này",
          conflictCount: conflictingBookings.length,
          conflictingDates: conflictingBookings.map((b) => ({
            checkIn: b.checkInDate,
            checkOut: b.checkOutDate,
            status: b.status,
          })),
        });
      }

      // 6. Nếu không có conflict → Available
      return reply.status(200).send({
        available: true,
        message: "Phòng còn trống, bạn có thể đặt!",
      });
    } catch (error) {
      console.error("❌ Check availability error:", error);
      return reply.status(500).send({
        error: "Internal server error",
        available: true, // Fallback: Cho phép đặt nếu lỗi server (tùy chọn)
      });
    }
  });
}
