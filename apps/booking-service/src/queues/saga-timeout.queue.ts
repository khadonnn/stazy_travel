/**
 * BOOKING SAGA TIMEOUT QUEUE
 *
 * Purpose: Manage booking saga timeouts
 * - When booking created (PENDING), schedule timeout job 15 minutes
 * - If payment succeeds, cancel the job
 * - If job runs, check booking status and trigger compensation (CANCEL_BOOKING)
 *
 * Key features:
 * - Idempotent: Check status before canceling
 * - Outbox-based: Write cancel event to Outbox, not Kafka directly
 * - Observability: Track saga timeouts
 */

import type { Queue, Worker } from "@repo/bullmq";
import { createQueue, createWorker, setupQueueEvents } from "@repo/bullmq";
import { prisma } from "@repo/product-db";
import {
  generateIdempotencyKey,
  checkIdempotency,
  recordIdempotency,
} from "@repo/bullmq";

// ============================================
// TYPES
// ============================================

export interface SagaTimeoutJobData {
  bookingId: string;
  sagaId: string; // requestId for idempotency
  timeoutMs: number; // Total timeout duration
}

// ============================================
// QUEUE SETUP
// ============================================

export const createSagaTimeoutQueue = (): Queue<SagaTimeoutJobData> => {
  return createQueue<SagaTimeoutJobData>("saga-timeout");
};

// ============================================
// QUEUE OPERATIONS
// ============================================

/**
 * Add timeout job when booking created
 *
 * Usage:
 * ```
 * await addSagaTimeout(queue, {
 *   bookingId: "uuid",
 *   sagaId: "request-id",
 *   timeoutMs: 15 * 60 * 1000, // 15 minutes
 * });
 * ```
 */
export const addSagaTimeout = async (
  queue: Queue<SagaTimeoutJobData>,
  data: SagaTimeoutJobData,
): Promise<string> => {
  const jobId = `timeout-${data.bookingId}`;

  const job = await queue.add(jobId, data, {
    delay: data.timeoutMs, // Schedule for 15 minutes later
    attempts: 1, // No retry for timeout job (it's a deadline)
    removeOnComplete: true, // Clean up after completion
    jobId, // Use consistent job ID for easy tracking
  });

  console.log(
    `⏰ [Saga Timeout] Added timeout job for booking ${data.bookingId}, triggers in ${data.timeoutMs}ms`,
  );

  return job.id!;
};

/**
 * Remove timeout job when booking succeeded (payment done)
 */
export const removeSagaTimeout = async (
  queue: Queue<SagaTimeoutJobData>,
  bookingId: string,
): Promise<boolean> => {
  const jobId = `timeout-${bookingId}`;
  const job = await queue.getJob(jobId);

  if (job) {
    await job.remove();
    console.log(
      `✅ [Saga Timeout] Removed timeout job for booking ${bookingId}`,
    );
    return true;
  }

  console.log(
    `⚠️ [Saga Timeout] No timeout job found for booking ${bookingId}`,
  );
  return false;
};

// ============================================
// WORKER: Process Saga Timeout
// ============================================

export const createSagaTimeoutWorker = (): Worker<SagaTimeoutJobData> => {
  return createWorker<SagaTimeoutJobData>(
    "saga-timeout",
    async (job) => {
      const { bookingId, sagaId } = job.data;

      console.log(
        `⏰ [Saga Timeout Worker] Processing timeout for booking: ${bookingId}`,
      );

      // ─────────────────────────────────────────────────────
      // 1️⃣ IDEMPOTENCY CHECK: Prevent duplicate compensation
      // ─────────────────────────────────────────────────────
      const idempotencyKey = generateIdempotencyKey("saga", bookingId, sagaId);
      const cached = checkIdempotency(idempotencyKey);

      if (cached?.processed) {
        console.log(
          `✅ [Saga Timeout] Already processed for ${bookingId}, skipping...`,
        );
        return { skipped: true, reason: "Already processed" };
      }

      try {
        // ─────────────────────────────────────────────────────
        // 2️⃣ CHECK BOOKING STATUS (Race condition guard)
        // ─────────────────────────────────────────────────────
        const booking = await prisma.booking.findFirst({
          where: { bookingId },
          select: { id: true, status: true, userId: true, hotelId: true },
        });

        if (!booking) {
          console.error(`❌ [Saga Timeout] Booking not found: ${bookingId}`);
          recordIdempotency(idempotencyKey, true, null, "Booking not found");
          throw new Error(`Booking ${bookingId} not found`);
        }

        // If booking already succeeded/completed, skip compensation
        if (booking.status !== "PENDING") {
          console.log(
            `✅ [Saga Timeout] Booking ${bookingId} status is ${booking.status}, no compensation needed`,
          );
          recordIdempotency(idempotencyKey, true, { skipped: true });
          return { skipped: true, reason: `Status is ${booking.status}` };
        }

        // ─────────────────────────────────────────────────────
        // 3️⃣ COMPENSATION: Update booking + create outbox in ATOMIC transaction
        // ─────────────────────────────────────────────────────
        await prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: "CANCELLED",
              updatedAt: new Date(),
            },
          });

          console.log(
            `🔄 [Saga Timeout] Cancelled booking ${bookingId} due to timeout`,
          );

          // Write compensation event to outbox in same transaction
          await tx.outboxMessage.create({
            data: {
              dedupKey: `booking:${bookingId}:BOOKING_CANCELLED_TIMEOUT`,
              aggregateType: "Booking",
              aggregateId: bookingId,
              eventType: "BOOKING_CANCELLED_TIMEOUT",
              topic: "booking-events",
              payload: {
                event: "BOOKING_CANCELLED_TIMEOUT",
                bookingId,
                sagaId,
                reason: "Payment timeout after 15 minutes",
                cancelledAt: new Date().toISOString(),
                userId: booking.userId,
                hotelId: booking.hotelId,
              },
              status: "PENDING", // Will be picked up by outbox worker
            },
          });

          console.log(
            `📤 [Saga Timeout] Created outbox event for cancellation: ${bookingId}`,
          );
        });

        // ─────────────────────────────────────────────────────
        // 5️⃣ RECORD IDEMPOTENCY
        // ─────────────────────────────────────────────────────
        recordIdempotency(idempotencyKey, true, {
          bookingId,
          status: "CANCELLED",
        });

        return {
          success: true,
          bookingId,
          previousStatus: "PENDING",
          newStatus: "CANCELLED",
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error(
          `❌ [Saga Timeout] Error processing timeout for ${bookingId}:`,
          error.message,
        );

        recordIdempotency(idempotencyKey, false, null, error.message);

        // Re-throw to fail the job (will be stored in DLQ/failed list)
        throw error;
      }
    },
    { concurrency: 10 }, // Allow multiple timeouts in parallel
  );
};

// ============================================
// OBSERVABILITY
// ============================================

export const setupSagaTimeoutObservability = (
  queue: Queue<SagaTimeoutJobData>,
) => {
  setupQueueEvents(queue.name);

  // Track metrics
  setInterval(async () => {
    const counts = await queue.getJobCounts(
      "active",
      "completed",
      "failed",
      "delayed",
    );
    console.log(`📊 [Saga Timeout Queue Stats]`, counts);
  }, 60000); // Every minute
};
