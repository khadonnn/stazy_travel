import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { step: 'View', users: 10000 },
    { step: 'Click Detail', users: 6500 },
    { step: 'Add to Wishlist', users: 2000 },
    { step: 'Booking Attempt', users: 1500 },
    { step: 'Booking Confirmed', users: 1200 },
];

const FunnelChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis type="number" stroke="#A1A1AA" />
            <YAxis type="category" dataKey="step" stroke="#A1A1AA" />
            <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                formatter={(value: number) => [value.toLocaleString(), 'Số lượng người dùng']}
            />
            {/* Bar hiển thị số lượng người dùng qua từng bước */}
            <Bar dataKey="users" fill="#FBBF24" name="Người dùng" />
        </BarChart>
    </ResponsiveContainer>
);

export default FunnelChart;
