import { consumer } from "./kafka";
import { updateBookingStatusToPaid } from "./booking";

export const runKafkaSubscriptions = async () => {
  try {
    await consumer.subscribe([
      {
        topicName: "payment.successful",
        // 'data' ở đây chính là object JSON đã được parse từ consumer.ts
        topicHandler: async (data: any) => { 
          try {
            console.log("📩 Kafka received [payment.successful]:", data);

            // 1. Kiểm tra trực tiếp trên data
            if (!data.bookingId) {
              console.warn("⚠️ Bỏ qua tin nhắn: Thiếu bookingId", data);
              return;
            }

            // 2. Gọi service update
            await updateBookingStatusToPaid(data.bookingId, {
              sessionId: data.sessionId // Đảm bảo bên Payment gửi đúng field này
            });

          } catch (processingError) {
            console.error("❌ Lỗi xử lý logic message:", processingError);
          }
        },
      },
    ]);

    await consumer.connect();
    console.log("🚀 Booking Service subscribed to Kafka successfully");

  } catch (connectionError) {
    console.error("❌ Lỗi kết nối Kafka Consumer:", connectionError);
  }
};