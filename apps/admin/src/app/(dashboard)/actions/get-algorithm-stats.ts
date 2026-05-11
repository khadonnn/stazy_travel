'use server';
import { prisma } from '@repo/product-db';

export interface AlgorithmStat {
    name: string;
    RMSE: number;
    Precision: number;
    Recall: number;
}

export async function getAlgorithmStats(): Promise<AlgorithmStat[]> {
    try {
        // Lấy tất cả SystemMetric records, mỗi record đại diện cho 1 thuật toán
        const metrics = await prisma.systemMetric.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                algorithm: true,
                rmse: true,
                precisionAt5: true,
                recallAt5: true,
                createdAt: true,
            },
        });

        if (metrics.length === 0) return [];

        // Gom nhóm theo algorithm, lấy record mới nhất của mỗi thuật toán
        const latestByAlgo = new Map<string, (typeof metrics)[0]>();
        for (const m of metrics) {
            if (!latestByAlgo.has(m.algorithm)) {
                latestByAlgo.set(m.algorithm, m);
            }
        }

        return Array.from(latestByAlgo.values()).map((m) => ({
            name: m.algorithm,
            RMSE: m.rmse,
            Precision: m.precisionAt5,
            Recall: m.recallAt5,
        }));
    } catch (error) {
        console.error('❌ Lỗi lấy thống kê thuật toán:', error);
        return [];
    }
}
