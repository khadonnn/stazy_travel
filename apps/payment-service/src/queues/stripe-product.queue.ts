import type { Queue, Worker } from "@repo/bullmq";
import { createQueue, createWorker, setupQueueEvents } from "@repo/bullmq";
import {
  createStripeProduct,
  deleteStripeProduct,
} from "../utils/stripeProduct.js";

export interface StripeProductJobData {
  eventId: string;
  action: "CREATE" | "DELETE";
  payload: any;
}

export const createStripeProductQueue = (): Queue<StripeProductJobData> => {
  return createQueue<StripeProductJobData>("payment:stripe-product");
};

export const enqueueStripeProductJob = async (
  queue: Queue<StripeProductJobData>,
  data: StripeProductJobData,
): Promise<string> => {
  const jobId = `stripe-product:${data.eventId}`;
  const job = await queue.add(jobId, data, {
    jobId,
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  });

  return job.id!;
};

export const createStripeProductWorker = (): Worker<StripeProductJobData> => {
  return createWorker<StripeProductJobData>(
    "payment:stripe-product",
    async (job) => {
      const { action, payload } = job.data;

      if (action === "CREATE") {
        await createStripeProduct(payload);
        return { success: true, action, productId: payload?.id };
      }

      if (action === "DELETE") {
        const productId = payload?.id || payload;
        await deleteStripeProduct(productId);
        return { success: true, action, productId };
      }

      return { success: false, action, reason: "Unknown action" };
    },
    { concurrency: 5 },
  );
};

export const setupStripeProductQueueObservability = (
  queue: Queue<StripeProductJobData>,
) => {
  setupQueueEvents(queue.name);
};
