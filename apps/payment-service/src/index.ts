import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { clerkMiddleware } from "@hono/clerk-auth";
import { shouldBeUser } from "./middleware/authMiddleware.js";
import { cors } from "hono/cors";
import paymentRoute from "./routes/payment.js";
import sessionRoute from "./routes/session.route.js";
import webhookRoute from "./routes/webhooks.route.js";
// Import producer để gửi tin nhắn, consumer để nhận tin nhắn
import { consumer, producer } from "./utils/kafka.js";
import { runKafkaSubscriptions } from "./utils/subscriptions.js";

const app = new Hono();

// 1. Cấu hình CORS (Giữ nguyên của bạn - rất tốt)
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        "http://localhost:3002", // Client
        "http://localhost:3003", // Admin
        "http://localhost:3000", // Backup
      ];
      if (origin && allowedOrigins.includes(origin)) return origin;
      return allowedOrigins[0];
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true,
  })
);

app.options("*", (c) => c.body(null, 204));

// 2. Webhook Route (Quan trọng: Đặt trước Clerk Middleware)
// Lý do: Webhook Stripe gọi từ Server-to-Server, không có User Token -> Không qua Clerk
app.route("/webhooks", webhookRoute);

// 3. Middleware Auth (Chỉ áp dụng cho các route bên dưới)
app.use("*", clerkMiddleware());

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    uptime: process.uptime(),
    timeStamp: Date.now(),
  });
});

app.get("/test", shouldBeUser, (c) => {
  return c.json({
    message: `payment service is authenticated`,
    userId: c.get("userId"),
  });
});

// 4. Các Route nghiệp vụ
app.route("/vnpay", paymentRoute);
app.route("/sessions", sessionRoute);

// --- START SERVER ---
const start = async () => {
  try {
    console.log("🔄 Connecting to Kafka System...");

    // 5. Kết nối Kafka (Producer & Consumer)
    // Phải await connect xong thì mới start server để đảm bảo không bị lỗi mất tin nhắn
    await Promise.all([
      producer
        .connect()
        .then(() =>
          console.log("✅ Kafka Producer Connected (Ready to send emails)")
        ),
      consumer
        .connect()
        .then(() =>
          console.log("✅ Kafka Consumer Connected (Ready to create products)")
        ),
    ]);

    // 6. Chạy Subscription (Lắng nghe Product Service)
    await runKafkaSubscriptions();

    const PORT = 8002;
    serve({
      fetch: app.fetch,
      port: PORT,
    });
    console.log(`🚀 Payment service is running on http://localhost:${PORT}`);
  } catch (err) {
    console.error("💥 Failed to start Payment Service:", err);
    // Exit process nếu không kết nối được Kafka (để tránh chạy server lỗi)
    process.exit(1);
  }
};

start();
