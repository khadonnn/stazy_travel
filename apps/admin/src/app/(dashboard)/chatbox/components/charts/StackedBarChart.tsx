'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StackedBarItem {
    name: string;
    [key: string]: string | number;
}

interface StackedBarKey {
    dataKey: string;
    fill: string;
    name: string;
}

interface StackedBarChartProps {
    data: StackedBarItem[];
    keys: StackedBarKey[];
}

export function StackedBarChart({ data, keys }: StackedBarChartProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {keys.map((k) => (
                    <Bar
                        key={k.dataKey}
                        dataKey={k.dataKey}
                        stackId="a"
                        fill={k.fill}
                        name={k.name}
                        radius={[0, 0, 0, 0]}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
