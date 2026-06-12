'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DonutItem {
    name: string;
    value: number;
    color?: string;
}

interface DonutChartProps {
    data: DonutItem[];
    title?: string;
    innerRadius?: number;
    outerRadius?: number;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DonutChart({ data, innerRadius = 55, outerRadius = 80 }: DonutChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0)
        return (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                Không có dữ liệu
            </div>
        );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={2}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value: number, name: string) => [
                        `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
                        name,
                    ]}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => value} />
            </PieChart>
        </ResponsiveContainer>
    );
}
