'use server';
import { prisma } from '@repo/product-db';

export interface SentimentStat {
    name: string;
    value: number;
    fill: string;
}

export interface AspectSentimentStat {
    aspect: string;
    POSITIVE: number;
    NEUTRAL: number;
    NEGATIVE: number;
}

export interface SentimentStatsResult {
    overall: SentimentStat[];
    byAspect: AspectSentimentStat[];
    totalReviews: number;
    nlpProcessedCount: number;
    avgRating: number;
}

const SENTIMENT_COLORS: Record<string, string> = {
    POSITIVE: '#22c55e',
    NEUTRAL: '#eab308',
    NEGATIVE: '#ef4444',
};

export async function getSentimentStats(): Promise<SentimentStatsResult> {
    try {
        const reviews = await prisma.review.findMany({
            select: {
                sentiment: true,
                explicitSentiments: true,
                rating: true,
                nlpProcessed: true,
            },
        });

        if (reviews.length === 0) {
            return {
                overall: [
                    { name: 'POSITIVE', value: 0, fill: SENTIMENT_COLORS['POSITIVE'] ?? '#22c55e' },
                    { name: 'NEUTRAL', value: 0, fill: SENTIMENT_COLORS['NEUTRAL'] ?? '#eab308' },
                    { name: 'NEGATIVE', value: 0, fill: SENTIMENT_COLORS['NEGATIVE'] ?? '#ef4444' },
                ],
                byAspect: [],
                totalReviews: 0,
                nlpProcessedCount: 0,
                avgRating: 0,
            };
        }

        const sentimentCounts: Record<string, number> = {
            POSITIVE: 0,
            NEUTRAL: 0,
            NEGATIVE: 0,
        };

        let totalRating = 0;
        let nlpProcessedCount = 0;
        const aspectAccumulator: Record<string, Record<string, number>> = {};

        for (const review of reviews) {
            const s = (review.sentiment as string) || 'NEUTRAL';
            sentimentCounts[s] = (sentimentCounts[s] ?? 0) + 1;

            totalRating += review.rating;

            if (review.nlpProcessed) {
                nlpProcessedCount++;
            }

            if (review.explicitSentiments && typeof review.explicitSentiments === 'object') {
                const aspects = review.explicitSentiments as Record<string, string>;
                for (const [aspect, sentiment] of Object.entries(aspects)) {
                    if (!aspectAccumulator[aspect]) {
                        aspectAccumulator[aspect] = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
                    }
                    const normalizedSentiment = (sentiment || 'NEUTRAL').toUpperCase();
                    if (normalizedSentiment in aspectAccumulator[aspect]) {
                        aspectAccumulator[aspect][normalizedSentiment] =
                            (aspectAccumulator[aspect][normalizedSentiment] ?? 0) + 1;
                    }
                }
            }
        }

        const overall: SentimentStat[] = [
            {
                name: 'POSITIVE',
                value: sentimentCounts['POSITIVE'] ?? 0,
                fill: SENTIMENT_COLORS['POSITIVE'] ?? '#22c55e',
            },
            { name: 'NEUTRAL', value: sentimentCounts['NEUTRAL'] ?? 0, fill: SENTIMENT_COLORS['NEUTRAL'] ?? '#eab308' },
            {
                name: 'NEGATIVE',
                value: sentimentCounts['NEGATIVE'] ?? 0,
                fill: SENTIMENT_COLORS['NEGATIVE'] ?? '#ef4444',
            },
        ];

        const byAspect: AspectSentimentStat[] = Object.entries(aspectAccumulator)
            .map(([aspect, counts]) => ({
                aspect,
                POSITIVE: counts['POSITIVE'] ?? 0,
                NEUTRAL: counts['NEUTRAL'] ?? 0,
                NEGATIVE: counts['NEGATIVE'] ?? 0,
            }))
            .sort((a, b) => b.POSITIVE + b.NEUTRAL + b.NEGATIVE - (a.POSITIVE + a.NEUTRAL + a.NEGATIVE));

        const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

        return {
            overall,
            byAspect,
            totalReviews: reviews.length,
            nlpProcessedCount,
            avgRating: Math.round(avgRating * 100) / 100,
        };
    } catch (error) {
        console.error('❌ Lỗi lấy sentiment stats:', error);
        return {
            overall: [
                { name: 'POSITIVE', value: 0, fill: '#22c55e' },
                { name: 'NEUTRAL', value: 0, fill: '#eab308' },
                { name: 'NEGATIVE', value: 0, fill: '#ef4444' },
            ],
            byAspect: [],
            totalReviews: 0,
            nlpProcessedCount: 0,
            avgRating: 0,
        };
    }
}
