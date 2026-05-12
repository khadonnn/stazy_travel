import Redis from "ioredis";
import Redlock from "redlock";

// 1. Kết nối Redis
// - Khi chạy local (không Docker): dùng "localhost"
// - Khi chạy Docker: set REDIS_HOST=stazy-redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) {
      console.error("❌ Redis: Too many retry attempts, giving up.");
      return null; // stop retrying
    }
    return Math.min(times * 200, 2000); // exponential backoff
  },
  lazyConnect: true, // Don't crash on startup if Redis is down
});

// Auto-connect with error handling
redisClient.connect().catch((err) => {
  console.error(
    "⚠️ Redis initial connection failed (will retry):",
    err.message,
  );
});

redisClient.on("error", (err) => {
  // Suppress repeated connection errors to avoid log spam
  if (err.message !== "Connection is closed.") {
    console.error("⚠️ Redis error:", err.message);
  }
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected");
});

// 2. Cấu hình Redlock
const redlock = new Redlock(
  //  FIX LỖI TẠI ĐÂY: Thêm "as any"
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
