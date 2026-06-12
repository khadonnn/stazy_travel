'use server';

// Import Prisma & Enum (Postgres)
import { prisma, InteractionType } from '@repo/product-db';
import { startOfDay, endOfDay } from 'date-fns';

export async function getTodayMetrics() {
    try {
        const start = startOfDay(new Date());
        const end = endOfDay(new Date());

        // --- BƯỚC 1: QUERY POSTGRES (DOANH THU & BOOKING) ---
        const todayBookings = await prisma.booking.findMany({
            where: {
                createdAt: { gte: start, lte: end },
            },
            select: {
                status: true,
                totalAmount: true,
            },
        });

        let revenue = 0;
        let bookings = 0;
        let cancels = 0;

        if (todayBookings.length > 0) {
            for (const b of todayBookings) {
                const amount = Number(b.totalAmount);
                if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
                    revenue += amount;
                    bookings += 1;
                } else if (b.status === 'CANCELLED') {
                    cancels += 1;
                }
            }
        } else {
            // --- MOCK DATA (Giống pattern LatestTransactions) ---
            // Khi DB chưa có dữ liệu booking hôm nay, dùng mock để UI không trống
            revenue = 12500000;
            bookings = 4;
            cancels = 1;
        }

        // --- BƯỚC 2: QUERY POSTGRES (VIEWS) ---
        const totalViews = await prisma.interaction.count({
            where: {
                timestamp: { gte: start, lte: end },
                type: InteractionType.VIEW,
            },
        });

        // Fallback views nếu DB không có interaction hôm nay
        const views = totalViews > 0 ? totalViews : 15;

        return {
            revenue,
            bookings,
            cancels,
            views,
        };
    } catch (error) {
        console.error('❌ Lỗi getTodayMetrics:', error);
        // Fallback nếu query lỗi hoàn toàn (DB chưa chạy)
        return {
            revenue: 12500000,
            bookings: 4,
            cancels: 1,
            views: 15,
        };
    }
}
