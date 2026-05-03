import { Queue, Worker, QueueEvents } from "bullmq";
import type { ConnectionOptions } from "bullmq";

// ============================================
// REDIS CLIENT SETUP
// ============================================
export const createRedisConnection = () => {
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    enableOfflineQueue: false,
  } as ConnectionOptions;
};

// ============================================
// QUEUE FACTORY
// ============================================
export const createQueue = <T>(queueName: string) => {
  const connection = createRedisConnection();
  return new Queue<T>(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
      },
      removeOnFail: {
        age: 86400 * 7, // Keep failed jobs for 7 days (for debugging)
      },
    },
  });
};

// ============================================
// QUEUE EVENTS SETUP
// ============================================
export const setupQueueEvents = (queueName: string) => {
  const connection = createRedisConnection();
  const queueEvents = new QueueEvents(queueName, {
    connection,
  });

  queueEvents.on("completed", ({ jobId }) => {
    console.log(`✅ [${queueName}] Job completed: ${jobId}`);
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`❌ [${queueName}] Job failed: ${jobId}`, failedReason);
  });

  queueEvents.on("progress", ({ jobId, data }) => {
    const progressText =
      typeof data === "number" ? `${data}%` : JSON.stringify(data);
    console.log(`⏳ [${queueName}] Job progress: ${jobId} - ${progressText}`);
  });

  return queueEvents;
};

// ============================================
// WORKER FACTORY
// ============================================
export const createWorker = <T>(
  queueName: string,
  processor: (job: any) => Promise<any>,
  options?: {
    concurrency?: number;
  },
) => {
  const connection = createRedisConnection();
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency: options?.concurrency || 5,
  });

  worker.on("completed", (job) => {
    console.log(`✅ [${queueName}] Processed: ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ [${queueName}] Failed: ${job?.id}`, err.message);
  });

  return worker;
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
export const closeQueue = async (queue: Queue) => {
  await queue.close();
  console.log(`🔓 Queue closed: ${queue.name}`);
};

export const closeWorker = async (worker: Worker) => {
  await worker.close();
  console.log(`🔓 Worker closed: ${worker.name}`);
};
