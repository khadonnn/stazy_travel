import { Message, BIData, ChartType } from '../../types/chat';
import { Avatar } from '../shared/Avatar';
import { ChartCard } from '../charts/ChartCard';
import { RevenueLineChart } from '../charts/RevenueLineChart';
import { BookingsBarChart } from '../charts/BookingsBarChart';
import { HourlyActivityChart } from '../charts/HourlyActivityChart';
import { DynamicChartRenderer } from '../charts/DynamicChartRenderer';
import { InsightCard } from '../insights/InsightCard';
import { GrowthRateCard } from '../insights/GrowthRateCard';
import { AnomalyWarningCard } from '../insights/AnomalyWarningCard';
import { RecommendationCard } from '../insights/RecommendationCard';
import { TopHotelsTable, TopUsersTable, AnomalyTable } from '../table/TableCard';
import { ActionCard } from '../actions/ActionCard';
import { FollowUpChips } from '../chips/FollowUpChips';
import { TrendingUp, BarChart3, Clock, Users, Building2, AlertTriangle } from 'lucide-react';

interface AgentMessageProps {
    message: Message;
    onChipClick: (query: string) => void;
    loading?: boolean;
}

function DataQualityBadge({ quality }: { quality?: string }) {
    if (!quality) return null;
    return (
        <div className="mt-2 text-right">
            <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    quality === 'db'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}
            >
                {quality === 'db' ? '🟢 Dữ liệu thực' : '🟡 Dữ liệu mẫu'}
            </span>
        </div>
    );
}

function renderBiData(biData: BIData) {
    if (!biData) return null;

    const hasChartType = !!biData.chart_type && biData.chart_type !== 'none';
    const hasDailyMetrics = biData.daily_metrics && biData.daily_metrics.length > 0;
    const hasHourly = biData.hourly_activity && biData.hourly_activity.length > 0;
    const hasSegments = biData.customer_segments && biData.customer_segments.length > 0;
    const hasHotelStats = !!biData.hotel_stats;
    const hasUserStats = !!biData.user_access_stats;
    const hasGrowthRate = !!biData.growth_rate;
    const hasInsights =
        !!biData.insights && (biData.insights.root_cause !== '' || biData.insights.actionable_suggestion !== '');
    const hasAnomalies = !!biData.anomalies && biData.anomalies.length > 0;
    const hasAction = !!biData.admin_action;
    const hasPlan = !!biData.plan && biData.plan.length > 0;

    return (
        <div className="mt-2 space-y-2">
            {/* ─── INSIGHT CARD (tổng hợp growth + anomalies + insights + plan) ─── */}
            {(hasGrowthRate || hasAnomalies || hasInsights || hasPlan) && (
                <InsightCard
                    growth_rate={biData.growth_rate}
                    anomalies={biData.anomalies}
                    insights={biData.insights}
                    plan={biData.plan}
                />
            )}

            {/* Growth Rate Comparison (standalone, fallback nếu InsightCard không show) */}
            {hasGrowthRate && !hasAnomalies && !hasInsights && !hasPlan && (
                <GrowthRateCard data={biData.growth_rate!} />
            )}

            {/* ═══════════════════════════════════════════════════════════════════
               INTELLIGENT CHART RENDERING (Intent-driven via DynamicChartRenderer)
               ═══════════════════════════════════════════════════════════════════ */}
            {hasChartType && <DynamicChartRenderer biData={biData} />}

            {/* ─── LEGACY FALLBACK: Only render when no chart_type from agent ─── */}
            {!hasChartType && (
                <>
                    {/* Customer Segments */}
                    {hasSegments && !hasHotelStats && !hasUserStats && (
                        <div className="flex gap-2">
                            {biData.customer_segments!.map((seg) => (
                                <div
                                    key={seg.segment}
                                    className="flex-1 rounded-lg border bg-white/50 p-2 text-center dark:bg-gray-900/50"
                                >
                                    <div className="text-muted-foreground text-xs capitalize">{seg.segment}</div>
                                    <div
                                        className={`text-lg font-bold ${seg.segment === 'new' ? 'text-blue-600' : 'text-emerald-600'}`}
                                    >
                                        {seg.bookings}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Revenue Chart */}
                    {hasDailyMetrics && (
                        <ChartCard
                            title="Doanh thu & Dự báo"
                            icon={<TrendingUp className="h-3 w-3" />}
                            defaultHeight={180}
                        >
                            <RevenueLineChart dailyMetrics={biData.daily_metrics!} predictions={biData.predictions} />
                        </ChartCard>
                    )}

                    {/* Bookings Chart */}
                    {hasDailyMetrics && (
                        <ChartCard
                            title="Booking theo ngày"
                            icon={<BarChart3 className="h-3 w-3" />}
                            defaultHeight={140}
                        >
                            <BookingsBarChart dailyMetrics={biData.daily_metrics!} predictions={biData.predictions} />
                        </ChartCard>
                    )}

                    {/* Hourly Activity */}
                    {hasHourly && (
                        <ChartCard title="Hoạt động theo giờ" icon={<Clock className="h-3 w-3" />} defaultHeight={140}>
                            <HourlyActivityChart data={biData.hourly_activity!} />
                        </ChartCard>
                    )}
                </>
            )}

            {/* Hotel Stats — KPI cards + Top Hotels Table (always render if present) */}
            {hasHotelStats && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1 rounded-lg border bg-white/50 p-2 text-center dark:bg-gray-900/50">
                            <div className="text-muted-foreground text-xs">Tổng KS</div>
                            <div className="text-lg font-bold text-blue-600">{biData.hotel_stats!.total_hotels}</div>
                        </div>
                        <div className="flex-1 rounded-lg border bg-white/50 p-2 text-center dark:bg-gray-900/50">
                            <div className="text-muted-foreground text-xs">Có booking</div>
                            <div className="text-lg font-bold text-green-600">
                                {biData.hotel_stats!.hotels_with_bookings}
                            </div>
                        </div>
                        <div className="flex-1 rounded-lg border bg-white/50 p-2 text-center dark:bg-gray-900/50">
                            <div className="text-muted-foreground text-xs">Tỷ lệ đặt</div>
                            <div className="text-lg font-bold text-orange-600">
                                {biData.hotel_stats!.booking_rate_pct}%
                            </div>
                        </div>
                    </div>
                    <TopHotelsTable data={biData.hotel_stats!} />
                </div>
            )}

            {/* User Stats — KPI cards + Top Users Table (always render if present) */}
            {hasUserStats && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1 rounded-lg border bg-white/50 p-2 text-center dark:bg-gray-900/50">
                            <div className="text-muted-foreground text-xs">Tổng user</div>
                            <div className="text-lg font-bold text-blue-600">
                                {biData.user_access_stats!.total_unique_users}
                            </div>
                        </div>
                        <div className="flex-1 rounded-lg border bg-white/50 p-2 text-center dark:bg-gray-900/50">
                            <div className="text-muted-foreground text-xs">Active 7d</div>
                            <div className="text-lg font-bold text-green-600">
                                {biData.user_access_stats!.active_users_7d}
                            </div>
                        </div>
                        <div className="flex-1 rounded-lg border bg-white/50 p-2 text-center dark:bg-gray-900/50">
                            <div className="text-muted-foreground text-xs">Mới</div>
                            <div className="text-lg font-bold text-purple-600">
                                {biData.user_access_stats!.new_users_7d}
                            </div>
                        </div>
                        <div className="flex-1 rounded-lg border bg-white/50 p-2 text-center dark:bg-gray-900/50">
                            <div className="text-muted-foreground text-xs">Quay lại</div>
                            <div className="text-lg font-bold text-orange-600">
                                {biData.user_access_stats!.returning_users_7d}
                            </div>
                        </div>
                    </div>
                    <TopUsersTable data={biData.user_access_stats!} />
                </div>
            )}

            {/* Anomaly Warning + Anomaly Table */}
            {hasAnomalies && (
                <>
                    <AnomalyWarningCard anomalies={biData.anomalies!} insights={biData.insights} />
                    <AnomalyTable data={biData.anomalies!} />
                </>
            )}

            {/* Admin Action */}
            {hasAction && <ActionCard action={biData.admin_action!} />}

            {/* Recommendations (fallback nếu InsightCard không show) */}
            {hasPlan && !hasGrowthRate && !hasAnomalies && !hasInsights && <RecommendationCard plan={biData.plan!} />}

            {/* Data Quality */}
            <DataQualityBadge quality={biData.data_quality} />
        </div>
    );
}

export function AgentMessage({ message, onChipClick, loading }: AgentMessageProps) {
    return (
        <div className="flex justify-start gap-3">
            <Avatar role="assistant" />
            <div className="bg-muted max-w-[85%] rounded-lg px-4 py-2">
                {/* Text content */}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* BI Data Charts (rendered outside bubble as cards) */}
                {message.biData && renderBiData(message.biData)}

                {/* Context-aware follow-up chips */}
                <FollowUpChips biData={message.biData} onChipClick={onChipClick} loading={loading} />

                {/* Timestamp */}
                <p className="text-muted-foreground mt-1 text-[10px]">{message.timestamp}</p>
            </div>
        </div>
    );
}
