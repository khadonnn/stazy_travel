'use server';

import { prisma } from '@repo/product-db'; // Gọi trực tiếp DB (nhanh hơn)
import { subDays } from 'date-fns';

export async function getDailyStats() {
    try {
        // 1. Lấy dữ liệu 30 ngày gần nhất
        const thirtyDaysAgo = subDays(new Date(), 30);

        const stats = await prisma.dailyStat.findMany({
            where: {
                date: {
                    gte: thirtyDaysAgo,
                },
            },
            orderBy: {
                date: 'asc', // Sắp xếp ngày cũ -> mới để vẽ biểu đồ
            },
            // Chỉ lấy các cột cần thiết
            select: {
                date: true,
                totalBookings: true,
                totalCancels: true,
                totalRevenue: true,
            },
        });

        // 2. Map dữ liệu sang format JSON thuần để trả về cho Client Component
        const chartData = stats.map((stat) => ({
            // Chuyển Date object sang string ISO (Next.js server action không thích trả về Date object nguyên thủy)
            date: stat.date.toISOString(),
            bookings: stat.totalBookings,
            cancels: stat.totalCancels,
            revenue: Number(stat.totalRevenue), // Decimal -> Number
        }));

        return chartData;
    } catch (error) {
        console.error('❌ Lỗi lấy Daily Stats:', error);
        return [];
    }
}
