import { FastifyInstance } from "fastify";
import { shouldBeAdmin, shouldBeUser } from "../middleware/authMiddleware";
import { Booking } from "@repo/booking-db";

// Định nghĩa kiểu dữ liệu Body gửi lên để TS hiểu
interface CreateBookingBody {
  hotelId: number;
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
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:3002"; 

export const bookingRoute = async (fastify: FastifyInstance) => {

  // 1. API TẠO BOOKING (Quan trọng nhất)
  fastify.post<{ Body: CreateBookingBody }>(
    "/",
    { preHandler: shouldBeUser },
    async (request, reply) => {
      const { hotelId, checkIn, checkOut, contactDetails } = request.body;
      // @ts-ignore: userId được gán từ middleware
      const userId = request.userId;

      try {
        // A. Gọi Product Service để lấy thông tin Hotel mới nhất
        // (Giả sử Product Service có API: GET /api/hotels/:id)
        const hotelRes = await fetch(`${PRODUCT_SERVICE_URL}/api/hotels/${hotelId}`);

        if (!hotelRes.ok) {
          return reply.status(404).send({ message: "Không tìm thấy khách sạn hoặc lỗi kết nối" });
        }

        const hotelData = await hotelRes.json();

        // B. Tính toán số đêm và giá tiền (Logic Backend an toàn)
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        
        // Tính số mili-giây chênh lệch chia cho số mili-giây trong 1 ngày
        const timeDiff = endDate.getTime() - startDate.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (nights <= 0) {
          return reply.status(400).send({ message: "Ngày check-out phải sau check-in" });
        }

        // Giả sử hotelData có trường price (hoặc bạn lấy price từ room)
        const pricePerNight = hotelData.price || 0; 
        const totalPrice = pricePerNight * nights;

        // C. Tạo Booking với SNAPSHOT
        const newBooking = await Booking.create({
          userId,
          hotelId: hotelData.id,
          
          // 🔥 LƯU SNAPSHOT: Copy dữ liệu từ hotelData vào đây
          bookingSnapshot: {
            hotel: {
              id: hotelData.id,
              name: hotelData.name || hotelData.title, // Tuỳ field bên Postgres
              slug: hotelData.slug,
              address: hotelData.address,
              image: hotelData.featuredImage || hotelData.image, 
              stars: hotelData.starRating || 0
            },
            // Nếu có room thì snapshot thêm room vào đây
            room: {
              name: "Standard Room", // Ví dụ default
              priceAtBooking: pricePerNight
            }
          },

          checkIn: startDate,
          checkOut: endDate,
          nights: nights,
          totalPrice: totalPrice,
          contactDetails: contactDetails,
          status: "PENDING"
        });

        return reply.code(201).send(newBooking);

      } catch (error) {
        console.error("Booking Error:", error);
        return reply.status(500).send({ message: "Lỗi hệ thống khi tạo đơn hàng" });
      }
    }
  );

  // 2. API LẤY LỊCH SỬ CỦA USER
  fastify.get(
    "/user-bookings",
    { preHandler: shouldBeUser },
    async (request, reply) => {
       // @ts-ignore
      const userId = request.userId;

      // Lấy danh sách từ MongoDB, sắp xếp mới nhất lên đầu
      const bookings = await Booking.find({ userId: userId }).sort({ createdAt: -1 });

      // Format lại dữ liệu cho Frontend dễ dùng (Optional)
      // Giúp Frontend không cần chọc sâu vào bookingSnapshot
      const formattedBookings = bookings.map(b => ({
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
        createdAt: b.createdAt
      }));

      return reply.send(formattedBookings);
    }
  );

  // 3. API ADMIN (Xem tất cả)
  fastify.get(
    "/bookings",
    { preHandler: shouldBeAdmin }, // Nhớ bật lại auth admin
    async (request, reply) => {
      const bookings = await Booking.find().sort({ createdAt: -1 });
      return reply.send(bookings);
    }
  );
};