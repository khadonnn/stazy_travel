import { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KPICardProps {
    label: string;
    value: string | number;
    change?: number;
    icon?: ReactNode;
    color?: string;
}

export function KPICard({ label, value, change, icon, color }: KPICardProps) {
    return (
        <div className="flex-1 rounded-lg border bg-white/80 p-3 dark:bg-gray-900/80">
            <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-medium">{label}</span>
                {icon && <span className="text-base">{icon}</span>}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight" style={color ? { color } : undefined}>
                    {value}
                </span>
                {change !== undefined &&
                    (change > 0 ? (
                        <span className="flex items-center text-[11px] font-medium text-green-600">
                            <ArrowUpRight className="h-3.5 w-3.5" />+{change}%
                        </span>
                    ) : change < 0 ? (
                        <span className="flex items-center text-[11px] font-medium text-red-600">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            {change}%
                        </span>
                    ) : (
                        <span className="text-muted-foreground flex items-center text-[11px] font-medium">
                            <Minus className="h-3.5 w-3.5" />
                            0%
                        </span>
                    ))}
            </div>
        </div>
    );
}
