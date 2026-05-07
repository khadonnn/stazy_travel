/**
 * Email message handlers
 *
 * Processes Kafka messages and enqueues email jobs
 */

import { enqueueEmail } from "../queues/email.queue.js";
import { getEmailQueue } from "./queues.js";
import crypto from "crypto";

const LOGO_URL =
  "https://res.cloudinary.com/dtj7wfwzu/image/upload/v1768450033/logo_4_ueg3y8.png";

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

// ============================================
// EMAIL TEMPLATE BUILDERS
// ============================================

const buildWelcomeEmail = (username: string) => ({
  subject: "Chào mừng đến với Stazy!",
  html: `
    <div style="font-family: Arial; padding: 20px; text-align: center;">
      <img src="${LOGO_URL}" alt="Stazy Logo" style="height: 50px; margin-bottom: 20px;" />
      <h2 style="color: #059669;">Xin chào ${username}!</h2>
      <p>Tài khoản của bạn đã được tạo thành công.</p>
      <p><a href="https://stazy.com" style="color: #059669; text-decoration: none;">Bắt đầu khám phá</a></p>
    </div>
  `,
});

const buildBookingConfirmationEmail = (
  user: string,
  hotel: string,
  amount: number,
  checkInDate: string,
  checkOutDate: string,
) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    } catch (error) {
      return dateString;
    }
  };

  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

  const formattedCheckIn = formatDate(checkInDate);
  const formattedCheckOut = formatDate(checkOutDate);

  return {
    subject: `✅ Xác nhận đặt phòng: ${hotel}`,
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
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151;">📅 Ngày nhận phòng</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #111827;">${formattedCheckIn}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151;">📅 Ngày trả phòng</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #111827;">${formattedCheckOut}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151; font-weight: bold;">💰 Tổng tiền</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #059669; font-size: 18px;">${formattedPrice}</td>
          </tr>
        </table>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua <a href="mailto:support@stazy.com" style="color: #059669;">support@stazy.com</a></p>
        </div>
      </div>
    `,
  };
};

const buildPaymentSuccessEmail = (
  user: string,
  amount: number,
  hotel: string,
) => {
  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

  return {
    subject: `✅ Thanh toán thành công - Stazy`,
    html: `
      <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${LOGO_URL}" alt="Stazy Logo" style="height: 60px; width: auto; object-fit: contain;" />
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #059669; margin: 0; font-size: 24px;">✅ Thanh toán thành công!</h2>
        </div>

        <p style="font-size: 16px;">Xin chào <b>${user}</b>,</p>
        <p style="color: #4b5563;">Thanh toán của bạn cho <b>${hotel}</b> đã được xác nhận thành công.</p>

        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #059669; font-size: 18px; font-weight: bold;">${formattedPrice}</p>
          <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Số tiền thanh toán</p>
        </div>

        <p style="color: #4b5563;">Chúng tôi sẽ gửi thêm thông tin chi tiết về chuyến du lịch của bạn sớm. Vui lòng giữ kỷ niệm đáng nhớ!</p>
      </div>
    `,
  };
};

// ============================================
// KAFKA MESSAGE HANDLER
// ============================================

export const handleKafkaMessage = async (message: any, eventType: string) => {
  console.log("\n" + "=".repeat(70));
  console.log(`📩 [Email Service] Received ${eventType} event`);
  console.log("=".repeat(70));

  const data = normalizeKafkaMessage(message);

  if (!data) {
    console.warn("⚠️ [Email] Failed to parse message");
    return;
  }

  const emailQueue = getEmailQueue();
  if (!emailQueue) {
    console.error("❌ [Email Queue] Queue not available");
    return;
  }

  try {
    let emailData;

    switch (eventType) {
      case "WELCOME":
        if (!data.email || !data.username) {
          console.warn("⚠️ [Email] Missing email or username for WELCOME");
          return;
        }
        const welcomeTemplate = buildWelcomeEmail(data.username);
        emailData = {
          to: data.email,
          subject: welcomeTemplate.subject,
          html: welcomeTemplate.html,
          messageId: `${data.userId || data.email}:WELCOME:${Date.now()}`,
          emailType: "WELCOME" as const,
          metadata: { userId: data.userId },
        };
        break;

      case "BOOKING_CREATED":
        if (!data.email || !data.hotel) {
          console.warn("⚠️ [Email] Missing email or hotel for BOOKING_CREATED");
          return;
        }
        console.log(
          `📧 [EMAIL-SERVICE] Chuẩn bị gửi email BOOKING_CREATED cho: ${data.email}`,
        );
        const bookingTemplate = buildBookingConfirmationEmail(
          data.user || "Quý khách",
          data.hotel,
          data.amount || 0,
          data.checkInDate || data.checkIn || new Date().toISOString(),
          data.checkOutDate || data.checkOut || new Date().toISOString(),
        );
        emailData = {
          to: data.email,
          subject: bookingTemplate.subject,
          html: bookingTemplate.html,
          messageId: `${data.bookingId}:BOOKING_CREATED:${Date.now()}`,
          emailType: "BOOKING_CREATED" as const,
          metadata: { bookingId: data.bookingId, userId: data.userId },
        };
        break;

      case "PAYMENT_SUCCESS":
        if (!data.email) {
          console.warn("⚠️ [Email] Missing email for PAYMENT_SUCCESS");
          return;
        }
        const paymentTemplate = buildPaymentSuccessEmail(
          data.user || "Quý khách",
          data.amount || 0,
          data.hotel || "Stazy Hotel",
        );
        emailData = {
          to: data.email,
          subject: paymentTemplate.subject,
          html: paymentTemplate.html,
          messageId: `${data.bookingId || data.transactionId}:PAYMENT_SUCCESS:${Date.now()}`,
          emailType: "PAYMENT_SUCCESS" as const,
          metadata: {
            bookingId: data.bookingId,
            transactionId: data.transactionId,
          },
        };
        break;

      default:
        console.log(`ℹ️ [Email] Unhandled event type: ${eventType}`);
        return;
    }

    // Enqueue email job
    await enqueueEmail(emailQueue, emailData);
    console.log(
      `✅ [Email Queue] Enqueued ${eventType} email to ${emailData.to}`,
    );
  } catch (error: any) {
    console.error(
      `❌ [Email Service] Error handling ${eventType}: ${error.message}`,
    );
  }
};
