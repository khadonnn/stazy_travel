import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
    { name: 'Jan', Views: 4500, Bookings: 1200, Cancellations: 300 },
    { name: 'Feb', Views: 3800, Bookings: 1800, Cancellations: 250 },
    { name: 'Mar', Views: 5500, Bookings: 2500, Cancellations: 400 },
    { name: 'Apr', Views: 4200, Bookings: 1500, Cancellations: 350 },
    { name: 'May', Views: 6000, Bookings: 3000, Cancellations: 500 },
    { name: 'Jun', Views: 5200, Bookings: 2200, Cancellations: 380 },
];

const AppAreaChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#A1A1AA" />
            <YAxis stroke="#A1A1AA" />
            <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                labelStyle={{ color: '#FAFAFA' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            {/* Views (Xanh lá - Nền) */}
            <Area
                type="monotone"
                dataKey="Views"
                stackId="1"
                stroke="#22C55E"
                fillOpacity={0.8}
                fill="#22C55E"
                name="Lượt Xem"
            />

            {/* Bookings (Xanh dương - Tương tác tích cực) */}
            <Area
                type="monotone"
                dataKey="Bookings"
                stackId="1"
                stroke="#3B82F6"
                fillOpacity={0.8}
                fill="#3B82F6"
                name="Lượt Đặt"
            />

            {/* Cancellations (Vàng - Hành vi tiêu cực) */}
            <Area
                type="monotone"
                dataKey="Cancellations"
                stackId="1"
                stroke="#FBBF24"
                fillOpacity={0.8}
                fill="#FBBF24"
                name="Lượt Hủy"
            />
        </AreaChart>
    </ResponsiveContainer>
);

export default AppAreaChart;
