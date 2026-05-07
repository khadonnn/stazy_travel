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
  const worker = createWorker<BookingEventJobData>(
    "booking-events",
    async (job) => {
      const { eventId, topic, eventType, bookingId, payload } = job.data;

      console.log(
        `👷 [WORKER] Bắt đầu xử lý job thanh toán cho booking_id: ${bookingId}, eventId: ${eventId}, eventType: ${eventType}`,
      );

      if (!eventId || !topic || !bookingId) {
        console.error(
          `❌ [WORKER] Missing required event data: eventId=${eventId}, topic=${topic}, bookingId=${bookingId}`,
        );
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

          // TRIGGER EMAIL DIRECTLY (bypass Kafka issue)
          try {
            const emailPayload = {
              to: payload?.customerEmail || payload?.email,
              user: payload?.customerName || payload?.user,
              hotel: payload?.hotelInfo?.name || payload?.hotel,
              amount: payload?.amount || 0,
              checkInDate: payload?.checkInDate,
              checkOutDate: payload?.checkOutDate,
            };
            if (emailPayload.to) {
              console.log(
                `📧 [WORKER] Sending confirmation email to: ${emailPayload.to}`,
              );
              // Fire-and-forget: send email via email-service HTTP endpoint
              fetch("http://localhost:8003/send-confirmation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(emailPayload),
              }).catch((e) =>
                console.warn(
                  "📧 [WORKER] Email service call failed (non-critical):",
                  e.message,
                ),
              );
            } else {
              console.warn(
                "📧 [WORKER] No email address in payload, skipping email",
              );
            }
          } catch (emailErr: any) {
            console.warn(
              "📧 [WORKER] Email trigger error (non-critical):",
              emailErr.message,
            );
          }

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

  // Worker event listeners for debugging
  worker.on("completed", (job) => {
    console.log(
      `✅ [WORKER] Job ${job.id} done! bookingId=${job.data.bookingId}`,
    );
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ [WORKER] Job ${job?.id} FAILED:`, err?.message);
    console.error(
      `   bookingId=${job?.data?.bookingId}, eventId=${job?.data?.eventId}`,
    );
  });

  worker.on("error", (err) => {
    console.error(`🔥 [WORKER] Lỗi hệ thống Redis/BullMQ:`, err?.message);
  });

  return worker;
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
