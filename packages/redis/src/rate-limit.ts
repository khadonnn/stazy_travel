import { RateLimiterRedis } from "rate-limiter-flexible";

import { redis } from "./client";

export const globalLimiter = new RateLimiterRedis({
  storeClient: redis,

  keyPrefix: "global",

  points: 120,
  duration: 60,

  blockDuration: 60 * 5,
});

export const burstLimiter = new RateLimiterRedis({
  storeClient: redis,

  keyPrefix: "burst",

  points: 20,
  duration: 10,
});

export const hardLimiter = new RateLimiterRedis({
  storeClient: redis,

  keyPrefix: "hard",

  points: 300,
  duration: 60,

  blockDuration: 60 * 30,
});
