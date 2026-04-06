import Fastify from "fastify";
import { clerkPlugin } from "@clerk/fastify";
import { shouldBeUser } from "./middleware/authMiddleware.js";
import { connectBookingDB } from "@repo/booking-db";
import { bookingRoute } from "./routes/booking.js";
import { messageRoute } from "./routes/message.js";
import { adminRoute } from "./routes/admin.js";
import availabilityRoutes from "./routes/availability.js";
import { producer, consumer } from "./utils/kafka.js"; // Import cả consumer để disconnect
import { runKafkaSubscriptions } from "./utils/subscriptions.js";
import { startCronJobs } from "./cron/analyticsJob.js";
import { startAITrainingJob } from "./cron/aiTrainingJob.js";
import cors from "@fastify/cors";
const fastify = Fastify({ logger: true });
await fastify.register(cors, {
  origin: [
    "http://localhost:3002", // Client App
    "http://localhost:3003", // Admin App
    "http://localhost:3000", // Backup
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],
  credentials: true, // Cho phép gửi token/cookie
});
fastify.register(clerkPlugin);

// Health Check
fastify.get("/health", async (request, reply) => {
  return reply.status(200).send({
    service: "Booking Service",
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// Test Auth
fastify.get("/test", { preHandler: shouldBeUser }, (request, reply) => {
  return reply.send({
    message: "Booking service is authenticated!",
    userId: request.userId,
  });
});

// Đăng ký Routes
fastify.register(bookingRoute, { prefix: "/bookings" }); //  Thêm prefix
fastify.register(messageRoute, { prefix: "/messages" });
fastify.register(adminRoute, { prefix: "/admin" });
fastify.register(availabilityRoutes);

const start = async () => {
  try {
    // 1. Kết nối hạ tầng (DB & Kafka Producer)
    await Promise.all([connectBookingDB(), producer.connect()]);
    fastify.log.info("✅ Database & Kafka Producer connected");

    // 2. Kích hoạt Consumer lắng nghe tin nhắn
    await runKafkaSubscriptions();

    //  3. Start Cron Jobs (Analytics & AI Training)
    startCronJobs(); // Analytics: Mỗi ngày 00:00
    startAITrainingJob(); // AI Training: Mỗi ngày 02:00

    // 4. Start Server
    // Quan trọng: host '0.0.0.0' để chạy được trong Docker Container
    const PORT = parseInt(process.env.PORT || "8001");
    await fastify.listen({ port: PORT, host: "0.0.0.0" });

    console.log(`🚀 Booking service is running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// --- GRACEFUL SHUTDOWN (QUAN TRỌNG) ---
// Xử lý khi bấm Ctrl+C hoặc Docker stop container
const closeGracefully = async (signal: string) => {
  console.log(`Received signal to terminate: ${signal}`);

  // Tắt server không nhận request mới
  await fastify.close();

  // Ngắt kết nối Kafka & DB
  await producer.disconnect();
  await consumer.disconnect();
  // await mongoose.disconnect(); // Nếu cần thiết

  console.log("🛑 Service shut down gracefully");
  process.exit(0);
};

process.on("SIGINT", () => closeGracefully("SIGINT"));
process.on("SIGTERM", () => closeGracefully("SIGTERM"));

start();
