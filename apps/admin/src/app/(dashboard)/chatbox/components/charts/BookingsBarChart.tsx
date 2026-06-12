'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BookingsBarChartProps {
    dailyMetrics: { date: string; revenue: number; bookings: number }[];
    predictions?: { date: string; revenue_forecast: number; bookings_forecast: number }[];
}

export function BookingsBarChart({ dailyMetrics, predictions }: BookingsBarChartProps) {
    const combinedData = [
        ...(dailyMetrics || []).map((d) => ({
            date: d.date.slice(5),
            revenue: d.revenue,
            bookings: d.bookings,
            type: 'actual' as const,
        })),
        ...(predictions || []).map((p) => ({
            date: p.date.slice(5),
            revenue: p.revenue_forecast,
            bookings: p.bookings_forecast,
            type: 'forecast' as const,
        })),
    ];

    return (
        <BarChart data={combinedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="bookings" name="Bookings" radius={[4, 4, 0, 0]}>
                {combinedData.map((entry, index) => (
                    <Cell
                        key={index}
                        fill={entry.type === 'forecast' ? '#94a3b8' : '#3b82f6'}
                        strokeDasharray={entry.type === 'forecast' ? '4 4' : undefined}
                    />
                ))}
            </Bar>
        </BarChart>
    );
}
