import sendMail from "./utils/mailer"; // Đảm bảo trỏ đúng file bạn vừa sửa
import { createConsumer, createKafkaClient } from "@repo/kafka";

const kafka = createKafkaClient("email-service");
const consumer = createConsumer(kafka, "email-service");

const start = async () => {
  try {
    await consumer.connect();

    await consumer.subscribe([
      {
        topicName: "user.created",
        topicHandler: async (message) => {
          const { email, username } = message.value;

          if (email) {
            await sendMail({
              to: email,
              subject: "Chào mừng đến với Stazy!",
              html: `
                <div style="font-family: Arial; padding: 20px;">
                  <h2 style="color: #059669;">Xin chào ${username}!</h2>
                  <p>Tài khoản của bạn đã được tạo thành công.</p>
                  <p>Hãy bắt đầu khám phá những khách sạn tuyệt vời ngay hôm nay.</p>
                </div>
              `,
            });
          }
        },
      },

      {
        topicName: "booking-events",
        topicHandler: async (message) => {
          const {
            email,
            user, // Tên khách hàng
            hotel, // Tên khách sạn
            amount, // Tổng tiền
            checkInDate,
            checkOutDate,
          } = message.value;

          if (email) {
            const formattedPrice = new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(amount);

            await sendMail({
              to: email,
              subject: `✅ Xác nhận đặt phòng: ${hotel}`,
              html: `
                <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #059669; margin: 0;">Đặt phòng thành công!</h2>
                    <p style="color: #6b7280; font-size: 14px;">Mã đặt chỗ: #${Date.now().toString().slice(-6)}</p>
                  </div>

                  <p>Xin chào <b>${user || "Quý khách"}</b>,</p>
                  <p>Cảm ơn bạn đã lựa chọn Stazy cho kỳ nghỉ sắp tới. Dưới đây là thông tin chi tiết đơn hàng của bạn:</p>
                  
                  <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 15px;">
                    <tr style="background-color: #f9fafb;">
                      <td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151;">🏨 Khách sạn</td>
                      <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">${hotel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151;">📅 Ngày nhận</td>
                      <td style="padding: 12px; border: 1px solid #e5e7eb;">${checkInDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151;">📅 Ngày trả</td>
                      <td style="padding: 12px; border: 1px solid #e5e7eb;">${checkOutDate}</td>
                    </tr>
                    <tr style="background-color: #ecfdf5;">
                      <td style="padding: 12px; border: 1px solid #e5e7eb; color: #059669; font-weight: bold;">💰 Tổng tiền</td>
                      <td style="padding: 12px; border: 1px solid #e5e7eb; color: #059669; font-weight: bold;">${formattedPrice}</td>
                    </tr>
                  </table>

                  <div style="margin-top: 30px; text-align: center;">
                    <a href="http://localhost:3000/trips" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Xem chi tiết chuyến đi</a>
                  </div>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                  
                  <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                    Đây là email tự động, vui lòng không trả lời.<br>
                    © 2026 Stazy Inc.
                  </p>
                </div>
              `,
            });
            console.log(`📧 Đã gửi mail confirm cho ${email}`);
          }
        },
      },
    ]);

    console.log("🚀 Email Service đang lắng nghe Kafka...");
  } catch (error) {
    console.log("❌ Lỗi Kafka Consumer:", error);
  }
};

start();
