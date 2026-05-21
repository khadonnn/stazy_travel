import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

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
