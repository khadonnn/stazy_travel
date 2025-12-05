import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockTopData = [
    { name: 'Rex Saigon', bookings: 120 },
    { name: 'InterCon Hanoi', bookings: 95 },
    { name: 'A La Carte DN', bookings: 88 },
    { name: 'The Myst DK', bookings: 75 },
    { name: 'Fusion PQ', bookings: 60 },
];

interface TopNBarChartProps {
    data: typeof mockTopData;
    dataKey: string;
    fillColor: string;
}

const TopNBarChart = ({ data = mockTopData, dataKey = 'bookings', fillColor = '#3B82F6' }: TopNBarChartProps) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart
            data={data}
            layout="vertical" // Dạng ngang để dễ đọc tên Khách sạn
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }} // Tăng margin left cho tên
        >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis type="number" stroke="#A1A1AA" />
            <YAxis
                type="category"
                dataKey="name"
                stroke="#A1A1AA"
                tickLine={false}
                axisLine={false}
                width={100} // Đảm bảo tên khách sạn không bị cắt
            />
            <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                formatter={(value: number) => [value.toLocaleString(), 'Số lượng']}
            />
            <Bar dataKey={dataKey} fill={fillColor} radius={[4, 4, 0, 0]} />
        </BarChart>
    </ResponsiveContainer>
);

export default TopNBarChart;
