import { Hono } from "hono";
import stripe from "../utils/stripe";
import { shouldBeUser } from "../middleware/authMiddleware";
import type { FullPaymentData } from "@repo/types"; // Import type mới

const sessionRoute = new Hono();

sessionRoute.post("/create-checkout-session", shouldBeUser, async (c) => {
  try {
    // 1. Ép kiểu body nhận về thành FullPaymentData
    const body = await c.req.json() as FullPaymentData;
    const { items, user, checkInDate, checkOutDate } = body;
    
    // Lấy ID người dùng từ middleware auth (nếu cần reference)
    const userId = c.get("userId");

    if (!items || items.length === 0) {
      return c.json({ error: "Giỏ hàng trống" }, 400);
    }

    // 2. Map Items sang định dạng Stripe Line Items
    const lineItems = items.map((item: FullPaymentData["items"][number]) => {
      // Đảm bảo ảnh là URL tuyệt đối (nếu không Stripe sẽ báo lỗi)
      // Ví dụ: nếu item.featuredImage là "/img.jpg", bạn cần thêm domain vào trước.
      // Tạm thời giả định item.featuredImage đã là URL đầy đủ hoặc bạn xử lý ở frontend.
      const validImages = item.featuredImage ? [item.featuredImage] : [];

      return {
        price_data: {
          currency: "vnd", // Đơn vị tiền tệ
          product_data: {
            name: item.title, // Tên khách sạn
            description: `Đặt phòng tại ${item.address || 'Địa điểm du lịch'}`,
            images: validImages,
            metadata: {
              // 🔥 Quan trọng: Stripe metadata value BẮT BUỘC phải là String
              hotelId: String(item.id), 
              slug: item.slug || ""
            }
          },
          unit_amount: item.price, // Giá tiền 1 đêm (VND)
        },
        quantity: item.nights || 1, // Số lượng = Số đêm
      };
    });

    // 3. Tạo Checkout Session
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded', // Form nhúng
      mode: "payment",
      line_items: lineItems,
      
      // Gắn ID user vào session để đối soát sau này
      client_reference_id: userId, 
      
      // Điền sẵn email khách hàng vào form thanh toán
      customer_email: user.email, 

      // 4. Lưu thông tin Booking vào Metadata của Session
      // Webhook sẽ đọc cái này để tạo Booking trong Database khi thanh toán thành công
      metadata: {
        userId: userId,
        checkInDate: String(checkInDate),
        checkOutDate: String(checkOutDate),
        customerName: user.name,
        customerPhone: user.phone,
        customerAddress: user.address || "Chưa cung cấp",
        // Lưu ý: Metadata của Stripe có giới hạn ký tự, cẩn thận nếu address quá dài
      },
      
      // Đường dẫn redirect khi thanh toán xong (được frontend xử lý với embedded)
        return_url: "http://localhost:3002/return?session_id={CHECKOUT_SESSION_ID}",
        success_url: "http://localhost:3002/return?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:3002/cart?status=cancel",

    });
    console.log("✅ Created Stripe Session:", session.id);
    return c.json({ clientSecret: session.client_secret });

  } catch (error: any) {
    console.error("❌ Stripe Session Error:", error);
    console.error("❌ STRIPE ERROR DETAILED:", JSON.stringify(error, null, 2));
    return c.json({ error: error.message || "Lỗi tạo phiên thanh toán" }, 500);
  }
});

sessionRoute.get("/:session_id", async (c) => {
  const { session_id } = c.req.param();
  try {
    const session = await stripe.checkout.sessions.retrieve(
      session_id as string,
      {
        expand: ["line_items"],
      }
    );

    return c.json({
      status: session.status,
      paymentStatus: session.payment_status,
      customer_email: session.customer_details?.email,
    });
  } catch (error) {
    return c.json({ error: "Session not found" }, 404);
  }
});

sessionRoute.get("/my-bookings", shouldBeUser, async (c) => {
  const userId = c.get("userId");

  try {
    // 1. Tìm các checkout sessions của user này
    // Lưu ý: Stripe search có thể mất vài giây để index metadata mới
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
    });

    // 2. Lọc các session đã thanh toán thành công và thuộc về userId này
    const userBookings = sessions.data.filter(
      (session) => 
        session.metadata?.userId === userId && 
        session.payment_status === "paid"
    );

    // 3. Format lại dữ liệu để trả về cho Frontend giống với interface cũ
    const formattedData = await Promise.all(userBookings.map(async (session) => {
      // Lấy chi tiết các món hàng (khách sạn) trong session đó
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

      return {
        id: session.id,
        booking_number: session.id.slice(-8).toUpperCase(),
        total_amount: session.amount_total,
        status: session.status,
        payment_status: session.payment_status,
        created_at: new Date(session.created * 1000).toISOString(),
        check_in_date: session.metadata?.checkInDate,
        check_out_date: session.metadata?.checkOutDate,
        // Giả sử mỗi session đặt 1 khách sạn (line item đầu tiên)
        hotel: {
          title: lineItems.data[0]?.description,
          address: session.metadata?.customerAddress,
        }
      };
    }));

    return c.json({ success: true, data: formattedData });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
export default sessionRoute;