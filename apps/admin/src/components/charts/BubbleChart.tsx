import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

const mockBubbleData = [
    // { bookings: X, rating: Y, amenities: Z (size) }
    { name: 'Rex Saigon', x: 120, y: 4.8, z: 25 },
    { name: 'InterCon Hanoi', x: 95, y: 4.6, z: 40 },
    { name: 'A La Carte DN', x: 88, y: 4.5, z: 18 },
    { name: 'The Myst DK', x: 75, y: 4.9, z: 30 },
    { name: 'Fusion PQ', x: 60, y: 4.7, z: 50 },
];

const BubbleChart = () => (
    <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis type="number" dataKey="x" name="Số lượng Bookings" unit="" stroke="#A1A1AA" />
            <YAxis type="number" dataKey="y" name="Rating Trung bình" domain={[4.0, 5.0]} unit="" stroke="#A1A1AA" />

            {/* ZAxis định nghĩa kích thước của bubble (số tiện nghi) */}
            <ZAxis type="number" dataKey="z" range={[50, 500]} name="Số tiện nghi" unit="" />

            <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', color: '#FAFAFA' }}
                // Custom formatter hiển thị cả 3 giá trị
                formatter={(value: number, name: string, item: any) => {
                    if (name === 'z') return [`Tiện nghi: ${value}`, name];
                    if (name === 'y') return [`Rating: ${value}`, name];
                    if (name === 'x') return [`Bookings: ${value}`, name];
                    return [value, name];
                }}
            />
            <Scatter name="Phân tích Khách sạn" data={mockBubbleData} fill="#8884d8" />
        </ScatterChart>
    </ResponsiveContainer>
);

export default BubbleChart;
