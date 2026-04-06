import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/hotels:
 *   get:
 *     tags:
 *       - Admin › Hotels
 *     summary: Lấy danh sách khách sạn
 *     description: Trả về danh sách khách sạn, có thể lọc theo trạng thái.
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Lọc theo trạng thái duyệt
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
 *         description: Danh sách khách sạn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hotels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [PENDING, APPROVED, REJECTED]
 *                       submittedAt:
 *                         type: string
 *                         format: date-time
 *                       author:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
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

        const [hotels, total] = await Promise.all([
            prisma.hotel.findMany({
                where,
                include: {
                    author: {
                        select: { id: true, name: true, email: true, avatar: true },
                    },
                    category: {
                        select: { id: true, name: true },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { submittedAt: 'desc' },
            }),
            prisma.hotel.count({ where }),
        ]);

        return NextResponse.json({ hotels, total, page, limit });
    } catch (error) {
        console.error('GET /api/hotels error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
