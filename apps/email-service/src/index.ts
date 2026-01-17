import sendMail from "./utils/mailer";
import { createConsumer, createKafkaClient } from "@repo/kafka";

const kafka = createKafkaClient("email-service");
const consumer = createConsumer(kafka, "email-service");

// 🔥 LOGO CỦA BẠN (Đã cập nhật)
const LOGO_URL =
  "https://res.cloudinary.com/dtj7wfwzu/image/upload/v1768450033/logo_4_ueg3y8.png";

const start = async () => {
  try {
    await consumer.connect();

    await consumer.subscribe([
      // 1. TOPIC: TẠO USER (Giữ nguyên)
      {
        topicName: "user.created",
        topicHandler: async (message) => {
          const { email, username } = message.value;
          if (email) {
            await sendMail({
              to: email,
              subject: "Chào mừng đến với Stazy!",
              html: `
                <div style="font-family: Arial; padding: 20px; text-align: center;">
                  <img src="${LOGO_URL}" alt="Stazy Logo" style="height: 50px; margin-bottom: 20px;" />
                  <h2 style="color: #059669;">Xin chào ${username}!</h2>
                  <p>Tài khoản của bạn đã được tạo thành công.</p>
                </div>
              `,
            });
          }
        },
      },

      // 2. TOPIC: BOOKING EVENTS (Thanh toán thành công)
      {
        topicName: "booking-events",
        topicHandler: async (message) => {
          const { email, user, hotel, amount, checkInDate, checkOutDate } =
            message.value;

          if (email) {
            const formattedPrice = new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(amount);

            await sendMail({
              to: email,
              // Tiêu đề email (Subject) chỉ chứa Text & Emoji
              subject: `✅ Xác nhận đặt phòng: ${hotel}`,

              // Nội dung HTML (Chứa Logo)
              html: `
                <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                  
                  <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px dashed #eee;">
                    <img src="${LOGO_URL}" alt="Stazy Logo" style="height: 60px; width: auto; object-fit: contain;" />
                  </div>

                  <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #059669; margin: 0; font-size: 24px;">Đặt phòng thành công!</h2>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Mã đặt chỗ: #${Date.now().toString().slice(-6)}</p>
                  </div>

                  <p style="font-size: 16px;">Xin chào <b>${user || "Quý khách"}</b>,</p>
                  <p style="color: #4b5563;">Cảm ơn bạn đã lựa chọn <b>Stazy</b> cho kỳ nghỉ sắp tới. Dưới đây là thông tin chi tiết đơn hàng của bạn:</p>
                  
                  <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 15px;">
                    <tr style="background-color: #f9fafb;">
                      <td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151; width: 40%;">🏨 Khách sạn</td>
                      <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #111827;">${hotel}</td>
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
                      <td style="padding: 12px; border: 1px solid #e5e7eb; color: #059669; font-weight: bold; font-size: 18px;">${formattedPrice}</td>
                    </tr>
                  </table>

                  <div style="margin-top: 35px; text-align: center;">
                    <a href="http://localhost:3000/trips" style="background-color: #059669; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Xem chi tiết chuyến đi</a>
                  </div>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                  
                  <p style="font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                    Bạn nhận được email này vì đã đặt phòng tại Stazy.<br>
                    Nếu cần hỗ trợ, vui lòng liên hệ <a href="mailto:support@stazy.com" style="color: #059669;">support@stazy.com</a>.<br>
                    © 2026 Stazy Inc. All rights reserved.
                  </p>
                </div>
              `,
            });
            console.log(`📧 Đã gửi mail confirm cho ${email} (kèm Logo)`);
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
