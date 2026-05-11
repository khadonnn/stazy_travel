'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataItem {
    action: string;
    count: number;
}

interface AppBarChartProps {
    data?: DataItem[];
}

const AppBarChart = ({ data = [] }: AppBarChartProps) => {
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-gray-500">Không có dữ liệu</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" stroke="#A1A1AA" />
                <YAxis type="category" dataKey="action" stroke="#A1A1AA" width={80} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                    labelStyle={{ color: '#FAFAFA' }}
                    formatter={(value: number) => [value.toLocaleString(), 'Số lượng']}
                />
                <Bar dataKey="count" fill="#3B82F6" name="Số lượng Hành động" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default AppBarChart;
