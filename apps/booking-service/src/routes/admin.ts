// routes/admin.ts
import { FastifyInstance } from "fastify";
import { shouldBeAdmin } from "../middleware/authMiddleware.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const SEARCH_SERVICE_PATH =
  process.env.SEARCH_SERVICE_PATH || "../../../search-service";
const PYTHON_CMD = process.env.PYTHON_CMD || "python";

export const adminRoute = async (fastify: FastifyInstance) => {
  // API trigger manual training
  fastify.post(
    "/train-ai",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      try {
        fastify.log.info("🤖 Admin triggered manual AI training");

        // Kiểm tra số lượng interactions trước
        const { prisma } = await import("@repo/product-db");
        const totalInteractions = await prisma.interaction.count({
          where: {
            type: { in: ["VIEW", "LIKE", "BOOK", "RATING"] },
          },
        });

        if (totalInteractions < 10) {
          return reply.status(400).send({
            success: false,
            message: "Chưa đủ dữ liệu để train (cần ít nhất 10 interactions)",
            data: { totalInteractions },
          });
        }

        // Chạy Python script train
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(
          `cd ${SEARCH_SERVICE_PATH} && ${PYTHON_CMD} train_real.py`,
          { timeout: 600000 }, // 10 phút
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        fastify.log.info(`✅ Training completed in ${duration}s`);

        return reply.send({
          success: true,
          message: `Train model thành công! (${duration}s)`,
          data: {
            duration,
            totalInteractions,
            output: stdout,
          },
        });
      } catch (error: any) {
        fastify.log.error("❌ Training failed:", error);
        return reply.status(500).send({
          success: false,
          message: "Lỗi khi train model",
          error: error.message,
        });
      }
    },
  );

  // API lấy training status
  fastify.get(
    "/training-status",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      try {
        const { prisma } = await import("@repo/product-db");

        // Lấy số liệu interactions
        const totalInteractions = await prisma.interaction.count();
        const recentInteractions = await prisma.interaction.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        });

        // Lấy metrics gần nhất (nếu có)
        const latestMetric = await prisma.systemMetric.findFirst({
          orderBy: { createdAt: "desc" },
        });

        return reply.send({
          totalInteractions,
          recentInteractions,
          lastTrained: latestMetric?.createdAt || null,
          metrics: latestMetric
            ? {
                rmse: latestMetric.rmse,
                precisionAt5: latestMetric.precisionAt5,
                recallAt5: latestMetric.recallAt5,
              }
            : null,
        });
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    },
  );
};
