'use server';

import { prisma } from '@repo/product-db'; // Đảm bảo import đúng đường dẫn

export async function getLatestSystemMetric() {
    try {
        // Lấy bản ghi metric mới nhất (dựa vào createdAt giảm dần)
        const latestMetric = await prisma.systemMetric.findFirst({
            orderBy: {
                createdAt: 'desc',
            },
        });

        return latestMetric;
    } catch (error) {
        console.error('❌ Lỗi lấy System Metric:', error);
        return null;
    }
}
