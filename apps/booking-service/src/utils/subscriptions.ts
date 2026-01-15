import { updateBookingStatusToPaid } from "./booking";
import { consumer } from "./kafka";

export const runKafkaSubscriptions = async () => {
  try {
    await consumer.subscribe([
      {
        // 🔥 QUAN TRỌNG: Phải khớp với Topic mà Payment Service gửi đi (xem log ảnh của bạn là booking-events)
        topicName: "booking-events",
        topicHandler: async (message: any) => {
          console.log("\n================================================");
          console.log("📩 [Kafka Consumer] Nhận tín hiệu thanh toán!");

          try {
            let paymentData = message;

            // 1. Parse dữ liệu cẩn thận
            if (message && message.value) {
              const rawValue = message.value;
              try {
                if (Buffer.isBuffer(rawValue)) {
                  paymentData = JSON.parse(rawValue.toString());
                } else if (typeof rawValue === "string") {
                  paymentData = JSON.parse(rawValue);
                } else {
                  paymentData = rawValue;
                }
              } catch (e) {
                console.error("❌ Lỗi Parse JSON Kafka:", e);
                return;
              }
            }

            // Fix trường hợp payload bị lồng nhau (Kafka wrapper đôi khi bọc thêm 1 lớp value)
            if (paymentData.value && typeof paymentData.value === "object") {
              paymentData = paymentData.value;
            }

            // 2. Validate ID
            if (!paymentData || !paymentData.bookingId) {
              console.warn("⚠️ [Skip] Dữ liệu thiếu bookingId:", paymentData);
              return;
            }

            console.log(
              `➡️ Gọi Update Service cho BookingID: ${paymentData.bookingId}`
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
    console.log(
      "🚀 Booking Consumer is running & listening to 'booking-events'..."
    );
  } catch (error) {
    console.error("❌ Kafka Connection Error:", error);
  }
};
