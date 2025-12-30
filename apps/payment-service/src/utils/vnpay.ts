// utils/vnpay.ts
import { VNPay, ignoreLogger } from 'vnpay';

export const vnpay = new VNPay({
    tmnCode: process.env.VNP_TMN_CODE || '4PDEKRFM', // Tốt nhất nên để trong file .env
    secureSecret: process.env.VNP_HASH_SECRET || 'ORFT2PH5OUQTBPRF52QYEMF1GPJ9JYWO',
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: true, // True cho môi trường Sandbox
    enableLog: true, // Bật log để dễ debug (tùy chọn)
    loggerFn: ignoreLogger, // Hoặc thay bằng console.log nếu muốn xem log
});