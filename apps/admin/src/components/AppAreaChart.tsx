'use client';

import { TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// 1. Import useQuery
import { useQuery } from '@tanstack/react-query';
import { getVisitorStats } from '@/app/(dashboard)/actions/get-visitors';

const chartConfig = {
    desktop: {
        label: 'Desktop',
        color: 'var(--chart-2)',
    },
    mobile: {
        label: 'Mobile',
        color: 'var(--chart-3)',
    },
} satisfies ChartConfig;

export function AppAreaChart() {
    // 2. Thay thế useState/useEffect bằng useQuery
    // Key ['visitor-stats'] này sẽ được "invalidate" khi bạn bấm nút Reload
    const { data, isLoading, isError } = useQuery({
        queryKey: ['visitor-stats'],
        queryFn: async () => await getVisitorStats(),
        staleTime: 1000 * 60 * 5, // Cache dữ liệu trong 5 phút (nếu không bấm reload)
    });

    // Hàm tính tăng trưởng (đã sửa lỗi undefined)
    const calculateGrowth = () => {
        if (!data || data.length < 2) return 0;

        const currentItem = data.at(-1);
        const prevItem = data.at(-2);

        if (!currentItem || !prevItem) return 0;

        const lastMonth = currentItem.desktop + currentItem.mobile;
        const prevMonth = prevItem.desktop + prevItem.mobile;

        if (prevMonth === 0) return 0;
        return (((lastMonth - prevMonth) / prevMonth) * 100).toFixed(1);
    };

    // 3. Xử lý loading
    if (isLoading) {
        return (
            <div className="text-muted-foreground flex h-[200px] w-full flex-col items-center justify-center gap-2">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
                <p className="text-sm">Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (isError || !data) {
        return <div className="p-4 text-red-500">Lỗi tải dữ liệu biểu đồ.</div>;
    }

    return (
        <div>
            <CardHeader>
                <CardTitle>Visitors Interaction</CardTitle>
                <CardDescription>Showing total interactions for the last 6 months</CardDescription>
            </CardHeader>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                <AreaChart
                    accessibilityLayer
                    data={data} // Dữ liệu từ React Query
                    margin={{
                        left: 12,
                        right: 12,
                    }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <defs>
                        <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <Area
                        dataKey="mobile"
                        type="natural"
                        fill="url(#fillMobile)"
                        fillOpacity={0.4}
                        stroke="var(--color-mobile)"
                        stackId="a"
                    />
                    <Area
                        dataKey="desktop"
                        type="natural"
                        fill="url(#fillDesktop)"
                        fillOpacity={0.4}
                        stroke="var(--color-desktop)"
                        stackId="a"
                    />
                </AreaChart>
            </ChartContainer>
            <div className="mt-6 flex w-full items-start gap-2 text-sm">
                <div className="grid gap-2">
                    <div className="flex items-center gap-2 leading-none font-medium">
                        Trending {Number(calculateGrowth()) > 0 ? 'up' : 'down'} by{' '}
                        {Math.abs(Number(calculateGrowth()))}% this month <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 leading-none">
                        {data.length > 0 ? `${data.at(0)?.month} - ${data.at(-1)?.month}` : 'Loading...'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AppAreaChart;
