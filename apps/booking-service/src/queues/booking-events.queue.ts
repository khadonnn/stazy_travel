import type { Queue, Worker } from "@repo/bullmq";
import { createQueue, createWorker, setupQueueEvents } from "@repo/bullmq";
import { prisma, Prisma } from "@repo/product-db";
import type { SagaTimeoutJobData } from "./saga-timeout.queue.js";
import { updateBookingStatusToPaid } from "../utils/booking.js";

const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

export interface BookingEventJobData {
  eventId: string;
  topic: string;
  eventType: string;
  bookingId: string;
  payload: any;
}

export const createBookingEventsQueue = (): Queue<BookingEventJobData> => {
  return createQueue<BookingEventJobData>("booking-events");
};

export const enqueueBookingEvent = async (
  queue: Queue<BookingEventJobData>,
  data: BookingEventJobData,
): Promise<string> => {
  const jobId = `booking-event-${data.eventId}`;
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

export const createBookingEventsWorker = (
  sagaTimeoutQueue?: Queue<SagaTimeoutJobData>,
): Worker<BookingEventJobData, any, string> => {
  return createWorker<BookingEventJobData>(
    "booking-events",
    async (job) => {
      const { eventId, topic, eventType, bookingId, payload } = job.data;

      if (!eventId || !topic || !bookingId) {
        throw new Error(
          "Missing required event data (eventId/topic/bookingId)",
        );
      }

      if (
        eventType === "PAYMENT_PROCESSED" ||
        eventType === "PAYMENT_SUCCESS" ||
        payload?.status === "PAID"
      ) {
        const result = await prisma.$transaction(async (tx) => {
          const inserted = await tx.$queryRaw<Array<{ eventId: string }>>`
            INSERT INTO "processed_events" ("eventId", "topic", "createdAt")
            VALUES (${eventId}, ${topic}, NOW())
            ON CONFLICT ("eventId") DO NOTHING
            RETURNING "eventId"
          `;

          if (inserted.length === 0) {
            console.log(
              `✅ [Booking Worker] Event ${eventId} already processed`,
            );
            return { duplicate: true };
          }

          await updateBookingStatusToPaid(bookingId, payload, tx);

          return { duplicate: false };
        });

        if (!result.duplicate && sagaTimeoutQueue) {
          const timeoutJobId = `timeout-${bookingId}`;
          const timeoutJob = await sagaTimeoutQueue.getJob(timeoutJobId);
          if (timeoutJob) {
            await timeoutJob.remove();
            console.log(
              `✅ [Booking Worker] Removed timeout job after payment success: ${bookingId}`,
            );
          }
        }

        return result;
      }

      if (eventType === "PAYMENT_FAILED" || payload?.status === "FAILED") {
        const result = await prisma.$transaction(async (tx) => {
          const inserted = await tx.$queryRaw<Array<{ eventId: string }>>`
            INSERT INTO "processed_events" ("eventId", "topic", "createdAt")
            VALUES (${eventId}, ${topic}, NOW())
            ON CONFLICT ("eventId") DO NOTHING
            RETURNING "eventId"
          `;

          if (inserted.length === 0) {
            console.log(
              `✅ [Booking Worker] Event ${eventId} already processed`,
            );
            return { duplicate: true, cancelled: false };
          }

          const existingBooking = await tx.booking.findFirst({
            where: { bookingId },
            select: { id: true, userId: true, hotelId: true },
          });

          if (!existingBooking) {
            console.warn(`⚠️ [Booking Worker] Booking not found: ${bookingId}`);
            return { duplicate: false, cancelled: false };
          }

          await tx.booking.update({
            where: { id: existingBooking.id },
            data: {
              status: "CANCELLED",
              paymentStatus: "FAILED",
              paymentFailureReason:
                payload?.reason || "Payment processing failed",
              updatedAt: new Date(),
            },
          });

          await tx.outboxMessage.create({
            data: {
              dedupKey: `booking:${bookingId}:BOOKING_CANCELLED_PAYMENT_FAILED`,
              aggregateType: "Booking",
              aggregateId: bookingId,
              eventType: "BOOKING_CANCELLED_PAYMENT_FAILED",
              topic: "booking-events",
              payload: {
                event: "BOOKING_CANCELLED_PAYMENT_FAILED",
                bookingId,
                userId: existingBooking.userId,
                hotelId: existingBooking.hotelId,
                reason: payload?.reason || "Payment processing failed",
                cancelledAt: new Date().toISOString(),
              },
              status: "PENDING",
            },
          });

          return { duplicate: false, cancelled: true };
        });

        if (result.cancelled && sagaTimeoutQueue) {
          const timeoutJobId = `timeout-${bookingId}`;
          const timeoutJob = await sagaTimeoutQueue.getJob(timeoutJobId);
          if (timeoutJob) {
            await timeoutJob.remove();
            console.log(
              `🗑️ [Booking Worker] Removed timeout job after payment failure: ${bookingId}`,
            );
          }
        }

        return result;
      }

      return { skipped: true, eventType };
    },
    {
      concurrency: 5,
    },
  );
};

export const setupBookingEventsObservability = (
  queue: Queue<BookingEventJobData>,
) => {
  const queueEvents = setupQueueEvents("booking-events");

  queueEvents.on("completed", ({ jobId }) => {
    console.log(`✅ [Booking Events Queue] Job completed: ${jobId}`);
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(
      `❌ [Booking Events Queue] Job failed: ${jobId} - ${failedReason}`,
    );
  });

  return queueEvents;
};
