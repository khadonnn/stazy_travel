import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/author-requests:
 *   get:
 *     tags:
 *       - Admin › Author Requests
 *     summary: Lấy danh sách yêu cầu trở thành tác giả
 *     description: Trả về các yêu cầu đăng ký trở thành Author, có thể lọc theo trạng thái.
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Danh sách yêu cầu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [PENDING, APPROVED, REJECTED]
 *                       reason:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                 total:
 *                   type: integer
 *       401:
 *         description: Chưa đăng nhập
 */
export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null;
        const page = parseInt(searchParams.get('page') ?? '1');
        const limit = parseInt(searchParams.get('limit') ?? '20');

        const where = status ? { status } : {};

        const [requests, total] = await Promise.all([
            prisma.authorRequest.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatar: true },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.authorRequest.count({ where }),
        ]);

        return NextResponse.json({ requests, total, page, limit });
    } catch (error) {
        console.error('GET /api/author-requests error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
