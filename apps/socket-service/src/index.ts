import Fastify from "fastify";
import socketioServer from "fastify-socket.io";
import dotenv from "dotenv";
import { Server } from "socket.io";
import cors from "@fastify/cors";
//  1. IMPORT PRISMA (Thay vì MongoDB)
import { prisma } from "@repo/product-db";

dotenv.config();

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}

const PORT = Number(process.env.PORT) || 3005;
const fastify = Fastify({ logger: true });

// Cấu hình CORS cho Fastify (HTTP)
fastify.register(cors, {
  origin: "*", // Hoặc danh sách domain cụ thể: ["http://localhost:3002", "http://localhost:3003"]
  methods: ["GET", "POST"],
});

// Đăng ký Socket.io
fastify.register(socketioServer, {
  cors: {
    origin: "*", // Cho phép client kết nối socket
    methods: ["GET", "POST"],
  },
});

const startServer = async () => {
  try {
    //  2. TEST KẾT NỐI POSTGRES (Prisma đã tự kết nối khi query)
    await prisma.$connect();
    fastify.log.info("✅ Socket Service connected to PostgreSQL via Prisma");

    await fastify.ready();
    const io = fastify.io;

    // --- LOGIC SOCKET ---
    io.on("connection", (socket: any) => {
      const { role, userId } = socket.handshake.query;

      // Log kết nối để debug
      console.log(
        `🔌 Connected: ${socket.id} | Role: ${role || "unknown"} | ID: ${userId || "guest"}`,
      );

      // --- JOIN ROOMS ---
      if (role === "admin") {
        socket.join("admin-channel"); // Room thông báo
        socket.join("admin-support-room"); // Room chat support
        console.log(`👮 Admin joined support rooms`);
      } else if (userId) {
        socket.join(`user-${userId}`); // Room riêng của user
        console.log(`👤 User joined room: user-${userId}`);
      }

      // --- 3. XỬ LÝ TIN NHẮN TỪ CLIENT (USER) ---
      socket.on("client_message", async (data: any) => {
        console.log(`📩 User ${data.userId} sent:`, data.text);

        try {
          // A. LƯU VÀO POSTGRESQL (via Prisma)
          const savedMsg = await prisma.chatMessage.create({
            data: {
              userId: data.userId,
              sender: "USER", // Prisma enum: USER | ADMIN | AI
              text: data.text,
              isRead: false, // Mặc định là chưa đọc để hiện Badge đỏ bên Admin
              metadata: {
                userName: data.userName || "Khách hàng ẩn danh",
              },
            },
          });

          // B. GỬI CHO ADMIN (Realtime)
          io.to("admin-support-room").emit("receive_message_from_user", {
            id: savedMsg.id,
            userId: data.userId,
            userName: data.userName, // Client gửi tên lên để Admin hiển thị ngay
            text: data.text,
            timestamp: savedMsg.createdAt,
          });
        } catch (error) {
          console.error("❌ Error saving client message:", error);
        }
      });

      // --- 4. XỬ LÝ TIN NHẮN TỪ ADMIN ---
      socket.on("admin_reply", async (data: any) => {
        console.log(`🗣️ Admin replied to ${data.targetUserId}:`, data.text);

        try {
          // A. LƯU VÀO POSTGRESQL (via Prisma)
          const savedMsg = await prisma.chatMessage.create({
            data: {
              userId: data.targetUserId, // Quan trọng: userId của cuộc hội thoại
              sender: "ADMIN", // Prisma enum
              text: data.text,
              isRead: true, // Admin tự nhắn thì coi như đã đọc
              metadata: {
                userName: data.userName || "Khách hàng (No Name)",
                hotels: [], // Mặc định rỗng hoặc lấy từ data nếu có
              },
            },
          });

          // B. GỬI CHO USER CỤ THỂ (Realtime)
          io.to(`user-${data.targetUserId}`).emit("admin_message", {
            id: savedMsg.id,
            text: data.text,
            sender: "admin",
            timestamp: savedMsg.createdAt,
          });
        } catch (error) {
          console.error("❌ Error saving admin reply:", error);
        }
      });

      // --- LOGIC KHÁC (Booking) ---
      socket.on("join-booking-room", (bookingId: string) => {
        socket.join(`booking-${bookingId}`);
      });

      socket.on("disconnect", () => {
        // console.log(`❌ Disconnected: ${socket.id}`);
      });
    });

    // Start Server
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Socket Service running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();
