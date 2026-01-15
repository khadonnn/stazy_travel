import { createConsumer, createKafkaClient, createProducer } from "@repo/kafka";

const kafkaClient = createKafkaClient("payment-service");

export const producer = createProducer(kafkaClient);
export const consumer = createConsumer(kafkaClient, "payment-group");
export const connectProducer = async () => {
  try {
    await producer.connect();
    console.log("✅ Kafka Producer connected");
  } catch (error) {
    console.error("❌ Failed to connect Kafka Producer:", error);
  }
};

export const sendBookingEvent = async (data: any) => {
  try {
    await producer.send(
      "booking-events", // Tham số 1: Tên Topic
      [{ value: JSON.stringify(data) }] // Tham số 2: Mảng Messages
    );
    console.log("📤 Sent booking event to Kafka:", data.email);
  } catch (error) {
    console.error("❌ Failed to send booking event:", error);
  }
};
