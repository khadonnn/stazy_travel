'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// 1. Định nghĩa kiểu dữ liệu đầu vào cho Chart
interface ChartData {
    name: string; // Ngày tháng (VD: 01/01)
    Views: number; // totalViews
    Bookings: number; // totalBookings
    Cancellations: number; // totalCancels
}

interface AppAreaChartProps {
    data?: ChartData[]; // Nhận data từ cha truyền xuống
}

const AppAreaChart = ({ data = [] }: AppAreaChartProps) => {
    // Nếu chưa có data thì hiển thị loading hoặc mảng rỗng
    if (!data || data.length === 0) {
        return <div className="flex h-full items-center justify-center text-gray-500">Đang tải dữ liệu...</div>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                {/* Dùng stroke 444 cho dark mode, 3 3 là nét đứt */}
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />

                <XAxis
                    dataKey="name"
                    stroke="#A1A1AA"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                />
                <YAxis
                    stroke="#A1A1AA"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`} // Có thể thêm 'k' nếu số lớn
                />

                <Tooltip
                    contentStyle={{
                        backgroundColor: '#18181B',
                        border: '1px solid #3F3F46',
                        color: '#FAFAFA',
                        borderRadius: '6px',
                    }}
                    itemStyle={{ color: '#FAFAFA' }}
                    cursor={{ stroke: '#27272A', strokeWidth: 2 }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />

                {/* Layer 1: Views (Nền) */}
                <Area
                    type="monotone"
                    dataKey="Views"
                    stackId="1"
                    stroke="#22C55E"
                    fill="#22C55E"
                    fillOpacity={0.2} // Giảm opacity để nhìn thoáng hơn
                    name="Lượt Xem"
                />

                {/* Layer 2: Bookings (Chính) */}
                <Area
                    type="monotone"
                    dataKey="Bookings"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    name="Lượt Đặt"
                />

                {/* Layer 3: Cancellations (Cảnh báo) */}
                <Area
                    type="monotone"
                    dataKey="Cancellations"
                    stackId="1"
                    stroke="#FBBF24"
                    fill="#FBBF24"
                    fillOpacity={0.8}
                    name="Lượt Hủy"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default AppAreaChart;
