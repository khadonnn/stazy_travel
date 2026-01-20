import cron from "node-cron";
import { Booking } from "@repo/booking-db";
import { prisma } from "@repo/product-db";

export const startCronJobs = () => {
  console.log("⏰ Cron Jobs system initialized...");

  // Chạy 00:00:10 (thêm 10s delay cho chắc) mỗi ngày theo giờ VN
  cron.schedule(
    "10 0 * * *",
    async () => {
      console.log("🔄 Bắt đầu tổng hợp thống kê ngày (DailyStat)...");
      await aggregateDailyStats();
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );
};

async function aggregateDailyStats() {
  try {
    // ---------------------------------------------------------
    // 1. XỬ LÝ NGÀY THÁNG (QUAN TRỌNG: FIX TIMEZONE UTC+7)
    // ---------------------------------------------------------
    // Lấy thời gian hiện tại
    const now = new Date();

    // Chuyển đổi sang giờ Việt Nam để xác định đúng là "ngày nào"
    // (Hack nhẹ: cộng 7 tiếng nếu server là UTC để khớp logic ngày)
    // Cách an toàn nhất cho đồ án: Tính theo mốc 00:00 hôm qua của giờ Server
    // Giả sử server chạy UTC, ta cần tính khoảng Start/End của ngày hôm qua theo UTC

    // Tốt nhất: Dùng thư viện date-fns hoặc moment-timezone,
    // nhưng để đơn giản không cần cài thêm lib, ta dùng logic lùi 24h từ lúc Cron chạy.

    // Vì cron chạy lúc 00:00 VN (tức là vừa sang ngày mới),
    // ta muốn lấy data của TRỌN VẸN 24h trước đó.

    const endWindow = new Date(now);
    // Cron chạy 00:00:10 ngày hôm nay -> EndWindow là hiện tại

    const startWindow = new Date(endWindow);
    startWindow.setDate(startWindow.getDate() - 1);
    // StartWindow là 00:00:10 ngày hôm qua

    // Reset chính xác về 00:00:00.000 và 23:59:59.999
    // Lưu ý: MongoDB lưu UTC, nên ta cứ tính theo Date object chuẩn là Mongo tự hiểu.
    const startOfDay = new Date(startWindow);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startWindow);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(
      `📊 Đang tính toán data từ: ${startOfDay.toISOString()} đến ${endOfDay.toISOString()}`,
    );

    // ---------------------------------------------------------
    // 2. MONGODB AGGREGATION
    // ---------------------------------------------------------
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          // Lọc đơn hàng tạo trong khoảng thời gian trên
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "CONFIRMED"] }, "$totalPrice", 0],
            },
          },
          totalBookings: {
            $sum: {
              // Tính cả CONFIRMED và COMPLETED là thành công
              $cond: [{ $in: ["$status", ["CONFIRMED", "COMPLETED"]] }, 1, 0],
            },
          },
          totalCancels: {
            $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = bookingStats[0] || {
      totalRevenue: 0,
      totalBookings: 0,
      totalCancels: 0,
    };

    // ---------------------------------------------------------
    // 3. LƯU VÀO PRISMA (POSTGRES)
    // ---------------------------------------------------------

    // Lưu ý: startOfDay đang là đối tượng Date (có giờ).
    // Prisma @db.Date sẽ tự cắt phần giờ chỉ lấy ngày YYYY-MM-DD.

    await prisma.dailyStat.upsert({
      where: {
        date: startOfDay,
      },
      update: {
        // Nếu đã có record (vd chạy lại cron), cập nhật số liệu mới nhất
        totalRevenue: result.totalRevenue,
        totalBookings: result.totalBookings,
        totalCancels: result.totalCancels,
      },
      create: {
        date: startOfDay,
        totalRevenue: result.totalRevenue,
        totalBookings: result.totalBookings,
        totalCancels: result.totalCancels,
        // Các chỉ số khác khởi tạo bằng 0
        totalViews: 0,
        totalClickBook: 0,
        totalLikes: 0,
        totalSearch: 0,
      },
    });

    console.log(
      `✅ Đã lưu DailyStat thành công cho ngày: ${startOfDay.toISOString()}`,
    );
  } catch (error) {
    console.error("❌ Lỗi Cron Job Analytics:", error);
  }
}
