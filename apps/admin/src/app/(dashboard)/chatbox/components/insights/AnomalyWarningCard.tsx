import { AlertTriangle } from 'lucide-react';
import { AnomalyData, InsightsData } from '../../types/chat';

interface AnomalyWarningCardProps {
    anomalies: AnomalyData[];
    insights?: InsightsData;
}

export function AnomalyWarningCard({ anomalies, insights }: AnomalyWarningCardProps) {
    if (!anomalies || anomalies.length === 0) return null;

    return (
        <div className="animate-pulse rounded-lg border-2 border-red-300 bg-red-50 p-2.5 dark:border-red-800 dark:bg-red-950/40">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Cảnh báo: {anomalies.length} ngày bất thường
            </div>
            <div className="space-y-1">
                {anomalies.slice(0, 3).map((a, i) => (
                    <div key={i} className="text-[11px] text-red-600 dark:text-red-300">
                        📅 {a.date?.slice(5)}: {a.reasons.join('; ')}
                    </div>
                ))}
            </div>
            {insights && (
                <div className="mt-2 rounded border border-red-200 bg-white/50 p-1.5 dark:border-red-800 dark:bg-black/20">
                    <div className="text-[10px] font-medium text-red-700 dark:text-red-400">
                        💡 Nguyên nhân: {insights.root_cause}
                    </div>
                    <div className="text-[10px] text-red-600 dark:text-red-300">→ {insights.actionable_suggestion}</div>
                </div>
            )}
        </div>
    );
}
