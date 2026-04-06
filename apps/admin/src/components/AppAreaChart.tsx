'use client';

import { TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useQuery } from '@tanstack/react-query';

//  Import action mới vừa tạo
import { getDailyStats } from '@/app/(dashboard)/actions/get-daily-stats';

//  1. Cấu hình lại: Xóa desktop/mobile, thêm bookings/cancels
const chartConfig = {
    bookings: {
        label: 'Đơn thành công',
        color: '#10b981', // Màu xanh lá emerald-500
    },
    cancels: {
        label: 'Đơn hủy',
        color: '#ef4444', // Màu đỏ red-500
    },
} satisfies ChartConfig;

export function AppAreaChart() {
    //  2. Gọi Server Action qua React Query
    const { data, isLoading, isError } = useQuery({
        queryKey: ['daily-stats'],
        queryFn: async () => await getDailyStats(),
        staleTime: 1000 * 60 * 5, // Cache 5 phút
    });

    const calculateGrowth = () => {
        if (!data || data.length < 2) return 0;
        const current = data.at(-1);
        const prev = data.at(-2);

        if (!current || !prev) return 0;

        // Tính tăng trưởng dựa trên Bookings (đơn thành công)
        const currVal = current.bookings;
        const prevVal = prev.bookings;

        if (prevVal === 0) return 0; // Tránh chia cho 0
        return (((currVal - prevVal) / prevVal) * 100).toFixed(1);
    };

    if (isLoading) return <div className="text-muted-foreground p-10 text-center">Đang tải biểu đồ...</div>;
    if (isError || !data) return <div className="p-10 text-red-500">Lỗi tải dữ liệu.</div>;

    return (
        <div>
            <CardHeader>
                <CardTitle>Hiệu suất Đặt phòng</CardTitle>
                <CardDescription>Thống kê đơn hàng và hủy phòng trong 30 ngày qua</CardDescription>
            </CardHeader>

            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />

                    <XAxis
                        dataKey="date" //  Dùng trường 'date' mới
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        // Format ngày: 2024-01-20 -> 20/01
                        tickFormatter={(value) => {
                            const d = new Date(value);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                    />

                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />

                    <defs>
                        {/* Gradient cho Bookings */}
                        <linearGradient id="fillBookings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                        </linearGradient>
                        {/* Gradient cho Cancels */}
                        <linearGradient id="fillCancels" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                        </linearGradient>
                    </defs>

                    {/*  3. Vẽ Area cho Bookings */}
                    <Area
                        dataKey="bookings"
                        type="natural"
                        fill="url(#fillBookings)"
                        fillOpacity={0.6}
                        stroke="#10b981"
                        strokeWidth={2}
                        stackId="1"
                    />

                    {/*  4. Vẽ Area cho Cancels */}
                    <Area
                        dataKey="cancels"
                        type="natural"
                        fill="url(#fillCancels)"
                        fillOpacity={0.6}
                        stroke="#ef4444"
                        strokeWidth={2}
                        stackId="2"
                    />
                </AreaChart>
            </ChartContainer>

            <div className="mt-6 px-6 pb-6">
                <div className="flex items-center gap-2 leading-none font-medium">
                    Xu hướng đơn hàng {Number(calculateGrowth()) > 0 ? 'tăng' : 'giảm'}{' '}
                    {Math.abs(Number(calculateGrowth()))}% so với hôm qua
                    <TrendingUp
                        className={`h-4 w-4 ${Number(calculateGrowth()) < 0 ? 'rotate-180 text-red-500' : 'text-green-500'}`}
                    />
                </div>
                <div className="text-muted-foreground mt-2 text-sm leading-none">
                    {data.length > 0 && data[0] && data[data.length - 1]
                        ? `${new Date(data[0].date).toLocaleDateString('vi-VN')} - ${new Date(data[data.length - 1]!.date).toLocaleDateString('vi-VN')}`
                        : ''}
                </div>
            </div>
        </div>
    );
}
export default AppAreaChart;
