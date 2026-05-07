import http from "http";
import { createConsumer, createKafkaClient } from "@repo/kafka";
import {
  createEmailWorker,
  enqueueEmail,
  setupEmailQueueObservability,
} from "./queues/email.queue.js";
import {
  createEmailEventsWorker,
  enqueueEmailEvent,
  setupEmailEventsQueueObservability,
} from "./queues/email-events.queue.js";
import {
  initializeQueues,
  getEmailQueue,
  getEmailEventsQueue,
} from "./utils/queues.js";

const kafka = createKafkaClient("email-service");
const consumer = createConsumer(kafka, "email-service");

let emailWorker: any = null;
let emailEventsWorker: any = null;
let emailQueue: any = null;
let emailEventsQueue: any = null;

const extractEventId = (message: any): string | null => {
  try {
    const rawValue = message?.value;
    if (!rawValue) {
      return null;
    }

    const payload = Buffer.isBuffer(rawValue)
      ? JSON.parse(rawValue.toString())
      : typeof rawValue === "string"
        ? JSON.parse(rawValue)
        : rawValue;

    if (payload?.eventId) {
      return payload.eventId;
    }

    if (payload?.value?.eventId) {
      return payload.value.eventId;
    }

    // Generate eventId from bookingId if missing (Stripe webhook doesn't send eventId)
    if (payload?.bookingId) {
      return `evt-email-${payload.bookingId}-${Date.now()}`;
    }
    if (payload?.value?.bookingId) {
      return `evt-email-${payload.value.bookingId}-${Date.now()}`;
    }

    return null;
  } catch {
    return null;
  }
};

const extractPayload = (message: any): any => {
  try {
    const rawValue = message?.value;
    if (!rawValue) return message;
    const payload = Buffer.isBuffer(rawValue)
      ? JSON.parse(rawValue.toString())
      : typeof rawValue === "string"
        ? JSON.parse(rawValue)
        : rawValue;
    return payload?.value || payload;
  } catch {
    return message;
  }
};

const start = async () => {
  try {
    const queues = await initializeQueues();
    emailQueue = queues.email;
    emailEventsQueue = queues.emailEvents;

    emailWorker = createEmailWorker();
    emailEventsWorker = createEmailEventsWorker();

    setupEmailQueueObservability(queues.email);
    setupEmailEventsQueueObservability(queues.emailEvents);

    console.log("✅ Email Queue initialized");
    console.log("✅ Email Events Queue initialized");

    await consumer.connect();

    await consumer.subscribe([
      {
        topicName: "user.created",
        topicHandler: async (message) => {
          const queue = getEmailEventsQueue();
          const eventId = extractEventId(message);
          if (!queue || !eventId) {
            console.warn("⚠️ [user.created] Missing queue/eventId, skipping");
            return;
          }

          await enqueueEmailEvent(queue, {
            eventId,
            eventType: "WELCOME",
            message,
          });
        },
      },
      {
        topicName: "booking-events",
        topicHandler: async (message) => {
          const queue = getEmailEventsQueue();
          const eventId = extractEventId(message);
          if (!queue || !eventId) {
            console.warn("⚠️ [booking-events] Missing queue/eventId, skipping");
            return;
          }

          await enqueueEmailEvent(queue, {
            eventId,
            eventType: "BOOKING_CREATED",
            message,
          });
        },
      },
      {
        topicName: "payment-events",
        topicHandler: async (message) => {
          const queue = getEmailEventsQueue();
          const eventId = extractEventId(message);
          if (!queue || !eventId) {
            console.warn("⚠️ [payment-events] Missing queue/eventId, skipping");
            return;
          }

          await enqueueEmailEvent(queue, {
            eventId,
            eventType: "PAYMENT_SUCCESS",
            message,
          });
        },
      },
    ]);

    console.log("🚀 Email Service is running & listening to topics...");
  } catch (error) {
    console.error("❌ Email Service Error:", error);
    process.exit(1);
  }
};

start();

// ============================================
// HTTP SERVER: Direct email trigger endpoint
// ============================================
const EMAIL_PORT = 8003;

const buildBookingEmailHTML = (data: any) => {
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return d || "N/A";
    }
  };
  return `
    <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #059669;">✅ Đặt phòng thành công!</h2>
      </div>
      <p>Xin chào <b>${data.user || "Quý khách"}</b>,</p>
      <p>Cảm ơn bạn đã đặt phòng tại <b>${data.hotel || "Stazy Hotel"}</b>.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background: #f9fafb;">
          <td style="padding: 10px; border: 1px solid #e5e7eb;">🏨 Khách sạn</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">${data.hotel || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">📅 Check-in</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${formatDate(data.checkInDate)}</td>
        </tr>
        <tr style="background: #f9fafb;">
          <td style="padding: 10px; border: 1px solid #e5e7eb;">📅 Check-out</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${formatDate(data.checkOutDate)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">💰 Tổng tiền</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #059669;">${formatPrice(data.amount || 0)}</td>
        </tr>
      </table>
    </div>`;
};

const httpServer = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/send-confirmation") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        console.log(
          `📨 [EMAIL-SERVICE] Đã nhận yêu cầu gửi mail cho: ${data.to}`,
        );

        if (!data.to) {
          console.error("❌ [EMAIL-SERVICE] Thiếu địa chỉ email");
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing 'to' email" }));
          return;
        }

        const emailQueue = getEmailQueue();
        if (emailQueue) {
          await enqueueEmail(emailQueue, {
            to: data.to,
            subject: `✅ Xác nhận đặt phòng: ${data.hotel || "Stazy Hotel"}`,
            html: buildBookingEmailHTML(data),
            messageId: `direct-${data.to}-${Date.now()}`,
            emailType: "PAYMENT_SUCCESS",
            metadata: data,
          });
          console.log(`✅ [EMAIL-SERVICE] Đã enqueue email cho: ${data.to}`);
        } else {
          // Fallback: send directly via nodemailer
          const sendMail = (await import("./utils/mailer.js")).default;
          const result = await sendMail({
            to: data.to,
            subject: `✅ Xác nhận đặt phòng: ${data.hotel || "Stazy Hotel"}`,
            html: buildBookingEmailHTML(data),
          });
          console.log(`✅ [EMAIL-SERVICE] Direct send result:`, result);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, to: data.to }));
      } catch (err: any) {
        console.error(
          "❌ [EMAIL-SERVICE] Lỗi thực tế từ nhà cung cấp dịch vụ mail:",
          err.message,
        );
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "email-service" }));
  }
});

httpServer.listen(EMAIL_PORT, () => {
  console.log(`📧 [EMAIL-SERVICE] HTTP server listening on port ${EMAIL_PORT}`);
});

const closeGracefully = async (signal: string) => {
  console.log(`Received signal to terminate: ${signal}`);

  if (emailEventsWorker) {
    await emailEventsWorker.close();
  }
  if (emailWorker) {
    await emailWorker.close();
  }
  if (emailEventsQueue) {
    await emailEventsQueue.close();
  }
  if (emailQueue) {
    await emailQueue.close();
  }

  await consumer.disconnect();

  console.log("🛑 Email service shut down gracefully");
  process.exit(0);
};

process.on("SIGINT", () => closeGracefully("SIGINT"));
process.on("SIGTERM", () => closeGracefully("SIGTERM"));
