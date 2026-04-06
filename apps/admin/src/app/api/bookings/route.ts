import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     tags:
 *       - Admin › Bookings
 *     summary: Lấy danh sách đặt phòng
 *     description: Trả về danh sách tất cả đơn đặt phòng trong hệ thống.
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED]
 *         description: Lọc theo trạng thái đặt phòng
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
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Đến ngày (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Danh sách đặt phòng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       status:
 *                         type: string
 *                       checkIn:
 *                         type: string
 *                         format: date
 *                       checkOut:
 *                         type: string
 *                         format: date
 *                       totalAmount:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
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
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') ?? '1');
        const limit = parseInt(searchParams.get('limit') ?? '20');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const where: Record<string, any> = {};
        if (status) where.status = status;
        if (from || to) {
            where.checkIn = {};
            if (from) where.checkIn.gte = new Date(from);
            if (to) where.checkIn.lte = new Date(to);
        }

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    hotel: { select: { id: true, title: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.count({ where }),
        ]);

        return NextResponse.json({ bookings, total, page, limit });
    } catch (error) {
        console.error('GET /api/bookings error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
