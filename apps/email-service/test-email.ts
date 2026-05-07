import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "stoppingwave@gmail.com",
    pass: process.env.GOOGLE_APP_PASSWORD || "ogslrkthrqmuxsjh",
  },
});

async function test() {
  try {
    console.log("🔍 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified!");

    const res = await transporter.sendMail({
      from: '"Stazy Booking" <stoppingwave@gmail.com>',
      to: "chi.co.the.la.kha@gmail.com",
      subject: "✅ Test email from Stazy",
      html: "<h1>Test</h1><p>Email service is working!</p>",
    });
    console.log("✅ Email sent:", res.messageId);
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    console.error("Full error:", err);
  }
}

test();
