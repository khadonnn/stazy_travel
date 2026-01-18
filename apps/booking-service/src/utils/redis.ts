import Redis from "ioredis";
import Redlock from "redlock";

// 1. Kết nối Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "stazy-redis",
  port: Number(process.env.REDIS_PORT) || 6379,
});

// 2. Cấu hình Redlock
const redlock = new Redlock(
  // 🔥 FIX LỖI TẠI ĐÂY: Thêm "as any"
  // Lý do: Type definition của ioredis v5 và redlock bị lệch nhau ở hàm eval,
  // nhưng logic chạy thực tế vẫn đúng.
  [redisClient as any],
  {
    driftFactor: 0.01,
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 200,
  },
);

redlock.on("clientError", (error) => {
  // Bỏ qua lỗi nếu redlock không thể gia hạn khóa (thường không quan trọng)
  console.error("Redlock error:", error);
});

export { redisClient, redlock };
