'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ForecastAreaChartProps {
    dailyMetrics: { date: string; revenue: number; bookings: number }[];
    predictions?: { date: string; revenue_forecast: number; bookings_forecast: number }[];
}

function formatCurrency(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toString();
}

export function ForecastAreaChart({ dailyMetrics, predictions }: ForecastAreaChartProps) {
    const actualData = (dailyMetrics || []).map((d) => ({
        date: d.date.slice(5),
        revenue: d.revenue,
        bookings: d.bookings,
        type: 'actual' as const,
    }));

    const forecastData = (predictions || []).map((p) => ({
        date: p.date.slice(5),
        revenue: p.revenue_forecast,
        bookings: p.bookings_forecast,
        type: 'forecast' as const,
    }));

    const combinedData = [...actualData, ...forecastData];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={formatCurrency} />
                <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} VND`, 'Doanh thu']}
                    labelFormatter={(label) => `Ngày: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {/* Actual revenue area */}
                {actualData.length > 0 && (
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        name="Thực tế"
                        connectNulls
                    />
                )}
                {/* Forecast revenue area */}
                {forecastData.length > 0 && (
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        fill="#f59e0b"
                        fillOpacity={0.05}
                        name="Dự báo"
                        connectNulls
                    />
                )}
            </AreaChart>
        </ResponsiveContainer>
    );
}
