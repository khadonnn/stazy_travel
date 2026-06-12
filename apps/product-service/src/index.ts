import express, { NextFunction, Request, Response } from "express";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import { shouldBeUser } from "./middleware/authMiddleware.js";
import productRouter from "./routes/product.route.js";
import categoryRouter from "./routes/category.route.js";
import userRouter from "./routes/user.route.js";
import { consumer, producer } from "./utils/kafka.js";

const app = express();
const PORT = process.env.PORT || 8000;

// 1. Cấu hình CORS (Phải đặt đầu tiên để xử lý Preflight OPTIONS request)
app.use(
  cors({
    origin: [
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "clerk-db-auth-token",
    ],
  }),
);

// 2. Middleware cơ bản
app.use(express.json());

// Handle CORS Preflight (OPTIONS) BEFORE Clerk Middleware
// Fix lỗi "Failed to fetch" do Express 5 / path-to-regexp v8 không hỗ trợ app.options("*", ...)
// Dùng middleware check method OPTIONS thay vì route catch-all
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

app.use(clerkMiddleware());

// 3. Health Check & Test Routes
app.use("/health", (req: Request, res: Response) => {
  return res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timeStamp: Date.now(),
  });
});

app.get("/test", shouldBeUser, (req: any, res: Response) => {
  res.json({ message: "Product service authenticated", userId: req.userId });
});

// 4. API Routes
app.use("/hotels", productRouter);
app.use("/categories", categoryRouter);
app.use("/users", userRouter);

// 5. Global Error Handler (Luôn đặt cuối cùng sau các route)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ Error handler called:", err);
  return res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

// 6. Khởi động Server và Kafka
const start = async () => {
  try {
    console.log("🔄 Đang kết nối Kafka...");

    await Promise.all([
      producer
        .connect()
        .catch((e) => console.error("Kafka Producer Error:", e.message)),
      consumer
        .connect()
        .catch((e) => console.error("Kafka Consumer Error:", e.message)),
    ]);

    app.listen(PORT, () => {
      console.log(`🚀 Product service is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("💥 Failed to start server:", error);
    process.exit(1);
  }
};

start();
