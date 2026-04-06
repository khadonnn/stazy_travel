import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import dynamic from 'next/dynamic';
// === IMPORT RECHARTS COMPONENTS ===
import AppAreaChart from '@/components/charts/AppAreaChart';
import AppBarChart from '@/components/charts/AppBarChart';
import AppPieChart from '@/components/charts/AppPieChart';
import AlgorithmComparisonChart from '@/components/charts/AlgorithmComparisonChart';
import EvaluationLineChart from '@/components/charts/EvaluationLineChart';
import UserGroupComparisonChart from '@/components/charts/UserGroupComparisonChart';
// Dữ liệu Top N được code thành CardList, nên không cần TopNBarChart ở đây
import CardList from '@/components/CardList'; // Dùng cho Top Recommended/Top Users
import BubbleChart from '@/components/charts/BubbleChart';
import FunnelChart from '@/components/charts/FunnelChart'; // MỚI
import HistogramChart from '@/components/charts/HistogramChart'; // MỚI
import SparsityHeatmap from '@/components/charts/SparsityHeatmap';
import { getInteractionStats } from '../actions/get-interaction-stats';
import WordCloudChart from '@/components/charts/WordCloudPlaceholder';
import { getLatestSystemMetric } from '../actions/get-system-metrics';
import { getBubbleChartData } from './actions/get-bubble-data';
import { formatPercent } from '@/lib/utils';
import TodayStats from '@/components/dashboard/TodayStats';
// Hàm format tiền tệ (Giữ nguyên)

// Dữ liệu giả lập cho KPI (Model Performance)
const modelKPIs = [
    {
        title: 'RMSE (Độ lỗi dự đoán Rating)',
        value: '0.875',
        description: 'Đánh giá Matrix Factorization',
        color: 'text-red-500',
    },
    { title: 'Precision@5', value: '72.4%', description: 'Tỷ lệ gợi ý đúng trong Top 5', color: 'text-green-500' },
    { title: 'Recall@5', value: '58.1%', description: 'Tỷ lệ items đã được tìm thấy', color: 'text-blue-500' },
];

// Component KPI Card
const KPICard = ({ title, value, description, color }: (typeof modelKPIs)[0]) => (
    <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <p className="text-muted-foreground text-xs">{description}</p>
        </CardContent>
    </Card>
);
export default async function AnalyticsPage() {
    const [chartData, latestMetric, bubbleData] = await Promise.all([
        getInteractionStats(),
        getLatestSystemMetric(),
        getBubbleChartData(),
    ]);
    const totalViews = chartData.reduce((acc: any, curr: any) => acc + curr.Views, 0);
    const totalBookings = chartData.reduce((acc: any, curr: any) => acc + curr.Bookings, 0);
    const totalCancels = chartData.reduce((acc: any, curr: any) => acc + curr.Cancellations, 0);
    // Nếu chưa có dữ liệu trong DB (lần đầu chạy), dùng số mặc định
    const metrics = latestMetric || {
        rmse: 0,
        precisionAt5: 0,
        recallAt5: 0,
        algorithm: 'N/A',
    };
    const dynamicKPIs = [
        {
            title: 'RMSE (Độ lỗi)',
            value: metrics.rmse ? metrics.rmse.toFixed(3) : 'N/A',
            description: `Đánh giá thuật toán ${metrics.algorithm || 'CF'}`,
            color: 'text-red-500',
        },
        {
            title: 'Precision@5',
            value: formatPercent(metrics.precisionAt5),
            description: 'Tỷ lệ gợi ý đúng trong Top 5',
            color: 'text-green-500',
        },
        {
            title: 'Recall@5',
            value: formatPercent(metrics.recallAt5),
            description: 'Độ bao phủ items đã tìm thấy',
            color: 'text-blue-500',
        },
    ];
    return (
        <div className="space-y-6 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Analytics & Model Performance</h2>
            <p className="text-muted-foreground">
                Dashboard phân tích hành vi người dùng (Implicit/Explicit Feedback) và hiệu suất của Hệ thống gợi ý
                (Collaborative Filtering).
            </p>

            <Separator className="my-4" />

            {/* HÀNG 1: MODEL PERFORMANCE (KPIs) */}
            <h3 className="mb-3 text-xl font-semibold">
                🎯 Chỉ số Hiệu suất Mô hình (Model Performance & Metrics KPIs)
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dynamicKPIs.map((kpi, index) => (
                    <KPICard key={index} {...kpi} />
                ))}
            </div>

            <Separator className="my-4" />

            {/* HÀNG 2: XU HƯỚNG HÀNH VI CHÍNH (Area Chart - Chiếm Full Width) */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                {/* 1. BIỂU ĐỒ (Chiếm 2/3 chiều rộng -> col-span-2) */}
                <Card className="min-w-0 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Xu hướng Tương tác (6 tháng qua)</CardTitle>
                        <CardDescription>
                            Tổng hợp: <span className="font-bold text-green-500">{totalViews} Views</span> •{' '}
                            <span className="font-bold text-blue-500">{totalBookings} Bookings</span> •{' '}
                            <span className="font-bold text-yellow-500">{totalCancels} Hủy</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[380px]">
                        <AppAreaChart data={chartData} />
                    </CardContent>
                </Card>

                {/* 2. TODAY STATS (Chiếm 1/3 chiều rộng còn lại) */}
                <div className="flex flex-col gap-4">
                    {/* Tiêu đề nhỏ cho phần này nếu thích */}
                    <h3 className="text-lg font-semibold lg:hidden">Thống kê hôm nay</h3>

                    {/*  Truyền class grid-cols-1 để các thẻ xếp chồng lên nhau (dọc) */}
                    <TodayStats className="grid-cols-1 md:grid-cols-1 lg:grid-cols-1" />
                </div>
            </div>

            <Separator className="my-4" />

            {/* HÀNG 3: PHÂN TÍCH TẦN SUẤT & PHÂN PHỐI DỮ LIỆU */}
            <h3 className="mb-3 text-xl font-semibold">📊 Tần suất & Phân loại Hành vi</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 3.1 Implicit Actions Frequency - Bar Chart (1 cột) */}
                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Tần suất Hành động Ngầm</CardTitle>
                        <CardDescription>Click, View, Search, Wishlist, v.v.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <AppBarChart />
                    </CardContent>
                </Card>

                {/* 3.2 Explicit Feedback Distribution - Pie Chart (1 cột) */}
                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Phân phối Rating</CardTitle>
                        <CardDescription>Tỷ lệ các mức đánh giá (1 sao - 5 sao).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <AppPieChart />
                    </CardContent>
                </Card>

                {/* 3.3 User Group Comparison - Grouped Bar Chart (2 cột) */}
                <Card className="min-w-0 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>So sánh Hành vi giữa các Nhóm Người dùng</CardTitle>
                        <CardDescription>Views/Bookings của (Đã đặt) vs (Vãng lai).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <UserGroupComparisonChart />
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-4" />

            {/* HÀNG 4: ĐÁNH GIÁ MÔ HÌNH GỢI Ý (EVALUATION) */}
            <h3 className="mb-3 text-xl font-semibold">📉 Đánh giá Hiệu suất Mô hình (Evaluation)</h3>
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                {/* 4.1 CF Tuning (Metrics vs K) - Line Chart (2 cột) */}
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>Tinh chỉnh Siêu tham số CF (Metrics vs K)</CardTitle>
                        <CardDescription>RMSE, Precision, Recall khi thay đổi số lượng láng giềng (K).</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <EvaluationLineChart />
                    </CardContent>
                </Card>

                {/* 4.2 Algorithm Comparison - Bar Chart (2 cột) */}
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>So sánh Hiệu suất giữa các Thuật toán</CardTitle>
                        <CardDescription>User-based CF vs Item-based CF vs Matrix Factorization.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <AlgorithmComparisonChart />
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-4" />

            {/* HÀNG 5: CORE RECOMMENDATION INSIGHTS (Giống giao diện ảnh ban đầu: List + Sparsity) */}
            <h3 className="mb-3 text-xl font-semibold">🔍 Giám sát dữ liệu Gợi ý: Sparsity & Top Contributors</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* 5.1 Top Items được Gợi ý (Sử dụng CardList) */}
                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Top Items được Gợi ý Nhiều nhất</CardTitle>
                        <CardDescription>Kiểm tra độ phủ và tính thích nghi của mô hình.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CardList title="Top Recommended Stays" />
                    </CardContent>
                </Card>

                {/* 5.2 Top Users (Sử dụng CardList) */}
                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Top Người dùng Tương tác Mạnh nhất</CardTitle>
                        <CardDescription>Người dùng cung cấp nhiều dữ liệu nhất cho CF.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CardList title="Top Users by Interaction" />
                    </CardContent>
                </Card>

                {/* 5.3 Data Sparsity/Heatmap */}
                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Data Sparsity (Độ thưa thớt dữ liệu)</CardTitle>
                        <CardDescription>Visualizing User-Item Interaction Matrix.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <SparsityHeatmap />
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-4" />

            {/* HÀNG 6: PHÂN TÍCH HÀNH VI CÒN THIẾU (Funnel, Histogram) */}
            <h3 className="mb-3 text-xl font-semibold">🔬 Phân tích Hành vi Chiều sâu</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {/* 6.1 Funnel Chart (Phân tích chuyển đổi) */}
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>Phân tích Luồng Chuyển đổi</CardTitle>
                        <CardDescription>
                            Tỷ lệ người dùng chuyển từ View → Click Detail → Booking Confirmed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <FunnelChart />
                    </CardContent>
                </Card>

                {/* 6.2 Histogram (Phân bố tần suất) */}
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>Phân bố Tần suất Lượt xem</CardTitle>
                        <CardDescription>Số lượng người dùng theo nhóm lượt xem.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <HistogramChart />
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-4" />

            {/* HÀNG 7: ADVANCED INSIGHTS (Bubble & Word Cloud) */}
            <h3 className="mb-3 text-xl font-semibold">🌟 Item Feature Analysis & Sentiment Insights</h3>
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                {/* 7.1 Bubble Chart: Item Feature Analysis (2 cột) */}
                <Card className="min-w-0 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Phân tích Thuộc tính Khách sạn (Bubble)</CardTitle>
                        <CardDescription>Bookings (X), Rating (Y), Tiện nghi (Size).</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <BubbleChart data={bubbleData} />
                    </CardContent>
                </Card>

                {/* 7.2 Word Cloud (Placeholder) */}
                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Từ khóa Phổ biến trong Bình luận</CardTitle>
                        <CardDescription>Trực quan hóa Explicit Feedback (Comments).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <WordCloudChart />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
