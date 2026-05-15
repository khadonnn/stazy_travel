'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';

const defaultChartData = [
    { month: 'January', bookings: 0, hotels: 0 },
    { month: 'February', bookings: 0, hotels: 0 },
    { month: 'March', bookings: 0, hotels: 0 },
    { month: 'April', bookings: 0, hotels: 0 },
    { month: 'May', bookings: 0, hotels: 0 },
    { month: 'June', bookings: 0, hotels: 0 },
];

const chartConfig = {
    bookings: {
        label: 'Bookings',
        color: 'var(--chart-1)',
    },
    hotels: {
        label: 'Hotels',
        color: 'var(--chart-2)',
    },
} satisfies ChartConfig;

interface AppLineChartProps {
    data?: { month: string; bookings: number; hotels: number }[];
}

const AppLineChart = ({ data }: AppLineChartProps) => {
    const chartData = data && data.length > 0 ? data : defaultChartData;

    return (
        <ChartContainer config={chartConfig} className="mt-6">
            <LineChart
                accessibilityLayer
                data={chartData}
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
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Line dataKey="bookings" type="monotone" stroke="var(--color-bookings)" strokeWidth={2} dot={false} />
                <Line dataKey="hotels" type="monotone" stroke="var(--color-hotels)" strokeWidth={2} dot={false} />
            </LineChart>
        </ChartContainer>
    );
};

export default AppLineChart;
