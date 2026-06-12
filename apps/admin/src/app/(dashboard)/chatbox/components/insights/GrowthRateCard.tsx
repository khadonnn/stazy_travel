import { GrowthRateData } from '../../types/chat';
import { formatCurrency } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface GrowthRateCardProps {
    data: GrowthRateData;
}

export function GrowthRateCard({ data }: GrowthRateCardProps) {
    return (
        <div className="flex gap-2">
            <div className="flex-1 rounded-lg border bg-white/50 p-2.5 dark:bg-gray-900/50">
                <div className="text-muted-foreground text-[10px]">Doanh thu vs kỳ trước</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-sm font-bold">{formatCurrency(data.revenue.current)}</span>
                    {data.revenue.growth_pct >= 0 ? (
                        <span className="flex items-center text-[10px] font-medium text-green-600">
                            <ArrowUpRight className="h-3 w-3" />+{data.revenue.growth_pct}%
                        </span>
                    ) : (
                        <span className="flex items-center text-[10px] font-medium text-red-600">
                            <ArrowDownRight className="h-3 w-3" />
                            {data.revenue.growth_pct}%
                        </span>
                    )}
                </div>
            </div>
            <div className="flex-1 rounded-lg border bg-white/50 p-2.5 dark:bg-gray-900/50">
                <div className="text-muted-foreground text-[10px]">Booking vs kỳ trước</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-sm font-bold">{data.bookings.current}</span>
                    {data.bookings.growth_pct >= 0 ? (
                        <span className="flex items-center text-[10px] font-medium text-green-600">
                            <ArrowUpRight className="h-3 w-3" />+{data.bookings.growth_pct}%
                        </span>
                    ) : (
                        <span className="flex items-center text-[10px] font-medium text-red-600">
                            <ArrowDownRight className="h-3 w-3" />
                            {data.bookings.growth_pct}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
