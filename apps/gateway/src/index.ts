import cors from "@fastify/cors";
import proxy from "@fastify/http-proxy";
import Fastify from "fastify";

const PORT = 3000;
const HOST = "0.0.0.0";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: ["http://localhost:3002", "http://localhost:3003"],
  credentials: true,
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
