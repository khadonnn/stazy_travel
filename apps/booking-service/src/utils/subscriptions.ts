// Sửa đường dẫn import cho đúng file vừa sửa ở trên
import { updateBookingStatusToPaid } from "./booking";
import { consumer } from "./kafka";

export const runKafkaSubscriptions = async () => {
  try {
    await consumer.subscribe([
      {
        topicName: "payment.successful",
        topicHandler: async (message: any) => {
          console.log("\n================================================");
          console.log("📩 [Kafka] Nhận tín hiệu thanh toán!");

          try {
            // 1. Parse dữ liệu an toàn
            let paymentData = message;
            if (message && message.value) {
              const rawValue = message.value;
              if (Buffer.isBuffer(rawValue)) {
                paymentData = JSON.parse(rawValue.toString());
              } else if (typeof rawValue === "string") {
                paymentData = JSON.parse(rawValue);
              } else {
                paymentData = rawValue;
              }
            }

            // Xử lý nested value (nếu có)
            if (
              paymentData &&
              paymentData.value &&
              paymentData.value.bookingId
            ) {
              paymentData = paymentData.value;
            }

            // 2. Kiểm tra ID
            if (!paymentData || !paymentData.bookingId) {
              console.warn("⚠️ [Skip] Dữ liệu thiếu bookingId");
              return;
            }

            console.log(
              `🔄 Đang gọi Service update cho ID: ${paymentData.bookingId}`
            );

            // 3. Gọi Service
            await updateBookingStatusToPaid(paymentData.bookingId, paymentData);
          } catch (err) {
            console.error("❌ [Consumer Error]", err);
          }
        },
      },
    ]);

    await consumer.connect();
    console.log("🚀 Booking Consumer is running...");
  } catch (error) {
    console.error("❌ Kafka Connection Error:", error);
  }
};
