import { prisma } from "@repo/product-db";
import { producer } from "../utils/kafka.js";

const OUTBOX_POLL_INTERVAL_MS = Number(
  process.env.OUTBOX_POLL_INTERVAL_MS || "5000",
);
const OUTBOX_BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || "20");
const OUTBOX_MAX_ATTEMPTS = Number(process.env.OUTBOX_MAX_ATTEMPTS || "5");
const OUTBOX_RETRY_DELAY_MS = Number(
  process.env.OUTBOX_RETRY_DELAY_MS || "3000",
);

let workerStarted = false;
let isProcessing = false;
let timer: ReturnType<typeof setInterval> | null = null;

const claimPendingMessages = async () => {
  return prisma.$transaction(async (tx) => {
    const pendingMessages = await tx.outboxMessage.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
        attempts: { lt: OUTBOX_MAX_ATTEMPTS },
      },
      orderBy: [{ createdAt: "asc" }],
      take: OUTBOX_BATCH_SIZE,
    });

    if (pendingMessages.length === 0) {
      return [];
    }

    await tx.outboxMessage.updateMany({
      where: {
        id: { in: pendingMessages.map((message) => message.id) },
        status: "PENDING",
      },
      data: {
        status: "PROCESSING",
        updatedAt: new Date(),
      },
    });

    return pendingMessages;
  });
};

const markAsSent = async (messageId: string) => {
  await prisma.outboxMessage.update({
    where: { id: messageId },
    data: {
      status: "SENT",
      attempts: {
        increment: 1,
      },
      processedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    },
  });
};

const markAsRetryable = async (messageId: string, errorMessage: string) => {
  const existing = await prisma.outboxMessage.findUnique({
    where: { id: messageId },
    select: { attempts: true },
  });

  const attempts = (existing?.attempts || 0) + 1;
  const status = attempts >= OUTBOX_MAX_ATTEMPTS ? "FAILED" : "PENDING";

  await prisma.outboxMessage.update({
    where: { id: messageId },
    data: {
      status,
      attempts,
      lastError: errorMessage,
      availableAt:
        status === "FAILED"
          ? new Date()
          : new Date(Date.now() + OUTBOX_RETRY_DELAY_MS),
      updatedAt: new Date(),
    },
  });
};

const processOutboxBatch = async () => {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    const messages = await claimPendingMessages();

    for (const message of messages) {
      try {
        await producer.send(
          message.topic,
          message.payload as Record<string, unknown>,
        );
        await markAsSent(message.id);
        console.log(
          `📨 [Outbox] Published ${message.eventType} to ${message.topic}`,
        );
      } catch (error: any) {
        console.error(
          `❌ [Outbox] Failed to publish ${message.eventType}:`,
          error.message,
        );
        await markAsRetryable(message.id, error.message);
      }
    }
  } catch (error: any) {
    console.error("❌ [Outbox] Polling failed:", error.message);
  } finally {
    isProcessing = false;
  }
};

export const startOutboxWorker = async () => {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  await processOutboxBatch();

  timer = setInterval(() => {
    void processOutboxBatch();
  }, OUTBOX_POLL_INTERVAL_MS);

  console.log("🚀 Outbox worker started");
};

export const stopOutboxWorker = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  workerStarted = false;
  isProcessing = false;
};
