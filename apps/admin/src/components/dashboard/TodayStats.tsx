import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Activity, Eye } from 'lucide-react'; // Import thêm Eye icon
import { getTodayMetrics } from '@/app/(dashboard)/actions/get-today-metrics';
import { cn } from '@/lib/utils';

// Hàm format tiền Việt
const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

export default async function TodayStats({ className }: { className?: string }) {
    const metrics = await getTodayMetrics();

    return (
        //  Sửa: md:grid-cols-4 để chứa đủ 4 thẻ
        <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
            {/* 3.  THÊM MỚI: Lượt truy cập */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Truy cập</CardTitle>
                    <Eye className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-purple-600">{metrics.views}</div>
                    <p className="text-muted-foreground text-xs">Lượt xem phòng</p>
                </CardContent>
            </Card>
            {/* 1. Doanh thu */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
                    <DollarSign className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatVND(metrics.revenue)}</div>
                    <p className="text-muted-foreground text-xs">Hôm nay</p>
                </CardContent>
            </Card>

            {/* 2. Đơn mới */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Đơn mới</CardTitle>
                    <Users className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">+{metrics.bookings}</div>
                    <p className="text-muted-foreground text-xs">Đã xác nhận</p>
                </CardContent>
            </Card>
            {/* 4. Đơn hủy */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Đơn hủy</CardTitle>
                    <Activity className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-500">{metrics.cancels}</div>
                    <p className="text-muted-foreground text-xs">Cần chú ý</p>
                </CardContent>
            </Card>
        </div>
    );
}
