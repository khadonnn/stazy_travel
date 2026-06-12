interface RecommendationCardProps {
    plan: string[];
}

export function RecommendationCard({ plan }: RecommendationCardProps) {
    if (!plan || plan.length === 0) return null;

    return (
        <div className="rounded-lg border bg-blue-50 p-3 dark:bg-blue-950/30">
            <div className="mb-1 text-xs font-medium text-blue-600 dark:text-blue-400">💡 Khuyến nghị</div>
            <ul className="space-y-1">
                {plan.map((item, i) => (
                    <li key={i} className="text-xs text-blue-700 dark:text-blue-300">
                        {i + 1}. {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
