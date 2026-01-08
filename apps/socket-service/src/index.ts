import Fastify from "fastify";
import socketioServer from "fastify-socket.io";
import dotenv from "dotenv";
import { producer, consumer } from "./utils/kafka";
import { Server } from "socket.io"; // 1. Import thêm Server type từ socket.io

dotenv.config();

// 2. 🔥 THÊM ĐOẠN NÀY ĐỂ FIX LỖI TYPE
declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}

const PORT = Number(process.env.PORT) || 3005;

const fastify = Fastify({ logger: true });

// 1. Đăng ký Socket.io
fastify.register(socketioServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const startServer = async () => {
  try {
    await fastify.ready();

    // ✅ Lúc này TypeScript đã hiểu .io là gì, không còn báo lỗi
    const io = fastify.io;

    // 2. Cấu hình Socket Connection
    // @ts-ignore: Dùng tạm any hoặc define type cho socket nếu muốn kỹ hơn
    io.on("connection", (socket: any) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      socket.on("join-admin-room", () => {
        socket.join("admin-channel");
        console.log(`👮 Admin joined admin-channel`);
      });

      socket.on("join-booking-room", (bookingId: string) => {
        socket.join(`booking-${bookingId}`);
      });
    });

    // 3. KAFKA CONSUMER
    await consumer.connect();

    await consumer.subscribe([
      {
        topicName: "booking.confirmed",
        topicHandler: async (message) => {
          const dataString = message.value?.toString() || "{}";
          const data = JSON.parse(dataString);

          console.log("📨 Received Kafka [booking.confirmed]:", data.bookingId);

          io.to("admin-channel").emit("admin-new-booking", {
            message: "Có đơn hàng mới!",
            ...data,
          });

          io.to(`booking-${data.bookingId}`).emit("booking-success", data);
        },
      },
    ]);

    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Socket Service running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();
