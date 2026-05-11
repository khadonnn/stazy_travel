'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataItem {
    bin: string;
    count: number;
}

interface HistogramChartProps {
    data?: DataItem[];
}

const HistogramChart = ({ data = [] }: HistogramChartProps) => {
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-gray-500">Không có dữ liệu</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="bin" stroke="#A1A1AA" name="Nhóm" />
                <YAxis stroke="#A1A1AA" name="Số lượng người dùng" />
                <Tooltip
                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                    formatter={(value: number) => [value.toLocaleString(), 'Số lượng người dùng']}
                />
                <Bar dataKey="count" fill="#3B82F6" name="Người dùng" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default HistogramChart;
