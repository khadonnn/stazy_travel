'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HorizontalBarItem {
    name: string;
    value: number;
    color?: string;
}

interface HorizontalBarChartProps {
    data: HorizontalBarItem[];
    title?: string;
    valueLabel?: string;
    color?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

export function HorizontalBarChart({ data, valueLabel = 'Giá trị', color }: HorizontalBarChartProps) {
    // Sort descending by value for ranking display
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    return (
        <ResponsiveContainer width="100%" height={Math.max(120, sortedData.length * 32)}>
            <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={70}
                    tickFormatter={(val: string) => (val.length > 15 ? `${val.slice(0, 15)}...` : val)}
                />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString()}`, valueLabel]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {sortedData.map((entry, index) => (
                        <Cell
                            key={index}
                            fill={entry.color || color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
