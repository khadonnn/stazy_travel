'use server';

import { prisma } from '@repo/product-db';

export async function getBrowserStats() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 6); // Lấy 6 tháng gần nhất

    // 1. Lấy TỔNG số lượng interaction (Dữ liệu thật)
    const totalInteractions = await prisma.interaction.count({
        where: {
            timestamp: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    // 2. Chia tỷ lệ giả lập (Vì DB chưa có cột 'browser')
    // Nếu sau này bạn thêm cột 'browser' vào bảng Interaction, hãy dùng groupBy
    const stats = [
        { browser: 'chrome', visitors: Math.floor(totalInteractions * 0.45), fill: 'var(--color-chrome)' },
        { browser: 'safari', visitors: Math.floor(totalInteractions * 0.25), fill: 'var(--color-safari)' },
        { browser: 'firefox', visitors: Math.floor(totalInteractions * 0.15), fill: 'var(--color-firefox)' },
        { browser: 'edge', visitors: Math.floor(totalInteractions * 0.1), fill: 'var(--color-edge)' },
        { browser: 'other', visitors: Math.floor(totalInteractions * 0.05), fill: 'var(--color-other)' },
    ];

    return stats;
}
