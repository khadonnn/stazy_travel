'use server';
import { prisma } from '@repo/product-db';

export interface EvaluationPoint {
    k: number;
    RMSE: number;
    Precision: number;
    Recall: number;
}

export async function getEvaluationHistory(): Promise<EvaluationPoint[]> {
    try {
        const metrics = await prisma.systemMetric.findMany({
            where: {
                trainingHistory: { not: undefined },
            },
            orderBy: { createdAt: 'desc' },
            take: 1, // Lấy bản ghi mới nhất
            select: { trainingHistory: true },
        });

        if (metrics.length > 0 && metrics[0]?.trainingHistory) {
            // trainingHistory dạng: [ { "k": 10, "rmse": 0.85 }, ... ]
            // Hoặc [{ "k": 10, "rmse": 0.85, "precision": 0.7, "recall": 0.5 }]
            const history = metrics[0].trainingHistory as unknown as any[];
            if (Array.isArray(history) && history.length > 0) {
                return history.map((h: any) => ({
                    k: h.k ?? h.param ?? 0,
                    RMSE: h.rmse ?? h.RMSE ?? 0,
                    Precision: h.precision ?? h.Precision ?? 0,
                    Recall: h.recall ?? h.Recall ?? 0,
                }));
            }
        }

        // Fallback: dùng tuningParams
        const tuningMetrics = await prisma.systemMetric.findMany({
            where: {
                tuningParams: { not: undefined },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { tuningParams: true, rmse: true, precisionAt5: true, recallAt5: true },
        });

        if (tuningMetrics.length > 0 && tuningMetrics[0]?.tuningParams) {
            const params = tuningMetrics[0].tuningParams as unknown as any[];
            const firstMetric = tuningMetrics[0];
            if (Array.isArray(params) && params.length > 0) {
                return params.map((p: any) => ({
                    k: p.param ?? p.k ?? 0,
                    RMSE: p.metric ?? p.rmse ?? 0,
                    Precision: p.precision ?? firstMetric.precisionAt5 ?? 0,
                    Recall: p.recall ?? firstMetric.recallAt5 ?? 0,
                }));
            }
        }

        return [];
    } catch (error) {
        console.error('❌ Lỗi lấy lịch sử đánh giá:', error);
        return [];
    }
}
