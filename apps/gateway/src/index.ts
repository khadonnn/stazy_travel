import cors from "@fastify/cors";
import proxy from "@fastify/http-proxy";
import Fastify from "fastify";
import { burstLimiter, globalLimiter, hardLimiter } from "@repo/redis";

const PORT = 3000;
const HOST = "0.0.0.0";

const app = Fastify({
  logger: true,
  trustProxy: true,
});

await app.register(cors, {
  origin: ["http://localhost:3002", "http://localhost:3003"],
  credentials: true,
});

app.addHook("onRequest", async (request, reply) => {
  if (request.method === "OPTIONS" || request.url === "/health") {
    return;
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  const clientIp =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
      ?.split(",")[0]
      ?.trim() ||
    request.ip ||
    request.socket.remoteAddress ||
    "unknown";

  const [burstResult, globalResult, hardResult] = await Promise.allSettled([
    burstLimiter.consume(clientIp),
    globalLimiter.consume(clientIp),
    hardLimiter.consume(clientIp),
  ]);

  const hardBlocked = hardResult.status === "rejected";
  const burstBlocked = burstResult.status === "rejected";
  const globalBlocked = globalResult.status === "rejected";

  if (hardBlocked) {
    return reply.code(429).send({
      success: false,
      message: "Too many requests. IP temporarily blocked.",
      retryAfter: 60 * 30,
    });
  }

  if (burstBlocked || globalBlocked) {
    return reply.code(429).send({
      success: false,
      message: "Too many requests",
    });
  }
});

await app.register(proxy, {
  upstream: "http://localhost:8000",
  prefix: "/api/products",
  rewritePrefix: "/",
});

await app.register(proxy, {
  upstream: "http://localhost:8001",
  prefix: "/api/bookings",
  rewritePrefix: "/",
});

await app.register(proxy, {
  upstream: "http://localhost:8002",
  prefix: "/api/payments",
  rewritePrefix: "/",
});

await app.register(proxy, {
  upstream: "http://localhost:8008",
  prefix: "/api/search",
  rewritePrefix: "/",
});

app.get("/health", async () => {
  return {
    service: "gateway",
    status: "ok",
    port: PORT,
  };
});

try {
  await app.listen({
    port: PORT,
    host: HOST,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
