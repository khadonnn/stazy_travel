// services/booking-service/src/routes/message.ts

import { FastifyInstance } from "fastify";
import { shouldBeAdmin, shouldBeUser } from "../middleware/authMiddleware";
import { prisma } from "@repo/product-db";

export const messageRoute = async (fastify: FastifyInstance) => {
  // ⚠️ QUAN TRỌNG: Đăng ký static routes TRƯỚC dynamic routes
  // Vì Fastify match theo thứ tự, /:userId sẽ nuốt /conversations nếu đăng ký trước

  // 1. API ADMIN: LẤY DANH SÁCH USER ĐANG CHAT (Sidebar Admin)
  fastify.get(
    "/conversations",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      // Lấy tin nhắn mới nhất của mỗi userId + userName từ bất kỳ tin nhắn USER nào
      const conversations = await prisma.$queryRaw<
        Array<{
          userId: string;
          lastMessage: string | null;
          lastTimestamp: Date;
          userName: string | null;
          unreadCount: bigint;
        }>
      >`
        SELECT 
          latest."userId",
          cm."text" as "lastMessage",
          latest.max_created as "lastTimestamp",
          (
            SELECT (cm_name."metadata"->>'userName')
            FROM "chat_messages" cm_name
            WHERE cm_name."userId" = latest."userId"
              AND cm_name."metadata"->>'userName' IS NOT NULL
              AND cm_name."metadata"->>'userName' != ''
            ORDER BY cm_name."createdAt" ASC
            LIMIT 1
          ) as "userName",
          (
            SELECT COUNT(*) 
            FROM "chat_messages" cm2 
            WHERE cm2."userId" = latest."userId" 
              AND cm2."sender" = 'USER' 
              AND cm2."isRead" = false
          ) as "unreadCount"
        FROM (
          SELECT "userId", MAX("createdAt") as max_created
          FROM "chat_messages"
          GROUP BY "userId"
        ) latest
        INNER JOIN "chat_messages" cm 
          ON cm."userId" = latest."userId" AND cm."createdAt" = latest.max_created
        ORDER BY latest.max_created DESC
      `;

      const formatted = conversations.map((c) => ({
        userId: c.userId,
        userName: c.userName || `Khách hàng (${c.userId.slice(-4)})`,
        lastMessage: c.lastMessage,
        lastTimestamp: c.lastTimestamp,
        unreadCount: Number(c.unreadCount),
      }));

      return reply.send(formatted);
    },
  );

  // 2. API ĐÁNH DẤU ĐÃ ĐỌC (Khi Admin bấm vào chat)
  fastify.post<{ Body: { userId: string } }>(
    "/mark-read",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const { userId } = request.body;

      await prisma.chatMessage.updateMany({
        where: {
          userId: userId,
          sender: "USER",
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return reply.send({ success: true });
    },
  );

  // 3. API LẤY TỔNG SỐ TIN NHẮN CHƯA ĐỌC (Badge đỏ ở Menu Admin)
  fastify.get(
    "/stats/unread",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const count = await prisma.chatMessage.count({
        where: {
          sender: "USER",
          isRead: false,
        },
      });
      return reply.send({ count });
    },
  );

  // 4. API LẤY TIN NHẮN CỦA MỘT USER (Cho cả Admin và User tự xem)
  // ⚠️ PHẢI ĐĂNG KÝ CUỐI CÙNG vì /:userId sẽ match tất cả paths
  fastify.get<{ Params: { userId: string } }>(
    "/:userId",
    async (request, reply) => {
      const { userId } = request.params;

      // Bảo mật: Nếu là user thường, chỉ được xem tin nhắn của chính mình
      // @ts-ignore
      const requesterId = request.userId;
      // @ts-ignore
      const requesterRole = request.auth?.sessionClaims?.metadata?.role;

      // Bỏ qua auth check cho admin request (token có role admin)
      // Hoặc khi requester là chính user đó
      if (requesterRole !== "admin" && requesterId && requesterId !== userId) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      const messages = await prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });

      if (!messages || messages.length === 0) {
        return reply.send([]);
      }

      // Map sang format cũ để client không cần thay đổi
      const formatted = messages.map((m) => ({
        _id: m.id,
        userId: m.userId,
        sender: m.sender.toLowerCase(), // "USER" -> "user", "ADMIN" -> "admin"
        text: m.text,
        images: m.images,
        isRead: m.isRead,
        metadata: m.metadata,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));

      return reply.send(formatted);
    },
  );
};
