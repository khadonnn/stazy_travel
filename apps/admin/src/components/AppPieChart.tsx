'use client';

import * as React from 'react';
import { TrendingUp } from 'lucide-react';
import { Label, Pie, PieChart } from 'recharts';
import { useQuery } from '@tanstack/react-query'; // 1. Import useQuery

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { getBrowserStats } from '@/app/(dashboard)/actions/get-browser-stats';

const chartConfig = {
    visitors: {
        label: 'Visitors',
    },
    chrome: {
        label: 'Chrome',
        // SỬA: Xóa 'hsl()' bao quanh, chỉ để lại var(--chart-1)
        color: 'var(--chart-1)',
    },
    safari: {
        label: 'Safari',
        // SỬA: Xóa 'hsl()' bao quanh
        color: 'var(--chart-2)',
    },
    firefox: {
        label: 'Firefox',
        // SỬA: Xóa 'hsl()' bao quanh
        color: 'var(--chart-3)',
    },
    edge: {
        label: 'Edge',
        // SỬA: Xóa 'hsl()' bao quanh
        color: 'var(--chart-4)',
    },
    other: {
        label: 'Other',
        // SỬA: Xóa 'hsl()' bao quanh
        color: 'var(--chart-5)',
    },
} satisfies ChartConfig;

export default function AppPieChart() {
    // 3. Fetch Data
    const { data: chartData, isLoading } = useQuery({
        queryKey: ['browser-stats'], // Key dùng để reload
        queryFn: async () => await getBrowserStats(),
    });

    // 4. Tính tổng Visitors (Dùng useMemo để tối ưu)
    const totalVisitors = React.useMemo(() => {
        if (!chartData) return 0;
        return chartData.reduce((acc: number, curr: { visitors: number }) => acc + curr.visitors, 0);
    }, [chartData]);

    if (isLoading) {
        return (
            <div className="flex h-full min-h-[350px] flex-col">
                <CardHeader className="items-center pb-0">
                    <CardTitle>Browsers - Visitors</CardTitle>
                    <CardDescription>January - June 2024</CardDescription>
                </CardHeader>
                <div className="flex flex-1 items-center justify-center">
                    <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
                </div>
            </div>
        );
    }

    // Fallback nếu data lỗi hoặc rỗng
    const displayData = chartData || [];

    return (
        <div className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Browsers - Visitors</CardTitle>
                <CardDescription>Last 6 Months Interaction</CardDescription>
            </CardHeader>
            <div className="flex-1 pb-0">
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                    <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <ChartLegend content={<ChartLegendContent className="flex flex-wrap gap-2" />} />
                        <Pie data={displayData} dataKey="visitors" nameKey="browser" innerRadius={60} strokeWidth={5}>
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-3xl font-bold"
                                                >
                                                    {totalVisitors.toLocaleString()}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    Visitors
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
                <div className="mt-6 flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2 leading-none font-medium">
                        Based on total user interactions <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="text-muted-foreground leading-none">
                        Showing total visitors for the last 6 months
                    </div>
                </div>
            </div>
        </div>
    );
}
