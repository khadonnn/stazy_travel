import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Admin › Users
 *     summary: Lấy danh sách tất cả người dùng
 *     description: Trả về danh sách toàn bộ người dùng trong hệ thống. Yêu cầu quyền Admin.
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng kết quả trên mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc email
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                         enum: [USER, AUTHOR, ADMIN]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') ?? '1');
        const limit = parseInt(searchParams.get('limit') ?? '20');
        const search = searchParams.get('search') ?? '';

        const where = search
            ? {
                  OR: [
                      { name: { contains: search, mode: 'insensitive' as const } },
                      { email: { contains: search, mode: 'insensitive' as const } },
                  ],
              }
            : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    role: true,
                    createdAt: true,
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        return NextResponse.json({ users, total, page, limit });
    } catch (error) {
        console.error('GET /api/users error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
