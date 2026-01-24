import nodemailer from "nodemailer";

// 1. Cấu hình Transporter với App Password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "stoppingwave@gmail.com",
    pass: process.env.GOOGLE_APP_PASSWORD, // App Password từ Google
  },
});

// 2. Định nghĩa kiểu dữ liệu đầu vào
interface SendMailParams {
  to: string; // Đổi tên 'email' thành 'to' cho chuẩn Nodemailer
  subject: string;
  text?: string; // Text thô (fallback)
  html?: string; // 🔥 Quan trọng: Để gửi giao diện đẹp
}

const sendMail = async ({ to, subject, text, html }: SendMailParams) => {
  try {
    // Kiểm tra kết nối trước (Optional)
    await transporter.verify();

    const res = await transporter.sendMail({
      from: `"Stazy Booking" <${process.env.EMAIL_USER}>`, // Tên hiển thị + Email thật
      to,
      subject,
      text: text || "Vui lòng xem email này trên trình duyệt hỗ trợ HTML.", // Fallback text
      html,
    });

    console.log("✅ EMAIL SENT SUCCESS:", res.messageId);
    return { success: true, messageId: res.messageId };
  } catch (error) {
    console.error("❌ EMAIL SEND FAILED:", error);
    return { success: false, error };
  }
};

export default sendMail;
