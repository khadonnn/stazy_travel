'use server';
import { prisma, InteractionType } from '@repo/product-db';

export interface InteractionTypeStat {
    action: string;
    count: number;
}

export async function getInteractionTypeStats(): Promise<InteractionTypeStat[]> {
    try {
        const rawStats = await prisma.interaction.groupBy({
            by: ['type'],
            _count: { _all: true },
        });

        const labelMap: Record<string, string> = {
            VIEW: 'Xem',
            CLICK_BOOK_NOW: 'Click Đặt',
            LIKE: 'Thích',
            BOOK: 'Đặt phòng',
            SEARCH_QUERY: 'Tìm kiếm',
            SHARE: 'Chia sẻ',
            ADD_TO_WISHLIST: 'Wishlist',
            CANCEL: 'Hủy',
            FILTER_APPLIED: 'Lọc',
            RATING: 'Đánh giá',
        };

        return rawStats
            .map((item) => ({
                action: labelMap[item.type] || item.type,
                count: item._count._all,
            }))
            .sort((a, b) => b.count - a.count);
    } catch (error) {
        console.error('❌ Lỗi lấy thống kê loại interaction:', error);
        return [];
    }
}
