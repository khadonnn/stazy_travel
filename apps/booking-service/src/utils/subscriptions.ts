// src/utils/subscriptions.ts

// 👇 Hãy chắc chắn đường dẫn này trỏ đúng tới file service của bạn
// Nếu file booking.ts nằm trong folder 'services', hãy sửa thành '../services/booking'
import { updateBookingStatusToPaid } from "./booking";
import { consumer } from "./kafka";

export const runKafkaSubscriptions = async () => {
  try {
    await consumer.subscribe([
      {
        topicName: "payment.successful",
        topicHandler: async (message: any) => {
          console.log("\n================================================");
          console.log("📩 [7] CONSUMER: Đã nhận được tin nhắn từ Kafka!");

          try {
            // --- BƯỚC 1: PARSE DỮ LIỆU AN TOÀN ---
            // Kafka message thường có dạng { key, value, headers... }
            // Chúng ta cần lấy phần 'value' và parse nó ra JSON.

            let paymentData = message;

            // Kiểm tra xem message có phải là object Kafka chuẩn không
            if (message && message.value) {
              const rawValue = message.value;
              // Nếu là Buffer (dạng byte), chuyển sang string
              if (Buffer.isBuffer(rawValue)) {
                paymentData = JSON.parse(rawValue.toString());
              } else if (typeof rawValue === "string") {
                paymentData = JSON.parse(rawValue);
              } else {
                paymentData = rawValue;
              }
            }

            // Handle trường hợp wrapper của bạn bọc thêm một lớp 'value'
            // (Ví dụ: producer gửi { value: { bookingId: ... } })
            if (
              paymentData &&
              paymentData.value &&
              paymentData.value.bookingId
            ) {
              paymentData = paymentData.value;
            }

            console.log(
              "📦 [8] Dữ liệu sau khi parse:",
              JSON.stringify(paymentData, null, 2)
            );

            // --- BƯỚC 2: VALIDATE ---
            if (!paymentData || !paymentData.bookingId) {
              console.warn(
                "⚠️ [CẢNH BÁO] Payload thiếu bookingId hoặc rỗng -> Bỏ qua."
              );
              return;
            }

            console.log(
              `🔄 [9] Gọi hàm updateBookingStatusToPaid cho ID: ${paymentData.bookingId}`
            );

            // --- BƯỚC 3: GỌI SERVICE DB ---
            await updateBookingStatusToPaid(paymentData.bookingId, paymentData);
          } catch (processingError) {
            console.error(
              "❌ [LỖI] Xử lý logic consumer thất bại:",
              processingError
            );
          }
        },
      },
    ]);

    await consumer.connect();
    console.log("🚀 Booking Consumer đã kết nối và đang lắng nghe...");
  } catch (connectionError) {
    console.error(
      "❌ [LỖI] Không kết nối được Kafka Consumer:",
      connectionError
    );
  }
};
