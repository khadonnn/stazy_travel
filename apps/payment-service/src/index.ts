import { serve } from "@hono/node-server";

import { Hono } from "hono";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { shouldBeUser } from "./middleware/authMiddleware.js";
import { ProductCode, VNPay, VnpLocale, ignoreLogger, dateFormat } from "vnpay";

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
    origin: ["http://localhost:3002"], // Frontend URL
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true, // Cho phép gửi cookie/token
  })
);
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
    message: `payment service is authenticated}`,
    userId: c.get("userId"),
  });
});
app.route("/vnpay", paymentRoute);

app.route("/sessions", sessionRoute);
app.route("/webhooks", webhookRoute);

const start = async () => {
  try {
    console.log("🔄 Connecting to Kafka...");
    // Sửa cú pháp: Không để await bên trong mảng Promise.all
    await Promise.all([
      producer
        .connect()
        .catch((e) => console.error("Kafka Producer Error:", e.message)),
      consumer
        .connect()
        .catch((e) => console.error("Kafka Consumer Error:", e.message)),
    ]);

    await runKafkaSubscriptions();

    serve({
      fetch: app.fetch,
      port: 8002,
    });
    console.log("🚀 Payment service is running on http://localhost:8002");
  } catch (err) {
    console.error("💥 Failed to start Payment Service:", err);
    process.exit(1);
  }
};

start();
