'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
    { name: 'Views', Registered: 5500, Guest: 3500 },
    { name: 'Searches', Registered: 4200, Guest: 2800 },
    { name: 'Bookings', Registered: 1500, Guest: 300 },
    { name: 'Cancelled', Registered: 350, Guest: 50 },
];

const UserGroupComparisonChart = () => (
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

            <Bar dataKey="Registered" fill="#3B82F6" name="Người dùng Đăng ký" />
            <Bar dataKey="Guest" fill="#FBBF24" name="Khách Vãng lai (Guest)" />
        </BarChart>
    </ResponsiveContainer>
);

export default UserGroupComparisonChart;
