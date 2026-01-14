// services/booking-service/src/routes/message.ts

import { FastifyInstance } from "fastify";
import { shouldBeAdmin, shouldBeUser } from "../middleware/authMiddleware";
import { Message } from "@repo/booking-db"; // Nhớ export Message model từ booking-db

export const messageRoute = async (fastify: FastifyInstance) => {
  // 1. API LẤY TIN NHẮN CỦA MỘT USER (Cho cả Admin và User tự xem)
  fastify.get<{ Params: { userId: string } }>(
    "/messages/:userId",
    async (request, reply) => {
      const { userId } = request.params;

      // Bảo mật: Nếu là user thường, chỉ được xem tin nhắn của chính mình
      // @ts-ignore
      const requesterId = request.userId;
      // @ts-ignore
      const requesterRole = request.auth?.sessionClaims?.metadata?.role;

      if (requesterRole !== "admin" && requesterId !== userId) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      const messages = await Message.find({ userId })
        .sort({ createdAt: 1 })
        .lean();
      if (!messages) {
        return reply.send([]);
      }
      return reply.send(messages);
    }
  );

  // 2. API ADMIN: LẤY DANH SÁCH USER ĐANG CHAT (Sidebar Admin)
  fastify.get(
    "/conversations",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const conversations = await Message.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$userId",
            lastMessage: { $first: "$text" },
            lastTimestamp: { $first: "$createdAt" },
            // 🔥 CẬP NHẬT: Lấy userName từ metadata của tin nhắn gần nhất
            // Nếu không có metadata.userName thì fallback về null
            userName: { $first: "$metadata.userName" },

            unreadCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$sender", "user"] },
                      { $eq: ["$isRead", false] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { lastTimestamp: -1 } },
      ]);

      // Map lại dữ liệu trả về
      const formatted = conversations.map((c) => ({
        userId: c._id,
        // 🔥 Ưu tiên dùng tên lấy được từ DB, nếu không có mới dùng ID
        userName: c.userName || `Khách hàng (${c._id.slice(-4)})`,
        lastMessage: c.lastMessage,
        lastTimestamp: c.lastTimestamp,
        unreadCount: c.unreadCount,
      }));

      return reply.send(formatted);
    }
  );

  // 3. API ĐÁNH DẤU ĐÃ ĐỌC (Khi Admin bấm vào chat)
  fastify.post<{ Body: { userId: string } }>(
    "/messages/mark-read",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const { userId } = request.body;

      await Message.updateMany(
        { userId: userId, sender: "user", isRead: false },
        { $set: { isRead: true } }
      );

      return reply.send({ success: true });
    }
  );

  // 4. API LẤY TỔNG SỐ TIN NHẮN CHƯA ĐỌC (Badge đỏ ở Menu Admin)
  fastify.get(
    "/messages/stats/unread",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const count = await Message.countDocuments({
        sender: "user",
        isRead: false,
      });
      return reply.send({ count });
    }
  );
};
