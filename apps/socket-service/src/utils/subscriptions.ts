import { consumer } from "./kafka";
import {
  createSocketEventsQueue,
  enqueueSocketEvent,
} from "../queues/socket-events.queue.js";

const socketEventsQueue = createSocketEventsQueue();

export const runKafkaSubscriptions = async () => {
  try {
    await consumer.subscribe([
      {
        //  QUAN TRỌNG: Nghe tin từ Booking Service (đã confirm DB)
        topicName: "booking.confirmed",
        topicHandler: async (message) => {
          console.log("\n================================================");
          console.log("📨 [Kafka] Nhận tín hiệu Booking Confirmed!");

          try {
            // 1. Parse dữ liệu (Copy logic parse an toàn của bạn)
            let data = message;
            if (message?.value) {
              const raw = message.value;
              data = Buffer.isBuffer(raw) ? JSON.parse(raw.toString()) : raw;
            }
            if (typeof data === "string") data = JSON.parse(data);

            const eventId = data?.eventId;
            if (!eventId || !data?.bookingId) {
              console.warn(
                "⚠️ [Socket Consumer] Missing eventId/bookingId, skipping",
              );
              return;
            }

            await enqueueSocketEvent(socketEventsQueue, {
              eventId,
              bookingId: data.bookingId,
              payload: data,
            });
          } catch (err) {
            console.error("❌ [Socket Consumer Error]", err);
          }
        },
      },
    ]);

    await consumer.connect();
    console.log("🚀 Socket Service is listening to Kafka...");
  } catch (error) {
    console.error("❌ Kafka Connection Error:", error);
  }
};
