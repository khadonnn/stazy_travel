'use server';

import { PaymentStatus, prisma } from '@repo/product-db';

export async function getRevenueStats() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 5); // Lấy 6 tháng gần nhất

    // 1. Lấy dữ liệu Booking
    const bookings = await prisma.booking.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
            // Có thể lọc bỏ booking bị hủy nếu muốn
            // status: { not: 'CANCELLED' }
        },
        select: {
            createdAt: true,
            totalAmount: true,
            paymentStatus: true,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });

    // 2. Chuẩn bị khung dữ liệu cho 6 tháng (để tháng nào không có khách vẫn hiện cột 0)
    const monthlyData = new Map<string, { total: number; successful: number }>();

    for (let i = 0; i < 6; i++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + i);
        const monthName = d.toLocaleString('en-US', { month: 'long' }); // "January", "February"
        monthlyData.set(monthName, { total: 0, successful: 0 });
    }

    // 3. Cộng dồn doanh thu
    bookings.forEach((booking: any) => {
        const monthName = booking.createdAt.toLocaleString('en-US', { month: 'long' });

        if (monthlyData.has(monthName)) {
            const current = monthlyData.get(monthName)!;

            // Tổng doanh thu (tất cả booking)
            const amount = Number(booking.totalAmount) || 0; // Đảm bảo là số

            // Doanh thu thực nhận (Chỉ tính đã thanh toán thành công)
            const isSuccessful = booking.paymentStatus === PaymentStatus.SUCCEEDED;

            monthlyData.set(monthName, {
                total: current.total + amount,
                successful: current.successful + (isSuccessful ? amount : 0),
            });
        }
    });

    // 4. Chuyển đổi về mảng
    return Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        total: data.total,
        successful: data.successful,
    }));
}
