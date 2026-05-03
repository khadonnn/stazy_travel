import type { Queue, Worker } from "@repo/bullmq";
import { createQueue, createWorker, setupQueueEvents } from "@repo/bullmq";
import { handleKafkaMessage } from "../utils/emailHandlers.js";

export interface EmailEventJobData {
  eventId: string;
  eventType: "WELCOME" | "BOOKING_CREATED" | "PAYMENT_SUCCESS";
  message: any;
}

export const createEmailEventsQueue = () => {
  return createQueue<EmailEventJobData>("email-events");
};

export const enqueueEmailEvent = async (
  queue: Queue<EmailEventJobData>,
  data: EmailEventJobData,
): Promise<string> => {
  const jobId = `email-event-${data.eventId}`;
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

export const createEmailEventsWorker = (): Worker<EmailEventJobData> => {
  return createWorker<EmailEventJobData>(
    "email-events",
    async (job) => {
      await handleKafkaMessage(job.data.message, job.data.eventType);
      return {
        success: true,
        eventId: job.data.eventId,
        eventType: job.data.eventType,
      };
    },
    { concurrency: 10 },
  );
};

export const setupEmailEventsQueueObservability = (
  queue: Queue<EmailEventJobData>,
) => {
  setupQueueEvents(queue.name);
};
