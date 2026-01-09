'use client';

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query'; // 1. Import useQuery
import { getRevenueStats } from '@/app/(dashboard)/actions/get-revenue';

const chartConfig = {
    total: {
        label: 'Total Revenue',
        color: '#2563eb',
    },
    successful: {
        label: 'Paid Revenue',
        color: '#8479f1',
    },
} satisfies ChartConfig;

// Hàm format tiền tệ rút gọn cho trục Y (Ví dụ: 1.000.000 -> 1M, 500.000 -> 500K)
const formatCompactNumber = (number: number) => {
    return new Intl.NumberFormat('vi-VN', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(number);
};

// Hàm format tiền tệ đầy đủ cho Tooltip
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(value);
};

const AppBarChart = () => {
    // 3. Sử dụng useQuery để fetch data
    const { data, isLoading, isError } = useQuery({
        queryKey: ['revenue-stats'], // Key này sẽ được dùng để reload
        queryFn: async () => await getRevenueStats(),
    });

    if (isLoading) {
        return (
            <div className="text-muted-foreground flex h-[200px] w-full items-center justify-center">
                <div className="border-primary mr-2 h-6 w-6 animate-spin rounded-full border-b-2"></div>
                Loading revenue...
            </div>
        );
    }

    if (isError || !data) {
        return <div className="flex h-[200px] items-center justify-center text-red-500">Failed to load data</div>;
    }

    return (
        <div>
            <CardHeader>
                <CardTitle>Total Revenue</CardTitle>
                <CardDescription>Showing total Revenue for the last 6 months</CardDescription>
            </CardHeader>
            <ChartContainer config={chartConfig} className="mt-6 min-h-[200px] w-full">
                <BarChart accessibilityLayer data={data}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 3)}
                    />
                    {/* Thêm trục Y để dễ nhìn scale tiền */}
                    <YAxis tickLine={false} tickMargin={10} axisLine={false} tickFormatter={formatCompactNumber} />

                    {/* Custom Tooltip để hiển thị số tiền đẹp hơn */}
                    <ChartTooltip
                        content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                    />

                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                    <Bar dataKey="successful" fill="var(--color-successful)" radius={4} />
                </BarChart>
            </ChartContainer>
        </div>
    );
};
export default AppBarChart;
