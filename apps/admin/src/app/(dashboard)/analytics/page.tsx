import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
// === IMPORT RECHARTS COMPONENTS ===
import AppAreaChart from '@/components/charts/AppAreaChart';
import AppBarChart from '@/components/charts/AppBarChart';
import AppPieChart from '@/components/charts/AppPieChart';
import AlgorithmComparisonChart from '@/components/charts/AlgorithmComparisonChart';
import EvaluationLineChart from '@/components/charts/EvaluationLineChart';
import UserGroupComparisonChart from '@/components/charts/UserGroupComparisonChart';
import CardList from '@/components/CardList';
import BubbleChart from '@/components/charts/BubbleChart';
import FunnelChart from '@/components/charts/FunnelChart';
import HistogramChart from '@/components/charts/HistogramChart';
import SparsityHeatmap from '@/components/charts/SparsityHeatmap';
import WordCloudChart from '@/components/charts/WordCloudPlaceholder';
import TopNBarChart from '@/components/charts/TopNBarChart';

// Server Actions
import { getInteractionStats } from '../actions/get-interaction-stats';
import { getLatestSystemMetric } from '../actions/get-system-metrics';
import { getBubbleChartData } from './actions/get-bubble-data';
import { getInteractionTypeStats } from '../actions/get-interaction-type-stats';
import { getRatingDistribution } from '../actions/get-rating-distribution';
import { getUserGroupStats } from '../actions/get-user-group-stats';
import { getEvaluationHistory } from '../actions/get-evaluation-history';
import { getAlgorithmStats } from '../actions/get-algorithm-stats';
import { getFunnelStats } from '../actions/get-funnel-stats';
import { getActivityHistogram } from '../actions/get-activity-histogram';
import { getSparsityStats } from '../actions/get-sparsity-stats';
import { getWordCloudData } from '../actions/get-word-cloud-data';
import { getSentimentStats } from '../actions/get-sentiment-stats';

import { formatPercent } from '@/lib/utils';
import TodayStats from '@/components/dashboard/TodayStats';

// =========================================
// Component KPI Card
// =========================================
const KPICard = ({
    title,
    value,
    description,
    color,
}: {
    title: string;
    value: string;
    description: string;
    color: string;
}) => (
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

// =========================================
// Component Aspect Sentiment Mini-Chart (inline)
// =========================================
function AspectSentimentTable({
    data,
}: {
    data: Array<{ aspect: string; POSITIVE: number; NEUTRAL: number; NEGATIVE: number }>;
}) {
    if (!data || data.length === 0) {
        return (
            <div className="text-muted-foreground flex h-full items-center justify-center">
                Chưa có dữ liệu aspect sentiment
            </div>
        );
    }

    const maxTotal = Math.max(...data.map((d) => d.POSITIVE + d.NEUTRAL + d.NEGATIVE));

    return (
        <div className="space-y-3">
            {data.map((item) => {
                const total = item.POSITIVE + item.NEUTRAL + item.NEGATIVE;
                const posPct = total > 0 ? (item.POSITIVE / total) * 100 : 0;
                const neuPct = total > 0 ? (item.NEUTRAL / total) * 100 : 0;
                const negPct = total > 0 ? (item.NEGATIVE / total) * 100 : 0;

                return (
                    <div key={item.aspect} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium capitalize">{item.aspect}</span>
                            <span className="text-muted-foreground text-xs">{total} mentions</span>
                        </div>
                        <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
                            <div
                                className="bg-green-500 transition-all"
                                style={{ width: `${posPct}%` }}
                                title={`Positive: ${Math.round(posPct)}%`}
                            />
                            <div
                                className="bg-yellow-500 transition-all"
                                style={{ width: `${neuPct}%` }}
                                title={`Neutral: ${Math.round(neuPct)}%`}
                            />
                            <div
                                className="bg-red-500 transition-all"
                                style={{ width: `${negPct}%` }}
                                title={`Negative: ${Math.round(negPct)}%`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// =========================================
// MAIN PAGE
// =========================================
export default async function AnalyticsPage() {
    // Fetch tất cả data song song
    const [
        chartData,
        latestMetric,
        bubbleData,
        interactionTypeStats,
        ratingDistribution,
        userGroupStats,
        evaluationHistory,
        algorithmStats,
        funnelData,
        histogramData,
        sparsityData,
        wordCloudData,
        sentimentStats,
    ] = await Promise.all([
        getInteractionStats(),
        getLatestSystemMetric(),
        getBubbleChartData(),
        getInteractionTypeStats(),
        getRatingDistribution(),
        getUserGroupStats(),
        getEvaluationHistory(),
        getAlgorithmStats(),
        getFunnelStats(),
        getActivityHistogram(),
        getSparsityStats(),
        getWordCloudData(),
        getSentimentStats(),
    ]);

    const totalViews = chartData.reduce((acc: any, curr: any) => acc + curr.Views, 0);
    const totalBookings = chartData.reduce((acc: any, curr: any) => acc + curr.Bookings, 0);
    const totalCancels = chartData.reduce((acc: any, curr: any) => acc + curr.Cancellations, 0);

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

    // Tính positive ratio cho sentiment
    const positiveCount = sentimentStats.overall.find((s) => s.name === 'POSITIVE')?.value ?? 0;
    const negativeCount = sentimentStats.overall.find((s) => s.name === 'NEGATIVE')?.value ?? 0;
    const totalSentiment = positiveCount + negativeCount;
    const positiveRatio = totalSentiment > 0 ? Math.round((positiveCount / totalSentiment) * 100) : 0;

    return (
        <div className="space-y-6 p-8 pt-6">
            <div className="flex items-center gap-3">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Hybrid Recommendation Analytics</h2>
                    <p className="text-muted-foreground">
                        Dashboard phân tích hành vi người dùng (Implicit/Explicit Feedback), hiệu suất Collaborative
                        Filtering, và Aspect-Based Sentiment Analysis cho hệ thống gợi ý Hybrid.
                    </p>
                </div>
            </div>

            <Separator className="my-4" />

            {/* ============================================= */}
            {/* HÀNG 1: MODEL PERFORMANCE (KPIs) */}
            {/* ============================================= */}
            <h3 className="mb-3 text-xl font-semibold">
                🎯 Chỉ số Hiệu suất Mô hình CF (Model Performance & Metrics KPIs)
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dynamicKPIs.map((kpi, index) => (
                    <KPICard key={index} {...kpi} />
                ))}
            </div>

            <Separator className="my-4" />

            {/* ============================================= */}
            {/* HÀNG 2: HYBRID SENTIMENT OVERVIEW */}
            {/* ============================================= */}
            <h3 className="mb-3 text-xl font-semibold">
                🧠 Phân tích Sentiment Hybrid (Collaborative Filtering + Aspect-Based)
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Tổng Reviews đã Phân tích"
                    value={sentimentStats.totalReviews.toLocaleString()}
                    description={`${sentimentStats.nlpProcessedCount.toLocaleString()} đã qua NLP processing`}
                    color="text-purple-500"
                />
                <KPICard
                    title="Điểm TB (Rating)"
                    value={sentimentStats.avgRating.toFixed(1) + ' ⭐'}
                    description="Trung bình rating trên tất cả reviews"
                    color="text-yellow-500"
                />
                <KPICard
                    title="Tỷ lệ Positive"
                    value={positiveRatio + '%'}
                    description={`${positiveCount} positive / ${negativeCount} negative`}
                    color={positiveRatio >= 70 ? 'text-green-500' : 'text-orange-500'}
                />
                <KPICard
                    title="Aspect Coverage"
                    value={sentimentStats.byAspect.length.toString() + ' khía cạnh'}
                    description="Số khía cạnh được phân tích (service, room, price...)"
                    color="text-cyan-500"
                />
            </div>

            <Separator className="my-4" />

            {/* ============================================= */}
            {/* HÀNG 3: XU HƯỚNG HÀNH VI CHÍNH (Area Chart) */}
            {/* ============================================= */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
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

                <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold lg:hidden">Thống kê hôm nay</h3>
                    <TodayStats className="grid-cols-1 md:grid-cols-1 lg:grid-cols-1" />
                </div>
            </div>

            <Separator className="my-4" />

            {/* ============================================= */}
            {/* HÀNG 4: PHÂN TÍCH TẦN SUẤT & PHÂN PHỐI */}
            {/* ============================================= */}
            <h3 className="mb-3 text-xl font-semibold">📊 Tần suất & Phân loại Hành vi</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Tần suất Hành động Ngầm</CardTitle>
                        <CardDescription>Click, View, Search, Wishlist, v.v.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <AppBarChart data={interactionTypeStats} />
                    </CardContent>
                </Card>

                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Phân phối Rating</CardTitle>
                        <CardDescription>Tỷ lệ các mức đánh giá (1 sao - 5 sao).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <AppPieChart data={ratingDistribution} />
                    </CardContent>
                </Card>

                <Card className="min-w-0 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>So sánh Hành vi giữa các Nhóm Người dùng</CardTitle>
                        <CardDescription>Views/Bookings của (Đã đặt) vs (Vãng lai).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <UserGroupComparisonChart data={userGroupStats} />
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-4" />

            {/* ============================================= */}
            {/* HÀNG 5: ASPECT-BASED SENTIMENT (Hybrid Core) */}
            {/* ============================================= */}
            <h3 className="mb-3 text-xl font-semibold">
                💬 Aspect-Based Sentiment Analysis{' '}
                <Badge variant="secondary" className="ml-2">
                    Hybrid Core
                </Badge>
            </h3>
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Phân bố Cảm xúc Tổng quan</CardTitle>
                        <CardDescription>
                            Tỷ lệ POSITIVE / NEUTRAL / NEGATIVE trên tất cả reviews (Explicit Feedback).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <AppPieChart data={sentimentStats.overall.map((s) => ({ name: s.name, value: s.value }))} />
                    </CardContent>
                </Card>

                <Card className="min-w-0 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Sentiment theo Từng Khía cạnh (Aspect)</CardTitle>
                        <CardDescription>
                            Trọng số aspect-based sentiment cho Hybrid Recommendation Model. Dữ liệu từ
                            explicitSentiments field.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] overflow-y-auto">
                        <AspectSentimentTable data={sentimentStats.byAspect} />
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-4" />

            {/* ============================================= */}
            {/* HÀNG 6: ĐÁNH GIÁ MÔ HÌNH CF (EVALUATION) */}
            {/* ============================================= */}
            <h3 className="mb-3 text-xl font-semibold">📉 Đánh giá Hiệu suất CF (Evaluation)</h3>
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>Tinh chỉnh Siêu tham số CF (Metrics vs K)</CardTitle>
                        <CardDescription>RMSE, Precision, Recall khi thay đổi số lượng láng giềng (K).</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <EvaluationLineChart data={evaluationHistory} />
                    </CardContent>
                </Card>

                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>So sánh Hiệu suất giữa các Thuật toán</CardTitle>
                        <CardDescription>User-based CF vs Item-based CF vs Matrix Factorization.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <AlgorithmComparisonChart data={algorithmStats} />
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-4" />

            {/* ============================================= */}
            {/* HÀNG 7: CORE RECOMMENDATION INSIGHTS */}
            {/* ============================================= */}
            <h3 className="mb-3 text-xl font-semibold">🔍 Giám sát dữ liệu Gợi ý: Sparsity & Top Contributors</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Top Items được Gợi ý Nhiều nhất</CardTitle>
                        <CardDescription>Kiểm tra độ phủ và tính thích nghi của mô hình.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CardList title="Top Recommended Stays" />
                    </CardContent>
                </Card>

                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Top Người dùng Tương tác Mạnh nhất</CardTitle>
                        <CardDescription>Người dùng cung cấp nhiều dữ liệu nhất cho CF.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CardList title="Top Users by Interaction" />
                    </CardContent>
                </Card>

                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Data Sparsity (Độ thưa thớt dữ liệu)</CardTitle>
                        <CardDescription>Visualizing User-Item Interaction Matrix.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <SparsityHeatmap data={sparsityData} />
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-4" />

            {/* ============================================= */}
            {/* HÀNG 8: PHÂN TÍCH HÀNH VI (Funnel, Histogram) */}
            {/* ============================================= */}
            <h3 className="mb-3 text-xl font-semibold">🔬 Phân tích Hành vi Chiều sâu</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>Phân tích Luồng Chuyển đổi</CardTitle>
                        <CardDescription>
                            Tỷ lệ người dùng chuyển từ View → Click Detail → Booking Confirmed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <FunnelChart data={funnelData} />
                    </CardContent>
                </Card>

                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>Phân bố Tần suất Hoạt động</CardTitle>
                        <CardDescription>Số lượng người dùng theo nhóm tần suất tương tác.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <HistogramChart data={histogramData} />
                    </CardContent>
                </Card>
            </div>

            <Separator className="my-4" />

            {/* ============================================= */}
            {/* HÀNG 9: ITEM FEATURES & WORD CLOUD */}
            {/* ============================================= */}
            <h3 className="mb-3 text-xl font-semibold">🌟 Item Feature Analysis & Explicit Feedback Insights</h3>
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                <Card className="min-w-0 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Phân tích Thuộc tính Khách sạn (Bubble)</CardTitle>
                        <CardDescription>
                            Bookings (X), Rating (Y), Tiện nghi (Size). Dữ liệu dùng cho Content-Based Filtering.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <BubbleChart data={bubbleData} />
                    </CardContent>
                </Card>

                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Từ khóa Phổ biến trong Bình luận</CardTitle>
                        <CardDescription>
                            On-the-fly Word Cloud từ Review.comment (Explicit Feedback). Không cần lưu embedding.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex h-[350px] items-center justify-center">
                        <WordCloudChart data={wordCloudData} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
