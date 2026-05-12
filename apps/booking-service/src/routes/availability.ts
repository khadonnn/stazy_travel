import { FastifyInstance } from "fastify";
import { prisma } from "@repo/product-db";
import { getHold, RoomHoldError } from "../utils/redis-hold";

/**
 * Route kiểm tra availability - READ-ONLY API
 * Endpoint: GET /check-availability
 *
 *  CHIẾN LƯỢC KIỂM TRA 2 LỚP:
 *
 * LỚP 1 - PostgreSQL (Data Source of Truth):
 *   → Kiểm tra xem đã có booking CONFIRMED/PENDING trong DB chưa
 *
 * LỚP 2 - Redis Hold (Temporary Reservation):
 *   → Kiểm tra xem có user nào đang "giữ chỗ" trong 10 phút không
 *   → Nếu có → báo cho user khác biết để không bị double booking
 *
 *  KHÔNG CẦN LOCK cho read operation:
 *   - Đây là API chỉ đọc (read-only)
 *   - Không ghi data → không có race condition ở đây
 *   - Race condition chỉ xảy ra ở CREATE booking (đã có Redis lock xử lý)
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

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return reply.status(400).send({ error: "Invalid date format" });
    }

    if (checkInDate >= checkOutDate) {
      return reply.status(400).send({
        error: "Check-out date must be after check-in date",
      });
    }

    try {
      // =============================================
      // LỚP 1: KIỂM TRA POSTGRESQL (Source of Truth)
      // =============================================
      let conflictingBooking: any = null;

      try {
        conflictingBooking = await prisma.booking.findFirst({
          where: {
            hotelId: hotelIdNum,
            status: { in: ["PENDING", "CONFIRMED"] },
            // Overlap logic: (StartA < EndB) && (EndA > StartB)
            checkIn: { lt: checkOutDate },
            checkOut: { gt: checkInDate },
          },
          select: {
            bookingId: true,
            status: true,
            checkIn: true,
            checkOut: true,
            guestName: true,
          },
        });
      } catch (dbError) {
        console.error("⚠️ Prisma query failed:", dbError);
        // Fallback: nếu DB lỗi, trả available=true để không block user
        return reply.status(200).send({
          available: true,
          message: "Không thể kiểm tra DB, cho phép đặt phòng.",
        });
      }

      // Nếu đã có booking trong DB → Không available
      if (conflictingBooking) {
        return reply.status(200).send({
          available: false,
          reason: "BOOKED",
          message: "Phòng đã có người đặt trong khoảng thời gian này.",
          conflictDetails: {
            status: conflictingBooking.status,
            checkIn: conflictingBooking.checkIn,
            checkOut: conflictingBooking.checkOut,
          },
        });
      }

      // =============================================
      // LỚP 2: KIỂM TRA REDIS HOLD (Temporary Hold)
      // =============================================
      let activeHold: any = null;

      try {
        activeHold = await getHold(hotelIdNum, checkInDate, checkOutDate);
      } catch (redisError) {
        console.error("⚠️ Redis getHold failed (non-blocking):", redisError);
        // Fallback: nếu Redis lỗi, bỏ qua hold check, vẫn cho phép
      }

      if (activeHold) {
        // Tính thời gian còn lại của hold
        const holdExpiresAt = new Date(activeHold.expiresAt);
        const remainingSeconds = Math.max(
          0,
          Math.floor((holdExpiresAt.getTime() - Date.now()) / 1000),
        );

        return reply.status(200).send({
          available: false,
          reason: "HELD",
          message: `Phòng đang được giữ chỗ bởi khách khác. Thử lại sau ${remainingSeconds} giây.`,
          holdInfo: {
            heldBy: activeHold.userName,
            expiresAt: activeHold.expiresAt,
            remainingSeconds,
          },
        });
      }

      // =============================================
      // AVAILABLE - Không có booking, không có hold
      // =============================================
      return reply.status(200).send({
        available: true,
        message: "Phòng còn trống, bạn có thể đặt!",
      });
    } catch (error) {
      console.error("❌ Check availability unexpected error:", error);
      return reply.status(200).send({
        available: true,
        message: "Không thể kiểm tra, cho phép đặt phòng.",
      });
    }
  });
}
