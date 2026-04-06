import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/stats:
 *   get:
 *     tags:
 *       - Admin › Stats
 *     summary: Lấy thống kê tổng quan Dashboard
 *     description: |
 *       Trả về các số liệu thống kê tổng quan:
 *       - Tổng người dùng
 *       - Tổng khách sạn
 *       - Tổng đặt phòng
 *       - Doanh thu (từ các booking COMPLETED)
 *       - Số khách sạn đang chờ duyệt
 *       - Số author request đang chờ duyệt
 *     security:
 *       - ClerkAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                   example: 1024
 *                 totalHotels:
 *                   type: integer
 *                   example: 256
 *                 totalBookings:
 *                   type: integer
 *                   example: 4096
 *                 totalRevenue:
 *                   type: number
 *                   format: float
 *                   example: 123456789
 *                 pendingHotels:
 *                   type: integer
 *                   example: 12
 *                 pendingAuthorRequests:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Chưa đăng nhập
 */
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [totalUsers, totalHotels, totalBookings, revenueResult, pendingHotels, pendingAuthorRequests] =
            await Promise.all([
                prisma.user.count(),
                prisma.hotel.count(),
                prisma.booking.count(),
                prisma.booking.aggregate({
                    where: { status: 'COMPLETED' },
                    _sum: { totalAmount: true },
                }),
                prisma.hotel.count({ where: { status: 'PENDING' } }),
                prisma.authorRequest.count({ where: { status: 'PENDING' } }),
            ]);

        return NextResponse.json({
            totalUsers,
            totalHotels,
            totalBookings,
            totalRevenue: revenueResult._sum.totalAmount ?? 0,
            pendingHotels,
            pendingAuthorRequests,
        });
    } catch (error) {
        console.error('GET /api/stats error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
