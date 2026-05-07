import { consumer } from "./kafka";
import { getBookingEventsQueue } from "./queues";
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

const handleBookingEvent = async (message: any) => {
  console.log("\n================================================");
  console.log("📥 [KAFKA CONSUMER] Đã nhận message từ topic booking-events");

  const bookingData = normalizeKafkaMessage(message);

  console.log(
    `📥 [KAFKA CONSUMER] Parsed data - event: ${bookingData?.event}, bookingId: ${bookingData?.bookingId}, status: ${bookingData?.status}`,
  );

  if (!bookingData || !bookingData.bookingId) {
    console.warn(
      "⚠️ [KAFKA CONSUMER] Dữ liệu booking thiếu bookingId:",
      bookingData,
    );
    return;
  }

  if (bookingData.event === "BOOKING_CREATED") {
    console.log(
      `ℹ️ [KAFKA CONSUMER] BOOKING_CREATED đã vào Outbox, chờ payment xử lý bookingId=${bookingData.bookingId}`,
    );
    return;
  }

  if (
    bookingData.event === "PAYMENT_PROCESSED" ||
    bookingData.event === "PAYMENT_SUCCESS" ||
    bookingData.status === "PAID"
  ) {
    const bookingEventsQueue = getBookingEventsQueue();
    if (!bookingEventsQueue) {
      console.error(
        "❌ [KAFKA CONSUMER] booking-events BullMQ queue is NOT initialized!",
      );
      return;
    }

    // Generate eventId if missing (Stripe webhook doesn't send eventId)
    const eventId =
      bookingData.eventId || `evt-${bookingData.bookingId}-${Date.now()}`;

    console.log(
      `📥 [KAFKA CONSUMER] Đang đưa message vào BullMQ queue. eventId=${eventId}, bookingId=${bookingData.bookingId}`,
    );

    const job = await bookingEventsQueue.add(
      `booking-event-${eventId}`,
      {
        eventId,
        topic: "booking-events",
        eventType: bookingData.event || "PAYMENT_SUCCESS",
        bookingId: bookingData.bookingId,
        payload: bookingData,
      },
      {
        jobId: `booking-event-${eventId}`,
      },
    );

    console.log(
      `📝 [BULLMQ] Đã add job vào queue thành công. Job ID: ${job.id}, bookingId=${bookingData.bookingId}`,
    );

    return;
  }

  console.log(
    "ℹ️ [KAFKA CONSUMER] Bỏ qua event không thuộc luồng thanh toán:",
    bookingData.event,
  );
};

const handlePaymentEvent = async (message: any) => {
  console.log("\n================================================");
  console.log("📩 [Kafka Consumer] Nhận sự kiện payment!");

  const paymentData = normalizeKafkaMessage(message);

  if (!paymentData || !paymentData.bookingId) {
    console.warn("⚠️ [Skip] Dữ liệu payment thiếu bookingId:", paymentData);
    return;
  }

  if (
    paymentData.event === "PAYMENT_FAILED" ||
    paymentData.status === "FAILED"
  ) {
    const bookingEventsQueue = getBookingEventsQueue();
    if (!bookingEventsQueue) {
      console.error(
        "❌ [Payment Event] booking-events queue is not initialized",
      );
      return;
    }

    const eventId = paymentData.eventId;
    if (!eventId) {
      console.warn(
        `⚠️ [Payment Event] Missing eventId from producer, skip bookingId=${paymentData.bookingId}`,
      );
      return;
    }

    await bookingEventsQueue.add(
      `booking-event-${eventId}`,
      {
        eventId,
        topic: "payment-events",
        eventType: paymentData.event || "PAYMENT_FAILED",
        bookingId: paymentData.bookingId,
        payload: paymentData,
      },
      {
        jobId: `booking-event-${eventId}`,
      },
    );

    console.log(
      `📥 [Payment Event] Enqueued payment failure for bookingId=${paymentData.bookingId}, eventId=${eventId}`,
    );

    return;
  }

  console.log(
    "ℹ️ [Payment Event] Bỏ qua event không phải thất bại:",
    paymentData.event,
  );
};

export const runKafkaSubscriptions = async () => {
  try {
    await consumer.subscribe([
      {
        topicName: "booking-events",
        topicHandler: handleBookingEvent,
      },
      {
        topicName: "payment-events",
        topicHandler: handlePaymentEvent,
      },
    ]);

    await consumer.connect();
    console.log(
      "🚀 Booking Consumer is running & listening to 'booking-events'...",
    );
  } catch (error) {
    console.error("❌ Kafka Connection Error:", error);
  }
};
