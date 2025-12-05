import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { action: 'Click', count: 18000 },
    { action: 'View', count: 15000 },
    { action: 'Search', count: 9000 },
    { action: 'Wishlist', count: 3500 },
    { action: 'Share', count: 1800 },
];

const AppBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis type="number" stroke="#A1A1AA" />
            <YAxis type="category" dataKey="action" stroke="#A1A1AA" />
            <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                labelStyle={{ color: '#FAFAFA' }}
                formatter={(value: number) => [value.toLocaleString(), 'Số lượng']}
            />
            {/* Bar hiển thị số lượng */}
            <Bar dataKey="count" fill="#3B82F6" name="Số lượng Hành động" radius={[4, 4, 0, 0]} />
        </BarChart>
    </ResponsiveContainer>
);

export default AppBarChart;
