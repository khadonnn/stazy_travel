'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

interface BubbleChartProps {
    data: {
        name: string;
        x: number; // bookings
        y: number; // rating
        z: number; // amenities count
    }[];
}

const BubbleChart = ({ data }: BubbleChartProps) => {
    // Nếu không có dữ liệu, hiển thị thông báo
    if (!data || data.length === 0) {
        return (
            <div className="text-muted-foreground flex h-full items-center justify-center">
                Chưa có dữ liệu khách sạn với bookings
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" dataKey="x" name="Số lượng Bookings" unit="" stroke="#A1A1AA" />
                <YAxis
                    type="number"
                    dataKey="y"
                    name="Rating Trung bình"
                    domain={[3, 5]}
                    ticks={[3, 3.5, 4, 4.5, 5]}
                    unit=" ⭐"
                    stroke="#A1A1AA"
                />

                {/* ZAxis định nghĩa kích thước của bubble (số tiện nghi) */}
                <ZAxis type="number" dataKey="z" range={[100, 800]} name="Số tiện nghi" unit="" />

                <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#27272a', border: '1px solid #52525b', color: '#FAFAFA' }}
                    // Custom formatter hiển thị đầy đủ thông tin
                    content={({ active, payload }) => {
                        if (active && payload && payload.length && payload[0]) {
                            const data = payload[0].payload;
                            return (
                                <div className="rounded-lg border border-zinc-600 bg-zinc-800 p-3 shadow-lg">
                                    <p className="mb-2 font-semibold text-white">{data.name}</p>
                                    <div className="space-y-1 text-sm">
                                        <p className="text-zinc-300">
                                            <span className="font-medium">Bookings:</span> {data.x}
                                        </p>
                                        <p className="text-zinc-300">
                                            <span className="font-medium">Rating:</span> {data.y} ⭐
                                        </p>
                                        <p className="text-zinc-300">
                                            <span className="font-medium">Tiện nghi:</span> {data.z}
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Scatter name="Phân tích Khách sạn" data={data} fill="#8884d8" />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default BubbleChart;
