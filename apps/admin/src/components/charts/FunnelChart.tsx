'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DataItem {
    name: string;
    value: number;
    fill?: string;
}

interface FunnelChartProps {
    data?: DataItem[];
}

const defaultColors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#22C55E', '#EF4444'];

const FunnelChart = ({ data = [] }: FunnelChartProps) => {
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-gray-500">Không có dữ liệu</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" stroke="#A1A1AA" />
                <YAxis type="category" dataKey="name" stroke="#A1A1AA" width={140} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                    formatter={(value: number) => [value.toLocaleString(), 'Số lượng']}
                />
                <Bar dataKey="value" name="Số lượng" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || defaultColors[index % defaultColors.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default FunnelChart;
