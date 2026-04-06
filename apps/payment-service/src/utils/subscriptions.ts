import { consumer } from "./kafka";
import { createStripeProduct, deleteStripeProduct } from "./stripeProduct";

export const runKafkaSubscriptions = async () => {
  try {
    await consumer.subscribe([
      {
        topicName: "hotel.created",
        topicHandler: async (data) => {
          console.log("📩 Received [hotel.created]:", data);

          await createStripeProduct(data);
        },
      },
      {
        topicName: "hotel.deleted",
        topicHandler: async (data: any) => {
          const productId = data.id || data;

          console.log("🗑️ Received [hotel.deleted]:", productId);

          await deleteStripeProduct(productId);
        },
      },
    ]);

    await consumer.connect();
    console.log("🚀 Payment Service subscribed to Kafka successfully");
  } catch (error) {
    console.error("❌ Error running Kafka subscriptions:", error);
  }
};
