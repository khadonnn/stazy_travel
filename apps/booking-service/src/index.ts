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
import {
  startOutboxWorker,
  stopOutboxWorker,
} from "./workers/outbox-worker.js";
import { startCronJobs } from "./cron/analyticsJob.js";
import { startAITrainingJob } from "./cron/aiTrainingJob.js";
import {
  createSagaTimeoutWorker,
  setupSagaTimeoutObservability,
} from "./queues/saga-timeout.queue.js";
import {
  createBookingEventsWorker,
  setupBookingEventsObservability,
} from "./queues/booking-events.queue.js";
import { closeQueue, closeWorker } from "@repo/bullmq";
import { setSagaTimeoutQueue } from "./utils/queues.js";
import cors from "@fastify/cors";

let sagaTimeoutWorker: any;
let bookingEventsWorker: any;
let sagaTimeoutQueue: any;
let bookingEventsQueue: any;
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

    // 3. Kích hoạt Outbox Relay
    await startOutboxWorker();

    // 4. Kích hoạt BullMQ Saga Timeout Queue
    const { initializeQueues } = await import("./utils/queues.js");
    const queues = await initializeQueues();
    sagaTimeoutQueue = queues.sagaTimeout;
    bookingEventsQueue = queues.bookingEvents;
    sagaTimeoutWorker = createSagaTimeoutWorker();
    bookingEventsWorker = createBookingEventsWorker(queues.sagaTimeout);
    setupSagaTimeoutObservability(queues.sagaTimeout);
    setupBookingEventsObservability(queues.bookingEvents);
    console.log("✅ Saga Timeout Queue initialized");
    console.log("✅ Booking Events Queue initialized");

    startAITrainingJob(); // AI Training: Mỗi ngày 02:00

    // 5. Start Server
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
  stopOutboxWorker();
  if (sagaTimeoutWorker) await closeWorker(sagaTimeoutWorker);
  if (bookingEventsWorker) await closeWorker(bookingEventsWorker);
  if (sagaTimeoutQueue) await closeQueue(sagaTimeoutQueue);
  if (bookingEventsQueue) await closeQueue(bookingEventsQueue);
  await producer.disconnect();
  await consumer.disconnect();
  // await mongoose.disconnect(); // Nếu cần thiết

  console.log("🛑 Service shut down gracefully");
  process.exit(0);
};

process.on("SIGINT", () => closeGracefully("SIGINT"));
process.on("SIGTERM", () => closeGracefully("SIGTERM"));

start();
