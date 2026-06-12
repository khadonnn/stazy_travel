'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface HourlyActivityChartProps {
    data: { hour: number; bookings: number }[];
}

export function HourlyActivityChart({ data }: HourlyActivityChartProps) {
    return (
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(h: number) => `${h}h`} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [`${v} booking`, '']} />
            <Bar dataKey="bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
    );
}
