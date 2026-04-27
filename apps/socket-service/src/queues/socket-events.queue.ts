import type { Queue, Worker } from "@repo/bullmq";
import { createQueue, createWorker, setupQueueEvents } from "@repo/bullmq";
import { notifyAdmin, notifyUserSuccess } from "../utils/socket.js";

export interface SocketEventJobData {
  eventId: string;
  bookingId: string;
  payload: any;
}

export const createSocketEventsQueue = (): Queue<SocketEventJobData> => {
  return createQueue<SocketEventJobData>("socket:events");
};

export const enqueueSocketEvent = async (
  queue: Queue<SocketEventJobData>,
  data: SocketEventJobData,
): Promise<string> => {
  const jobId = `socket-event:${data.eventId}`;
  const job = await queue.add(jobId, data, {
    jobId,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  });

  return job.id!;
};

export const createSocketEventsWorker = (): Worker<SocketEventJobData> => {
  return createWorker<SocketEventJobData>(
    "socket:events",
    async (job) => {
      const { bookingId, payload } = job.data;
      notifyAdmin(payload);
      notifyUserSuccess(bookingId, payload);
      return { success: true, bookingId };
    },
    { concurrency: 10 },
  );
};

export const setupSocketEventsQueueObservability = (
  queue: Queue<SocketEventJobData>,
) => {
  setupQueueEvents(queue.name);
};
