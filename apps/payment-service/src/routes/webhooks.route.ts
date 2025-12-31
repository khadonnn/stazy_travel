import { Hono } from "hono";
import Stripe from "stripe";
import stripe from "../utils/stripe";
import { producer } from "../utils/kafka";
// import { producer } from "../utils/kafka";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
const webhookRoute = new Hono();

// Health check cho route webhook
webhookRoute.get("/", (c) => c.json({ status: "Stazy Webhook Active", timestamp: Date.now() }));

webhookRoute.post("/stripe", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature");

  let event: Stripe.Event;

  try {
    // 1. Xác thực sự kiện từ Stripe
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (error: any) {
    console.error(`❌ Webhook Error: ${error.message}`);
    return c.json({ error: "Invalid Signature" }, 400);
  }

  // 2. Xử lý các sự kiện quan trọng cho Hotel
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Lấy thêm thông tin chi tiết về phòng/dịch vụ khách đã mua
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

      // Gửi message sang Kafka để các service khác xử lý (Booking, Notification, Invoice)
      await producer.send("payment.successful", {
        value: {
          bookingId: session.metadata?.bookingId, // Quan trọng: ID đơn đặt phòng trong DB của bạn
          userId: session.client_reference_id,
          customerEmail: session.customer_details?.email,
          totalAmount: session.amount_total,
          currency: session.currency,
          paymentStatus: session.payment_status,
          // Mapping thông tin phòng từ Stripe
          rooms: lineItems.data.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            amount: item.amount_total,
          })),
        },
      });
      
      console.log(`✅ Booking ${session.metadata?.bookingId} paid successfully!`);
      break;
    }

    case "checkout.session.expired": {
      // Khách mở trang thanh toán nhưng không trả tiền và đóng lại
      // Bạn có thể dùng sự kiện này để "giải phóng" phòng đang giữ tạm (unhold)
      const session = event.data.object as Stripe.Checkout.Session;
      await producer.send("payment.expired", {
        value: { bookingId: session.metadata?.bookingId }
      });
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Stripe yêu cầu trả về 200 nhanh nhất có thể
  return c.json({ received: true }, 200);
});

export default webhookRoute;