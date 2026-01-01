import { Hono } from "hono";
import Stripe from "stripe";
import stripe from "../utils/stripe";
import { producer } from "../utils/kafka";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
const webhookRoute = new Hono();

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
  const session = event.data.object as Stripe.Checkout.Session;
  const bookingId = session.metadata?.bookingId;

  console.log(`ℹ️  [3] Event Type: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    console.log(`🔍 [4] Kiểm tra Metadata...`);
    console.log(`    - Booking ID: ${bookingId ? bookingId : "NULL ❌"}`);
    console.log(`    - User ID: ${session.metadata?.userId}`);

    if (!bookingId) {
      console.error(
        "❌ [LỖI NGHIÊM TRỌNG] Không tìm thấy bookingId trong metadata. Dừng xử lý!"
      );
      return c.json({ received: true });
    }

    try {
      console.log(`🚀 [5] Đang chuẩn bị gửi tin nhắn sang Kafka...`);

      // Payload gửi đi
      const kafkaPayload = {
        bookingId: bookingId,
        userId: session.metadata?.userId || session.client_reference_id,
        stripeSessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
        status: "PAID",
        customerEmail: session.customer_details?.email,
        checkInDate: session.metadata?.checkInDate,
        checkOutDate: session.metadata?.checkOutDate,
      };

      await producer.send("payment.successful", {
        value: kafkaPayload,
      });

      console.log(`✅ [6] Đã gửi Kafka thành công! Topic: payment.successful`);
      console.log(
        `    - Payload gửi đi:`,
        JSON.stringify(kafkaPayload, null, 2)
      );
    } catch (kafkaError) {
      console.error("❌ [LỖI] Không gửi được Kafka:", kafkaError);
    }
  } else {
    console.log("⚠️ [SKIP] Event này không phải là checkout.session.completed");
  }

  return c.json({ received: true });
});

export default webhookRoute;
