import { Hono } from "hono";
import stripe from "../utils/stripe";
import { shouldBeUser } from "../middleware/authMiddleware";
import type { FullPaymentData } from "@repo/types";
import { v4 as uuidv4 } from "uuid";

const sessionRoute = new Hono();

sessionRoute.post("/create-checkout-session", shouldBeUser, async (c) => {
  try {
    const body = (await c.req.json()) as FullPaymentData;
    const { items, user, checkInDate, checkOutDate } = body;
    const userId = c.get("userId");

    // 1. Kiểm tra mảng rỗng
    if (!items || items.length === 0) {
      return c.json({ error: "Giỏ hàng trống" }, 400);
    }

    const bookingId = uuidv4();

    // 2. Lấy item đầu tiên
    const mainItem = items[0];

    // 🔥 FIX LỖI "mainItem is possibly undefined" TẠI ĐÂY
    // Nếu không lấy được mainItem thì chặn luôn
    if (!mainItem) {
      return c.json({ error: "Dữ liệu phòng không hợp lệ" }, 400);
    }

    // 👇 Tạo lineItems cho Stripe (Logic cũ)
    const lineItems = items.map((item) => {
      const imageUrl = item.featuredImage?.startsWith("http")
        ? item.featuredImage
        : "https://placehold.co/600x400";

      return {
        price_data: {
          currency: "vnd",
          product_data: {
            name: item.title,
            description: `Check-in: ${new Date(checkInDate).toLocaleDateString("vi-VN")}`,
            images: [imageUrl],
            metadata: {
              hotelId: String(item.id),
              slug: item.slug || "",
            },
          },
          unit_amount: item.price,
        },
        quantity: item.nights || 1,
      };
    });

    // 3. Tạo Session
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: lineItems,
      client_reference_id: userId,
      customer_email: user.email,

      // 👇 Metadata mở rộng (Giờ mainItem đã an toàn để dùng)
      metadata: {
        bookingId: bookingId,
        userId: userId,
        checkInDate: String(checkInDate),
        checkOutDate: String(checkOutDate),
        customerName: user.name,
        customerPhone: user.phone || "",

        // Dữ liệu thật từ mainItem
        hotelId: String(mainItem.id),
        hotelName: mainItem.title,
        hotelSlug: mainItem.slug || "",
        hotelImage: mainItem.featuredImage || "",
        hotelStars: String(mainItem.stars || 0),
        hotelAddress: mainItem.address || "Vietnam",
        roomId: String(body.roomId || mainItem.id),
        roomName: body.roomName || mainItem.name || "Standard Room",
      },

      return_url:
        "http://localhost:3002/return?session_id={CHECKOUT_SESSION_ID}",
    });

    return c.json({
      clientSecret: session.client_secret,
      bookingId: bookingId,
    });
  } catch (error: any) {
    console.error("❌ Create Session Error:", error.message);
    return c.json({ error: error.message }, 500);
  }
});

// --- CÁC ROUTE GET GIỮ NGUYÊN ---
sessionRoute.get("/:session_id", async (c) => {
  const { session_id } = c.req.param();
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    return c.json({
      status: session.status,
      paymentStatus: session.payment_status,
      bookingId: session.metadata?.bookingId,
      customer_email: session.customer_details?.email,
    });
  } catch (error) {
    return c.json({ error: "Session not found" }, 404);
  }
});

sessionRoute.get("/my-bookings", shouldBeUser, async (c) => {
  const userId = c.get("userId");
  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ["data.line_items"],
    });
    const userBookings = sessions.data.filter(
      (session) =>
        session.metadata?.userId === userId && session.status === "complete"
    );
    const formattedData = userBookings.map((session) => {
      const item = session.line_items?.data[0];
      return {
        id: session.id,
        bookingId: session.metadata?.bookingId,
        amount: session.amount_total,
        currency: session.currency,
        status: session.payment_status,
        created_at: new Date(session.created * 1000).toISOString(),
        hotel: {
          title: item?.description || "Phòng khách sạn",
          quantity: item?.quantity,
          price: item?.amount_total,
          image: null,
        },
        checkIn: session.metadata?.checkInDate,
        checkOut: session.metadata?.checkOutDate,
      };
    });
    return c.json({ success: true, data: formattedData });
  } catch (error: any) {
    return c.json({ error: "Lỗi lấy lịch sử" }, 500);
  }
});

export default sessionRoute;
