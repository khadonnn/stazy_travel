'use client';

import { GrowthRateData, AnomalyData, InsightsData } from '../../types/chat';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target } from 'lucide-react';

interface InsightCardProps {
    growth_rate?: GrowthRateData;
    anomalies?: AnomalyData[];
    insights?: InsightsData;
    plan?: string[];
}

export function InsightCard({ growth_rate, anomalies, insights, plan }: InsightCardProps) {
    const hasGrowth = growth_rate && (growth_rate.revenue.growth_pct !== 0 || growth_rate.bookings.growth_pct !== 0);
    const hasAnomalies = anomalies && anomalies.length > 0;
    const hasInsights = insights && (insights.root_cause || insights.actionable_suggestion);
    const hasPlan = plan && plan.length > 0;

    if (!hasGrowth && !hasAnomalies && !hasInsights && !hasPlan) return null;

    return (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <div className="mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Phân tích & Khuyến nghị</span>
            </div>

            <div className="space-y-2">
                {/* Revenue Growth */}
                {hasGrowth && (
                    <div className="flex items-start gap-2">
                        {growth_rate!.revenue.growth_pct >= 0 ? (
                            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                        ) : (
                            <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                        )}
                        <div className="text-xs">
                            <span className="font-medium">Doanh thu:</span>{' '}
                            <span className={growth_rate!.revenue.growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {growth_rate!.revenue.growth_pct >= 0 ? '+' : ''}
                                {growth_rate!.revenue.growth_pct}%
                            </span>
                            {' · '}
                            <span className="font-medium">Booking:</span>{' '}
                            <span className={growth_rate!.bookings.growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {growth_rate!.bookings.growth_pct >= 0 ? '+' : ''}
                                {growth_rate!.bookings.growth_pct}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Anomaly Warning */}
                {hasAnomalies && (
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <div className="text-xs">
                            <span className="font-medium text-amber-700 dark:text-amber-400">
                                ⚠️ {anomalies!.length} bất thường
                            </span>
                            <ul className="text-muted-foreground mt-0.5 list-inside list-disc">
                                {anomalies!.slice(0, 2).map((a, i) => (
                                    <li key={i} className="truncate">
                                        {a.reasons[0]}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Insight from AI */}
                {hasInsights && (
                    <div className="flex items-start gap-2">
                        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-600" />
                        <div className="text-xs">
                            <span className="font-medium text-purple-700 dark:text-purple-400">Nguyên nhân:</span>
                            <p className="text-muted-foreground">{insights!.root_cause}</p>
                            {insights!.actionable_suggestion && (
                                <>
                                    <span className="mt-0.5 block font-medium text-purple-700 dark:text-purple-400">
                                        Đề xuất:
                                    </span>
                                    <p className="text-muted-foreground">{insights!.actionable_suggestion}</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                {hasPlan && (
                    <div className="flex items-start gap-2">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <div className="text-xs">
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">Khuyến nghị:</span>
                            <ul className="text-muted-foreground mt-0.5 list-inside list-disc">
                                {plan!.slice(0, 2).map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
