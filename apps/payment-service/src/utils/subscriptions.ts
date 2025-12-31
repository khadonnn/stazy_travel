import { consumer } from "./kafka";
import { createStripeProduct, deleteStripeProduct } from "./stripeProduct";
// Nếu bạn đã đưa type này vào @repo/types thì import vào để code gợi ý cho sướng
// import { StripeProductType } from "@repo/types"; 

export const runKafkaSubscriptions = async () => {
  try {
    await consumer.subscribe([
      {
        // 1. Sửa tên Topic cho khớp với bên Product Service gửi
        topicName: "hotel.created", 
        topicHandler: async (data) => {
          // 2. 'data' ở đây chính là object { id, name, price } luôn.
          // KHÔNG dùng data.value
          console.log("📩 Received [hotel.created]:", data);

          // Gọi hàm tạo product trên Stripe
          // (Bạn nên ép kiểu nếu cần: await createStripeProduct(data as StripeProductType))
          await createStripeProduct(data);
        },
      },
      {
        // Tương tự, đổi tên topic delete cho đồng bộ (nếu bên Product Service cũng đổi)
        topicName: "hotel.deleted", 
        topicHandler: async (data: any) => {
          // data có thể là object hoặc string tùy cách bạn gửi bên producer
          // Giả sử bạn gửi { id: "..." } hoặc chỉ gửi string "..."
          const productId = data.id || data; 
          
          console.log("🗑️ Received [hotel.deleted]:", productId);

          await deleteStripeProduct(productId);
        },
      },
    ]);

    // 3. Đừng quên dòng này để consumer bắt đầu chạy
    await consumer.connect();
    console.log("🚀 Payment Service subscribed to Kafka successfully");

  } catch (error) {
    console.error("❌ Error running Kafka subscriptions:", error);
  }
};