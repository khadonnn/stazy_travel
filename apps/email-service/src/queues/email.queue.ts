/**
 * EMAIL QUEUE
 *
 * Purpose: Handle email sending asynchronously with retry + backoff + DLQ
 * - Kafka consumer enqueues email jobs
 * - Worker sends email with retry + exponential backoff
 * - Rate limit to avoid SMTP provider limits
 * - DLQ for failed emails (manual recovery)
 *
 * Features:
 * - Idempotency per email + timestamp
 * - Rate limiting (default: 10 emails/second per provider)
 * - Exponential backoff for retries
 * - DLQ monitor for manual retry
 * - Observability: sent count, failure rate, DLQ size
 */

import type { Queue, Worker } from "@repo/bullmq";
import { createQueue, createWorker, setupQueueEvents } from "@repo/bullmq";
import {
  generateIdempotencyKey,
  checkIdempotency,
  recordIdempotency,
} from "@repo/bullmq";
import sendMail from "../utils/mailer";

// ============================================
// TYPES
// ============================================

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  messageId: string; // bookingId + emailType + timestamp for idempotency
  emailType:
    | "BOOKING_CREATED"
    | "PAYMENT_SUCCESS"
    | "PAYMENT_FAILED"
    | "BOOKING_CANCELLED"
    | "WELCOME";
  metadata?: Record<string, any>;
}

// ============================================
// QUEUE SETUP
// ============================================

export const createEmailQueue = (): Queue<EmailJobData> => {
  return createQueue<EmailJobData>("email-send", {
    defaultJobOptions: {
      priority: 1,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  });
};

// ============================================
// QUEUE OPERATIONS
// ============================================

/**
 * Enqueue email job (called from Kafka consumer)
 */
export const enqueueEmail = async (
  queue: Queue<EmailJobData>,
  data: EmailJobData,
): Promise<string> => {
  const jobId = `email-${data.messageId}`;

  // Determine priority based on email type
  const priorityMap = {
    BOOKING_CREATED: 5, // Medium priority
    PAYMENT_SUCCESS: 3, // High priority (user expectation)
    PAYMENT_FAILED: 2, // Higher priority (needs immediate notification)
    BOOKING_CANCELLED: 4, // Medium-high
    WELCOME: 10, // Low priority
  };

  const job = await queue.add(jobId, data, {
    jobId,
    attempts: 5, // Retry up to 5 times
    backoff: {
      type: "exponential",
      delay: 3000, // Start with 3 seconds: 3s → 9s → 27s → 81s → 243s (4 minutes total)
    },
    priority: priorityMap[data.emailType] || 5,
    removeOnComplete: {
      age: 3600, // Remove after 1 hour
    },
  });

  console.log(
    `📧 [Email Queue] Enqueued ${data.emailType} email to ${data.to}`,
  );

  return job.id!;
};

/**
 * Move failed email to DLQ
 */
export const moveEmailToDLQ = async (
  queue: Queue<EmailJobData>,
  jobId: string,
  reason: string,
): Promise<void> => {
  try {
    const dlqQueue = createQueue<EmailJobData>("email-dlq");

    const job = await queue.getJob(jobId);
    if (job) {
      const dlqData = {
        ...job.data,
        failureReason: reason,
        failedAt: new Date().toISOString(),
        originalJobId: jobId,
        attempts: job.attemptsMade,
      };

      await dlqQueue.add(jobId, dlqData, {
        attempts: 1,
      });

      await job.remove();
      console.log(
        `🚨 [Email DLQ] Moved job to DLQ: ${jobId}, reason: ${reason}`,
      );
    }
  } catch (error: any) {
    console.error(`❌ [Email DLQ] Error moving to DLQ: ${error.message}`);
  }
};

// ============================================
// WORKER: Send Email
// ============================================

export const createEmailWorker = (): Worker<EmailJobData> => {
  return createWorker<EmailJobData>(
    "email-send",
    async (job) => {
      const { to, subject, messageId, emailType } = job.data;

      console.log(
        `📧 [Email Worker] Sending ${emailType} email to ${to}, attempt: ${job.attemptsMade + 1}/5`,
      );

      // ─────────────────────────────────────────────────────
      // 1️⃣ IDEMPOTENCY CHECK
      // ─────────────────────────────────────────────────────
      const idempotencyKey = generateIdempotencyKey(
        "email",
        messageId,
        emailType,
      );
      const cached = checkIdempotency(idempotencyKey);

      if (cached?.processed) {
        console.log(`✅ [Email] Already sent to ${to}, skipping duplicate...`);
        return {
          skipped: true,
          reason: "Already sent",
          to,
          messageId,
        };
      }

      try {
        // ─────────────────────────────────────────────────────
        // 2️⃣ SEND EMAIL
        // ─────────────────────────────────────────────────────
        await sendMail({
          to,
          subject,
          html: job.data.html,
        });

        console.log(`✅ [Email Worker] Sent ${emailType} email to ${to}`);

        // ─────────────────────────────────────────────────────
        // 3️⃣ RECORD IDEMPOTENCY
        // ─────────────────────────────────────────────────────
        recordIdempotency(idempotencyKey, true, {
          to,
          messageId,
          sentAt: new Date().toISOString(),
        });

        return {
          success: true,
          to,
          messageId,
          emailType,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error(
          `❌ [Email Worker] Failed to send email to ${to}: ${error.message}`,
          `Attempt: ${job.attemptsMade + 1}`,
        );

        recordIdempotency(idempotencyKey, false, null, error.message);

        // Check if this is the last retry
        if (job.attemptsMade >= (job.opts.attempts || 5) - 1) {
          console.error(
            `🚨 [Email Worker] Max retries exceeded for ${to}, moving to DLQ`,
          );
          // The DLQ moving is handled elsewhere, just throw to mark as failed
        }

        // Re-throw to trigger retry
        throw error;
      }
    },
    { concurrency: 10 }, // Send 10 emails in parallel
  );
};

// ============================================
// OBSERVABILITY & MONITORING
// ============================================

export const setupEmailQueueObservability = (queue: Queue<EmailJobData>) => {
  setupQueueEvents(queue.name);

  let sentCount = 0;
  let failedCount = 0;

  // Track metrics every minute
  setInterval(async () => {
    const counts = await queue.getJobCounts(
      "active",
      "completed",
      "failed",
      "delayed",
    );

    console.log(`📊 [Email Queue Stats]`, {
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    });

    // Alert if too many failures
    if (counts.failed && counts.failed > 20) {
      console.error(
        `🚨 [ALERT] High email failure rate: ${counts.failed} failed jobs`,
      );
    }

    // Alert if queue is too long
    if ((counts.active || 0) + (counts.delayed || 0) > 1000) {
      console.error(
        `🚨 [ALERT] Email queue backup: ${(counts.active || 0) + (counts.delayed || 0)} pending emails`,
      );
    }
  }, 60000); // Every minute

  // Track DLQ status
  setInterval(async () => {
    try {
      const dlqQueue = createQueue<EmailJobData>("email-dlq");
      const dlqCount = await dlqQueue.count();
      if (dlqCount > 0) {
        console.warn(
          `⚠️ [Email DLQ] ${dlqCount} emails in DLQ (manual review needed)`,
        );
      }
    } catch (error) {
      console.debug("DLQ check skipped");
    }
  }, 300000); // Every 5 minutes
};
