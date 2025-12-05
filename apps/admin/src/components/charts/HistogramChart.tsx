import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Phân phối tần suất hành vi (Số lượng người dùng có N lượt xem)
const data = [
    { range: '1-5 views', users: 8500 },
    { range: '6-10 views', users: 3200 },
    { range: '11-20 views', users: 1500 },
    { range: '21-50 views', users: 500 },
    { range: '> 50 views', users: 150 },
];

const HistogramChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="range" stroke="#A1A1AA" name="Lượt xem" />
            <YAxis stroke="#A1A1AA" name="Số lượng người dùng" />
            <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                formatter={(value: number) => [value.toLocaleString(), 'Số lượng người dùng']}
            />
            <Bar dataKey="users" fill="#3B82F6" name="Người dùng" />
        </BarChart>
    </ResponsiveContainer>
);

export default HistogramChart;
