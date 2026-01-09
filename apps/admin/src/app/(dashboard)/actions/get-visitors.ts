'use server';

import { prisma } from '@repo/product-db'; // Đảm bảo đường dẫn import prisma đúng với dự án của bạn

export async function getVisitorStats() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 5); // Lấy 6 tháng gần nhất

    // 1. Lấy dữ liệu Interaction từ DB
    const interactions = await prisma.interaction.findMany({
        where: {
            timestamp: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            timestamp: true,
            // Nếu sau này bạn thêm field 'device' vào schema, hãy select thêm ở đây
            // device: true,
        },
        orderBy: {
            timestamp: 'asc',
        },
    });

    // 2. Xử lý dữ liệu (Group by Month)
    const monthlyData = new Map<string, { desktop: number; mobile: number }>();

    // Khởi tạo 6 tháng với giá trị 0 để tránh biểu đồ bị đứt đoạn
    for (let i = 2; i < 7; i++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + i);
        const monthName = d.toLocaleString('en-US', { month: 'long' }); // "January", "February"...
        monthlyData.set(monthName, { desktop: 0, mobile: 0 });
    }

    // Cộng dồn dữ liệu thật từ DB
    interactions.forEach((item: any) => {
        const monthName = item.timestamp.toLocaleString('en-US', { month: 'long' });

        if (monthlyData.has(monthName)) {
            const current = monthlyData.get(monthName)!;

            // --- LOGIC PHÂN LOẠI DEVICE ---
            // Vì schema hiện tại chưa có field 'device', ta sẽ tạm giả lập:
            // Random hoặc dựa vào logic nào đó. Ví dụ: cứ 3 lượt thì 2 lượt Mobile.
            // Khi bạn update schema, thay dòng này bằng: if (item.device === 'mobile') ...
            const isMobile = Math.random() > 0.4;

            monthlyData.set(monthName, {
                desktop: current.desktop + (isMobile ? 0 : 1),
                mobile: current.mobile + (isMobile ? 1 : 0),
            });
        }
    });

    // 3. Chuyển Map thành Array đúng định dạng Recharts yêu cầu
    const chartData = Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        desktop: data.desktop,
        mobile: data.mobile,
    }));

    return chartData;
}
