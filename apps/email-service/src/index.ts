import { createConsumer, createKafkaClient } from "@repo/kafka";
import {
  createEmailWorker,
  setupEmailQueueObservability,
} from "./queues/email.queue.js";
import {
  createEmailEventsWorker,
  enqueueEmailEvent,
  setupEmailEventsQueueObservability,
} from "./queues/email-events.queue.js";
import { initializeQueues, getEmailEventsQueue } from "./utils/queues.js";

const kafka = createKafkaClient("email-service");
const consumer = createConsumer(kafka, "email-service");

let emailWorker: any = null;
let emailEventsWorker: any = null;
let emailQueue: any = null;
let emailEventsQueue: any = null;

const extractEventId = (message: any): string | null => {
  try {
    const rawValue = message?.value;
    if (!rawValue) {
      return null;
    }

    const payload = Buffer.isBuffer(rawValue)
      ? JSON.parse(rawValue.toString())
      : typeof rawValue === "string"
        ? JSON.parse(rawValue)
        : rawValue;

    if (payload?.eventId) {
      return payload.eventId;
    }

    if (payload?.value?.eventId) {
      return payload.value.eventId;
    }

    return null;
  } catch {
    return null;
  }
};

const start = async () => {
  try {
    const queues = await initializeQueues();
    emailQueue = queues.email;
    emailEventsQueue = queues.emailEvents;

    emailWorker = createEmailWorker();
    emailEventsWorker = createEmailEventsWorker();

    setupEmailQueueObservability(queues.email);
    setupEmailEventsQueueObservability(queues.emailEvents);

    console.log("✅ Email Queue initialized");
    console.log("✅ Email Events Queue initialized");

    await consumer.connect();

    await consumer.subscribe([
      {
        topicName: "user.created",
        topicHandler: async (message) => {
          const queue = getEmailEventsQueue();
          const eventId = extractEventId(message);
          if (!queue || !eventId) {
            console.warn("⚠️ [user.created] Missing queue/eventId, skipping");
            return;
          }

          await enqueueEmailEvent(queue, {
            eventId,
            eventType: "WELCOME",
            message,
          });
        },
      },
      {
        topicName: "booking-events",
        topicHandler: async (message) => {
          const queue = getEmailEventsQueue();
          const eventId = extractEventId(message);
          if (!queue || !eventId) {
            console.warn("⚠️ [booking-events] Missing queue/eventId, skipping");
            return;
          }

          await enqueueEmailEvent(queue, {
            eventId,
            eventType: "BOOKING_CREATED",
            message,
          });
        },
      },
      {
        topicName: "payment-events",
        topicHandler: async (message) => {
          const queue = getEmailEventsQueue();
          const eventId = extractEventId(message);
          if (!queue || !eventId) {
            console.warn("⚠️ [payment-events] Missing queue/eventId, skipping");
            return;
          }

          await enqueueEmailEvent(queue, {
            eventId,
            eventType: "PAYMENT_SUCCESS",
            message,
          });
        },
      },
    ]);

    console.log("🚀 Email Service is running & listening to topics...");
  } catch (error) {
    console.error("❌ Email Service Error:", error);
    process.exit(1);
  }
};

start();

const closeGracefully = async (signal: string) => {
  console.log(`Received signal to terminate: ${signal}`);

  if (emailEventsWorker) {
    await emailEventsWorker.close();
  }
  if (emailWorker) {
    await emailWorker.close();
  }
  if (emailEventsQueue) {
    await emailEventsQueue.close();
  }
  if (emailQueue) {
    await emailQueue.close();
  }

  await consumer.disconnect();

  console.log("🛑 Email service shut down gracefully");
  process.exit(0);
};

process.on("SIGINT", () => closeGracefully("SIGINT"));
process.on("SIGTERM", () => closeGracefully("SIGTERM"));
