'use server';
import { prisma } from '@repo/product-db';

export interface RatingDistItem {
    name: string;
    value: number;
}

export async function getRatingDistribution(): Promise<RatingDistItem[]> {
    try {
        // Lấy phân phối rating từ bảng Review
        const reviews = await prisma.review.findMany({
            select: { rating: true },
        });

        const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
            if (r.rating >= 1 && r.rating <= 5) {
                dist[r.rating] = (dist[r.rating] || 0) + 1;
            }
        });

        return [
            { name: '5 Sao', value: dist[5] ?? 0 },
            { name: '4 Sao', value: dist[4] ?? 0 },
            { name: '3 Sao', value: dist[3] ?? 0 },
            { name: '2 Sao', value: dist[2] ?? 0 },
            { name: '1 Sao', value: dist[1] ?? 0 },
        ];
    } catch (error) {
        console.error('❌ Lỗi lấy phân phối rating:', error);
        return [
            { name: '5 Sao', value: 0 },
            { name: '4 Sao', value: 0 },
            { name: '3 Sao', value: 0 },
            { name: '2 Sao', value: 0 },
            { name: '1 Sao', value: 0 },
        ];
    }
}
