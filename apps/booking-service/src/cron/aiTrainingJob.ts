import cron from "node-cron";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const SEARCH_SERVICE_PATH =
  process.env.SEARCH_SERVICE_PATH || "../../../search-service";
const PYTHON_CMD = process.env.PYTHON_CMD || "python"; // hoặc "python3" trên Linux/Mac

export const startAITrainingJob = () => {
  console.log("🤖 AI Training Cron Job initialized...");

  // Chạy lúc 02:00 mỗi ngày (sau khi DailyStat đã chạy xong)
  cron.schedule(
    "0 2 * * *",
    async () => {
      console.log("🧠 Bắt đầu train lại AI Recommendation Model...");
      await trainRecommendationModel();
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  // (Optional) Train lại mỗi khi có >= 100 interactions mới
  // Có thể thêm logic check trong hàm aggregateDailyStats
};

async function trainRecommendationModel() {
  try {
    // Kiểm tra xem có đủ dữ liệu mới để train không
    const shouldTrain = await checkIfShouldTrain();

    if (!shouldTrain) {
      console.log("ℹ️ Chưa đủ dữ liệu mới, bỏ qua training lần này");
      return;
    }

    console.log("⏳ Đang chạy script train_real.py...");

    // Chạy Python script
    const { stdout, stderr } = await execAsync(
      `cd ${SEARCH_SERVICE_PATH} && ${PYTHON_CMD} train_real.py`,
      { timeout: 600000 }, // Timeout 10 phút
    );

    console.log("📊 Output từ Python:", stdout);

    if (stderr) {
      console.warn("⚠️ Warnings:", stderr);
    }

    console.log("✅ Train model AI thành công!");

    // (Optional) Lưu log vào DB
    // await saveTrainingLog({ success: true, timestamp: new Date() });
  } catch (error) {
    console.error("❌ Lỗi khi train AI model:", error);
    // (Optional) Gửi alert qua Slack/Email
    // await sendAlertToAdmin(error);
  }
}

// Kiểm tra xem có nên train không (tránh train khi không có dữ liệu mới)
async function checkIfShouldTrain(): Promise<boolean> {
  try {
    // Logic 1: Train nếu có >= 50 interactions mới trong 24h qua
    const { prisma } = await import("@repo/product-db");

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentInteractions = await prisma.interaction.count({
      where: {
        timestamp: { gte: oneDayAgo },
        type: {
          in: [
            "VIEW",
            "ADD_TO_WISHLIST",
            "BOOK",
            "RATE_POSITIVE",
            "RATE_NEGATIVE",
          ],
        },
      },
    });

    console.log(`📈 Có ${recentInteractions} interactions mới trong 24h`);

    // Chỉ train nếu có ít nhất 50 interactions mới
    return recentInteractions >= 50;
  } catch (error) {
    console.error("❌ Lỗi khi check training condition:", error);
    return false; // Không train nếu có lỗi
  }
}
