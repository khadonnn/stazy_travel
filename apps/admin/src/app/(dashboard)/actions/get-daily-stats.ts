'use server';

export async function getDailyStats() {
    try {
        const { prisma } = await import('@repo/product-db');
        const { subDays } = await import('date-fns');

        const thirtyDaysAgo = subDays(new Date(), 30);

        const stats = await prisma.dailyStat.findMany({
            where: {
                date: { gte: thirtyDaysAgo },
            },
            orderBy: { date: 'asc' },
            select: {
                date: true,
                totalBookings: true,
                totalCancels: true,
                totalRevenue: true,
            },
        });

        return stats.map((stat) => ({
            date: stat.date.toISOString(),
            bookings: stat.totalBookings,
            cancels: stat.totalCancels,
            revenue: Number(stat.totalRevenue),
        }));
    } catch (error) {
        console.warn('[getDailyStats] DB unavailable, returning empty:', error);
        return [];
    }
}
