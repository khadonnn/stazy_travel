// routes/payment.route.ts
import { Hono } from "hono";
import { vnpay } from "../utils/vnpay.js";
import { ProductCode, VnpLocale, dateFormat } from 'vnpay';

const paymentRoute = new Hono();

paymentRoute.post('/create-qr', async (c) => {
    try {
        // 1. Lấy dữ liệu từ Frontend gửi lên (nếu có)
        // Ví dụ: body = { amount: 50000, orderId: "DH001", bankCode: "NCB" }
        const body = await c.req.json().catch(() => ({})); 

        // 2. Lấy IP của người dùng (Quan trọng với VNPay)
        // Trong Hono/Node, lấy header x-forwarded-for hoặc fallback về localhost
        const ipAddr = c.req.header('x-forwarded-for') || '127.0.0.1';

        // 3. Tính toán thời gian hết hạn (ví dụ 15 phút sau)
        const tomorrow = new Date();
        tomorrow.setMinutes(tomorrow.getMinutes() + 15);

        // 4. Tạo URL
        const urlString = await vnpay.buildPaymentUrl({
            vnp_Amount: body.amount || 100000, // Giá trị mặc định nếu body ko gửi
            vnp_IpAddr: ipAddr,
            vnp_TxnRef: body.orderId || Date.now().toString(), // Mã đơn hàng phải là duy nhất
            vnp_OrderInfo: `Thanh toan don hang ${body.orderId || 'Test'}`,
            vnp_OrderType: ProductCode.Other,
            vnp_ReturnUrl: 'http://localhost:3000/api/check-payment-vnpay', // URL Frontend nhận kết quả
            vnp_Locale: VnpLocale.VN, // 'vn' hoặc 'en'
            vnp_CreateDate: dateFormat(new Date()), // Format ngày tạo chuẩn VNPay
            vnp_ExpireDate: dateFormat(tomorrow),   // Thời gian hết hạn giao dịch
        });

        // 5. Trả về URL cho Frontend redirect
        return c.json({ url: urlString });

    } catch (error) {
        console.error("Lỗi tạo link thanh toán:", error);
        return c.json({ error: 'Không thể tạo link thanh toán' }, 500);
    }
});

export default paymentRoute;