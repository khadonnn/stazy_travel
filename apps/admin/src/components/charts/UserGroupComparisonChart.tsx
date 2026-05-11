'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataItem {
    name: string;
    Registered: number;
    Guest: number;
}

interface UserGroupComparisonChartProps {
    data?: DataItem[];
}

const UserGroupComparisonChart = ({ data = [] }: UserGroupComparisonChartProps) => {
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-gray-500">Không có dữ liệu</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#A1A1AA" />
                <YAxis stroke="#A1A1AA" />
                <Tooltip
                    contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                    formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />

                <Bar dataKey="Registered" fill="#3B82F6" name="Đã từng Đặt phòng" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Guest" fill="#FBBF24" name="Chưa từng Đặt" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default UserGroupComparisonChart;
