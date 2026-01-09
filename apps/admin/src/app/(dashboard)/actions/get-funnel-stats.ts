'use server';
import { prisma } from '@repo/product-db';

export async function getFunnelStats() {
    // 1. Group by Type và đếm số lượng
    const rawStats = await prisma.interaction.groupBy({
        by: ['type'],
        _count: {
            _all: true,
        },
    });

    // 2. Định nghĩa thứ tự phễu (Logic chuyển đổi)
    // VIEW -> LIKE -> CLICK_BOOK_NOW -> BOOK
    const funnelMap = new Map<string, number>();

    // Chuyển array từ DB vào Map để dễ tra cứu
    rawStats.forEach((item) => {
        funnelMap.set(item.type, item._count._all);
    });

    // 3. Chuẩn hóa dữ liệu trả về theo đúng thứ tự
    // Lưu ý: Màu sắc (fill) có thể chỉnh ở Frontend hoặc hardcode ở đây
    const funnelData = [
        {
            name: 'Impressions (View)',
            value: funnelMap.get('VIEW') || 0,
            fill: '#3b82f6', // Blue 500
        },
        {
            name: 'Interest (Like)',
            value: funnelMap.get('LIKE') || 0,
            fill: '#8b5cf6', // Violet 500
        },
        {
            name: 'Intent (Click Book)',
            value: funnelMap.get('CLICK_BOOK_NOW') || 0,
            fill: '#f59e0b', // Amber 500
        },
        {
            name: 'Conversion (Booked)',
            value: funnelMap.get('BOOK') || 0,
            fill: '#22c55e', // Green 500
        },
    ];

    return funnelData;
}
