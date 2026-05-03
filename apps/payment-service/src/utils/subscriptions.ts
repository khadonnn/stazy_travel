import { consumer } from "./kafka";
import { enqueuePayment } from "../queues/payment.queue.js";
import { enqueueStripeProductJob } from "../queues/stripe-product.queue.js";
import { getPaymentQueue, getStripeProductQueue } from "./queues.js";
import crypto from "crypto";

const normalizeKafkaMessage = (message: any) => {
  let payload = message;

  if (message && message.value) {
    const rawValue = message.value;

    try {
      if (Buffer.isBuffer(rawValue)) {
        payload = JSON.parse(rawValue.toString());
      } else if (typeof rawValue === "string") {
        payload = JSON.parse(rawValue);
      } else {
        payload = rawValue;
      }
    } catch (error) {
      console.error("❌ Lỗi Parse JSON Kafka:", error);
      return null;
    }
  }

  if (payload?.value && typeof payload.value === "object") {
    payload = payload.value;
  }

  return payload;
};

/**
 * Handle booking events: enqueue payment processing
 */
const handleBookingEvent = async (message: any) => {
  console.log("\n================================================");
  console.log("📩 [Payment Service] Nhận sự kiện booking!");

  const bookingData = normalizeKafkaMessage(message);

  if (!bookingData || !bookingData.bookingId) {
    console.warn("⚠️ [Skip] Dữ liệu booking thiếu bookingId:", bookingData);
    return;
  }

  // Only process BOOKING_CREATED events
  if (bookingData.event !== "BOOKING_CREATED") {
    console.log(`ℹ️ [Booking Event] Bỏ qua event: ${bookingData.event}`);
    return;
  }

  console.log(
    `🎫 [Booking Event] BOOKING_CREATED - Enqueue payment job for ${bookingData.bookingId}`,
  );

  // Enqueue payment job instead of processing directly
  const paymentQueue = getPaymentQueue();
  if (!paymentQueue) {
    console.error("❌ [Payment Queue] Queue not available!");
    return;
  }

  try {
    await enqueuePayment(paymentQueue, {
      bookingId: bookingData.bookingId,
      userId: bookingData.userId,
      amount: bookingData.amount,
      currency: bookingData.currency || "VND",
      transactionId: crypto.randomUUID(), // Generate unique transaction ID
      paymentIntentId: bookingData.paymentIntentId,
      stripeSessionId: bookingData.stripeSessionId,
      metadata: {
        email: bookingData.email,
        hotelName: bookingData.hotelName,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
      },
    });

    console.log(
      `✅ [Payment Queue] Enqueued payment for booking ${bookingData.bookingId}`,
    );
  } catch (error: any) {
    console.error(
      `❌ [Payment Queue] Failed to enqueue payment: ${error.message}`,
    );
  }
};

export const runKafkaSubscriptions = async () => {
  try {
    await consumer.subscribe([
      {
        topicName: "hotel.created",
        topicHandler: async (data) => {
          const eventId = data?.eventId;
          if (!eventId) {
            console.warn(
              "⚠️ [hotel.created] Missing eventId from producer, skipping",
            );
            return;
          }

          const stripeProductQueue = getStripeProductQueue();
          if (!stripeProductQueue) {
            console.error("❌ [Stripe Product Queue] Queue not available");
            return;
          }

          await enqueueStripeProductJob(stripeProductQueue, {
            eventId,
            action: "CREATE",
            payload: data,
          });
        },
      },
      {
        topicName: "hotel.deleted",
        topicHandler: async (data: any) => {
          const eventId = data?.eventId;
          if (!eventId) {
            console.warn(
              "⚠️ [hotel.deleted] Missing eventId from producer, skipping",
            );
            return;
          }

          const stripeProductQueue = getStripeProductQueue();
          if (!stripeProductQueue) {
            console.error("❌ [Stripe Product Queue] Queue not available");
            return;
          }

          await enqueueStripeProductJob(stripeProductQueue, {
            eventId,
            action: "DELETE",
            payload: data,
          });
        },
      },
      {
        topicName: "booking-events",
        topicHandler: handleBookingEvent,
      },
    ]);
    console.log("🚀 Payment Service subscribed to Kafka successfully");
  } catch (error) {
    console.error("❌ Error running Kafka subscriptions:", error);
  }
};
