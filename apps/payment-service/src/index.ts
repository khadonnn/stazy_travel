import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { clerkMiddleware } from "@hono/clerk-auth";
import { shouldBeUser } from "./middleware/authMiddleware.js";
import { cors } from "hono/cors";
import paymentRoute from "./routes/payment.js";
import sessionRoute from "./routes/session.route.js";
import webhookRoute from "./routes/webhooks.route.js";
import { consumer, producer } from "./utils/kafka.js";
import { runKafkaSubscriptions } from "./utils/subscriptions.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigins = [
        "http://localhost:3002", // Client
        "http://localhost:3003", // Admin
        "http://localhost:3000", // Backup
      ];
      // Nếu origin gửi lên nằm trong list cho phép -> Trả về chính nó
      if (origin && allowedOrigins.includes(origin)) {
        return origin;
      }
      // Fallback (cho postman hoặc server-to-server)
      return allowedOrigins[0];
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true, // Bắt buộc true
  })
);

app.options("*", (c) => {
  return c.body(null, 204);
});

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

app.route("/vnpay", paymentRoute);
app.route("/sessions", sessionRoute);
app.route("/webhooks", webhookRoute);

// --- START SERVER ---
const start = async () => {
  try {
    console.log("🔄 Connecting to Kafka...");
    await Promise.all([
      producer
        .connect()
        .catch((e) => console.error("Kafka Producer Error:", e.message)),
      consumer
        .connect()
        .catch((e) => console.error("Kafka Consumer Error:", e.message)),
    ]);

    await runKafkaSubscriptions();

    const PORT = 8002;
    serve({
      fetch: app.fetch,
      port: PORT,
    });
    console.log(`🚀 Payment service is running on http://localhost:${PORT}`);
  } catch (err) {
    console.error("💥 Failed to start Payment Service:", err);
    process.exit(1);
  }
};

start();
