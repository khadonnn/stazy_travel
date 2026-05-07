import { Hono } from "hono";
import Stripe from "stripe";
import stripe from "../utils/stripe";
import { producer } from "../utils/kafka";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
const webhookRoute = new Hono();

// Test route để verify webhook endpoint
webhookRoute.get("/test", (c) => {
  return c.json({
    message: "Webhook endpoint is working!",
    timestamp: new Date().toISOString(),
  });
});

webhookRoute.post("/stripe", async (c) => {
  console.log("------------------------------------------------");
  console.log("🔵 [1] Webhook: Có tín hiệu từ Stripe gửi tới!");

  const body = await c.req.text();
  const sig = c.req.header("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
    console.log("🟢 [2] Webhook: Xác thực chữ ký thành công (Signature Valid)");
  } catch (error: any) {
    console.error(`❌ [LỖI] Webhook Signature Error: ${error.message}`);
    return c.json({ error: "Invalid Signature" }, 400);
  }

  // Lấy metadata
  console.log(`ℹ️  [3] Event Type: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    console.log(`🔍 [4] Kiểm tra Metadata...`);
    console.log(`    - Booking ID: ${bookingId ? bookingId : "NULL ❌"}`);

    if (!bookingId) {
      console.error(
        "❌ [LỖI NGHIÊM TRỌNG] Không tìm thấy bookingId trong metadata. Dừng xử lý!",
      );
      return c.json({ received: true });
    }

    try {
      console.log(`🚀 [5] Đang chuẩn bị gửi tin nhắn sang Kafka...`);

      //  CẬP NHẬT PAYLOAD: Lấy thêm thông tin Hotel & Customer từ Metadata
      const kafkaPayload = {
        event: "PAYMENT_PROCESSED",
        bookingId: bookingId,
        userId: session.metadata?.userId || session.client_reference_id,
        stripeSessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
        status: "PAID",

        // Thông tin khách hàng (Ưu tiên lấy từ metadata nếu user nhập form)
        customerEmail: session.customer_details?.email,
        customerName:
          session.metadata?.customerName || session.customer_details?.name,
        customerPhone:
          session.metadata?.customerPhone || session.customer_details?.phone,
        // nodemailer
        email: session.customer_details?.email || session.metadata?.email, // Email người nhận
        user: session.customer_details?.name || session.metadata?.customerName, // Tên người nhận
        hotel: session.metadata?.hotelName, // Tên khách sạn (lấy phẳng ra ngoài)
        // Thông tin ngày giờ
        checkInDate: session.metadata?.checkInDate,
        checkOutDate: session.metadata?.checkOutDate,

        // 👇 MỚI: Thông tin Snapshot Khách Sạn (Để lưu tên thật vào DB)
        hotelInfo: {
          id: session.metadata?.hotelId,
          name: session.metadata?.hotelName,
          slug: session.metadata?.hotelSlug,
          image: session.metadata?.hotelImage,
          address: session.metadata?.hotelAddress,
        },
      };

      console.log(
        `📤 [KAFKA PRODUCER] Đang gửi message booking_id: ${bookingId} vào topic booking-events...`,
      );
      await producer.send("booking-events", kafkaPayload);
      console.log(
        `📤 [KAFKA PRODUCER] ✅ Đã gửi message booking_id: ${bookingId} vào topic booking-events`,
      );
      console.log(`    Payload:`, JSON.stringify(kafkaPayload, null, 2));
    } catch (kafkaError) {
      console.error(
        `📤 [KAFKA PRODUCER] ❌ LỖI gửi Kafka cho booking_id: ${bookingId}:`,
        kafkaError,
      );
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const bookingId = paymentIntent.metadata?.bookingId;

    console.log(`🔍 [4] Kiểm tra PaymentIntent...`);
    console.log(`    - Booking ID: ${bookingId ? bookingId : "NULL ❌"}`);

    if (!bookingId) {
      console.error(
        "❌ [LỖI NGHIÊM TRỌNG] Không tìm thấy bookingId trong payment_intent metadata.",
      );
      return c.json({ received: true });
    }

    try {
      const kafkaPayload = {
        event: "PAYMENT_FAILED",
        bookingId,
        userId: paymentIntent.metadata?.userId,
        paymentIntentId: paymentIntent.id,
        reason:
          paymentIntent.last_payment_error?.message ||
          paymentIntent.last_payment_error?.code ||
          "payment_intent.payment_failed",
      };

      await producer.send("payment-events", kafkaPayload);

      console.log(`✅ [6] Đã gửi Kafka thành công! Topic: payment-events`);
      console.log(
        `    - Payload gửi đi:`,
        JSON.stringify(kafkaPayload, null, 2),
      );
    } catch (kafkaError) {
      console.error(
        "❌ [LỖI] Không gửi được Kafka payment-events:",
        kafkaError,
      );
    }
  } else {
    console.log("⚠️ [SKIP] Event này không phải là checkout.session.completed");
  }

  return c.json({ received: true });
});

export default webhookRoute;
