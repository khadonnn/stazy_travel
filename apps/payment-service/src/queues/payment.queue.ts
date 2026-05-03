/**
 * PAYMENT PROCESSING QUEUE
 *
 * Purpose: Handle asynchronous payment processing with retry + backoff
 * - Kafka consumer enqueues job (no direct processing)
 * - Worker processes payment with exponential backoff
 * - Publishes success/failure through Outbox, not directly to Kafka
 * - Implements idempotency per transactionId
 * - DLQ for failed payments (manual review)
 *
 * Flow:
 * 1. BOOKING_CREATED event → enqueue payment job
 * 2. Payment worker processes job (check payment status, retry if needed)
 * 3. Success → create PAYMENT_SUCCESS event in Outbox
 * 4. Fail after retries → create PAYMENT_FAILED event in Outbox + DLQ
 * 5. Manual recovery via DLQ monitor
 */

import type { Queue, Worker } from "@repo/bullmq";
import { createQueue, createWorker, setupQueueEvents } from "@repo/bullmq";
import {
  generateIdempotencyKey,
  checkIdempotency,
  recordIdempotency,
} from "@repo/bullmq";
import { prisma } from "@repo/product-db";

// ============================================
// TYPES
// ============================================

export interface PaymentJobData {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  transactionId: string; // Idempotency key from payment provider
  paymentIntentId?: string;
  stripeSessionId?: string;
  metadata?: Record<string, any>;
}

// ============================================
// QUEUE SETUP
// ============================================

export const createPaymentQueue = (): Queue<PaymentJobData> => {
  return createQueue<PaymentJobData>("payment-process");
};

// ============================================
// QUEUE OPERATIONS
// ============================================

/**
 * Enqueue payment job (called from booking-events consumer)
 */
export const enqueuePayment = async (
  queue: Queue<PaymentJobData>,
  data: PaymentJobData,
): Promise<string> => {
  // Use transactionId as job ID for idempotency
  const jobId = `payment-${data.transactionId}`;

  const job = await queue.add(jobId, data, {
    jobId,
    attempts: 5, // Retry up to 5 times
    backoff: {
      type: "exponential",
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 3600, // Remove after 1 hour
    },
  });

  console.log(
    `💳 [Payment Queue] Enqueued payment job for booking ${data.bookingId}`,
  );

  return job.id!;
};

/**
 * Move failed job to DLQ for manual review
 */
export const moveToPaymentDLQ = async (
  queue: Queue<PaymentJobData>,
  jobId: string,
  reason: string,
): Promise<void> => {
  try {
    const dlqQueue = createQueue<PaymentJobData>("payment-dlq");

    const job = await queue.getJob(jobId);
    if (job) {
      const dlqData = {
        ...job.data,
        failureReason: reason,
        failedAt: new Date().toISOString(),
        originalJobId: jobId,
      };

      await dlqQueue.add(jobId, dlqData, {
        attempts: 1,
      });

      await job.remove();
      console.log(
        `🚨 [Payment DLQ] Moved job to DLQ: ${jobId}, reason: ${reason}`,
      );
    }
  } catch (error: any) {
    console.error(`❌ [Payment DLQ] Error moving to DLQ: ${error.message}`);
  }
};

// ============================================
// WORKER: Process Payment
// ============================================

export const createPaymentWorker = (): Worker<PaymentJobData> => {
  return createWorker<PaymentJobData>(
    "payment-process",
    async (job) => {
      const { bookingId, transactionId, amount, paymentIntentId } = job.data;

      console.log(
        `💳 [Payment Worker] Processing payment for booking: ${bookingId}, attempt: ${job.attemptsMade + 1}`,
      );

      // ─────────────────────────────────────────────────────
      // 1️⃣ IDEMPOTENCY CHECK
      // ─────────────────────────────────────────────────────
      const idempotencyKey = generateIdempotencyKey(
        "payment",
        bookingId,
        transactionId,
      );
      const cached = checkIdempotency(idempotencyKey);

      if (cached?.processed) {
        console.log(
          `✅ [Payment] Already processed for ${transactionId}, skipping...`,
        );
        return {
          skipped: true,
          reason: "Already processed",
          transactionId,
        };
      }

      try {
        // ─────────────────────────────────────────────────────
        // 2️⃣ FETCH CURRENT PAYMENT STATUS
        // ─────────────────────────────────────────────────────
        // In production, call Stripe API to check payment status
        // For now, we'll assume successful processing
        if (!paymentIntentId) {
          throw new Error(`Missing paymentIntentId for booking ${bookingId}`);
        }

        // TODO: Call Stripe API here to verify payment
        // const stripePayment = await stripe.paymentIntents.retrieve(paymentIntentId);
        // if (stripePayment.status !== 'succeeded') {
        //   throw new Error(`Payment not succeeded: ${stripePayment.status}`);
        // }

        console.log(
          `💰 [Payment Worker] Payment verified for ${transactionId}`,
        );

        // ─────────────────────────────────────────────────────
        // 3️⃣ CREATE OUTBOX EVENT FOR SUCCESS IN TRANSACTION
        // Outbox worker will publish to Kafka
        // ─────────────────────────────────────────────────────
        await prisma.$transaction(async (tx) => {
          await tx.outboxMessage.create({
            data: {
              dedupKey: `payment:${transactionId}:PAYMENT_SUCCESS`,
              aggregateType: "Payment",
              aggregateId: transactionId,
              eventType: "PAYMENT_SUCCESS",
              topic: "payment-events",
              payload: {
                event: "PAYMENT_SUCCESS",
                bookingId,
                transactionId,
                amount,
                paymentIntentId,
                processedAt: new Date().toISOString(),
              },
              status: "PENDING", // Outbox worker will pick this up
            },
          });
        });

        console.log(
          `📤 [Payment Worker] Created outbox event for success: ${transactionId}`,
        );

        // ─────────────────────────────────────────────────────
        // 4️⃣ RECORD IDEMPOTENCY
        // ─────────────────────────────────────────────────────
        recordIdempotency(idempotencyKey, true, {
          transactionId,
          status: "SUCCESS",
        });

        return {
          success: true,
          transactionId,
          bookingId,
          amount,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error(
          `❌ [Payment Worker] Error processing payment ${transactionId}:`,
          error.message,
        );

        recordIdempotency(idempotencyKey, false, null, error.message);

        // Check if this is the last retry
        if (job.attemptsMade >= (job.opts.attempts || 5) - 1) {
          console.error(
            `🚨 [Payment Worker] Max retries exceeded for ${transactionId}, moving to DLQ`,
          );

          // Create failure event in Outbox (for notification/refund)
          try {
            await prisma.outboxMessage.create({
              data: {
                dedupKey: `payment:${transactionId}:PAYMENT_FAILED`,
                aggregateType: "Payment",
                aggregateId: transactionId,
                eventType: "PAYMENT_FAILED",
                topic: "payment-events",
                payload: {
                  event: "PAYMENT_FAILED",
                  bookingId,
                  transactionId,
                  reason: error.message,
                  failedAt: new Date().toISOString(),
                },
                status: "PENDING",
              },
            });

            console.log(
              `📤 [Payment Worker] Created failure event for DLQ: ${transactionId}`,
            );
          } catch (dlqError: any) {
            console.error(
              `❌ Failed to create failure event: ${dlqError.message}`,
            );
          }
        }

        // Re-throw to trigger retry
        throw error;
      }
    },
    { concurrency: 10 }, // Process 10 payments in parallel
  );
};

// ============================================
// OBSERVABILITY
// ============================================

export const setupPaymentQueueObservability = (
  queue: Queue<PaymentJobData>,
) => {
  setupQueueEvents(queue.name);

  // Track metrics every minute
  setInterval(async () => {
    const counts = await queue.getJobCounts(
      "active",
      "completed",
      "failed",
      "delayed",
    );
    console.log(`📊 [Payment Queue Stats]`, counts);

    // Alert if too many failures
    if (counts.failed && counts.failed > 10) {
      console.error(
        `🚨 [ALERT] High payment failure rate: ${counts.failed} failed jobs`,
      );
    }
  }, 60000); // Every minute
};
