'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Bot,
    Send,
    User,
    BarChart3,
    TrendingUp,
    AlertTriangle,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Mail,
    Tag,
    CheckCircle,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from 'recharts';

const SEARCH_SERVICE_URL = process.env.NEXT_PUBLIC_SEARCH_SERVICE_URL || 'http://127.0.0.1:8008';

interface HotelStatsData {
    total_hotels: number;
    hotels_with_bookings: number;
    booking_rate_pct: number;
    top_hotels: { id: number; title: string; bookings: number; revenue: number }[];
    category_distribution: { category: string; count: number; bookings: number }[];
}

interface UserAccessData {
    total_unique_users: number;
    active_users_7d: number;
    new_users_7d: number;
    returning_users_7d: number;
    avg_bookings_per_user: number;
    top_users: { userId: string; bookings: number; total_spent: number }[];
    daily_active_users: { date: string; users: number }[];
}

interface GrowthRateData {
    revenue: { current: number; previous: number; growth_pct: number };
    bookings: { current: number; previous: number; growth_pct: number };
}

interface AnomalyData {
    date: string;
    type: string;
    reasons: string[];
    revenue: number;
    bookings: number;
}

interface InsightsData {
    root_cause: string;
    actionable_suggestion: string;
}

interface AdminActionData {
    action_type: string;
    target: string;
    label: string;
    description: string;
    confirmation_text: string;
}

interface BIData {
    summary?: string;
    forecast_text?: string;
    plan?: string[];
    predictions?: { date: string; revenue_forecast: number; bookings_forecast: number }[];
    daily_metrics?: { date: string; revenue: number; bookings: number }[];
    hourly_activity?: { hour: number; bookings: number }[];
    customer_segments?: { segment: string; bookings: number }[];
    hotel_stats?: HotelStatsData;
    user_access_stats?: UserAccessData;
    growth_rate?: GrowthRateData;
    anomalies?: AnomalyData[];
    insights?: InsightsData;
    admin_action?: AdminActionData;
    data_quality?: string;
}

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    biData?: BIData;
}

const WELCOME_MESSAGE: Message = {
    id: 0,
    role: 'assistant',
    content:
        'Xin chào! Mình là **BI Agent** 🤖. Hãy hỏi mình về doanh thu, booking, hoặc xu hướng kinh doanh.\n\nChọn một gợi ý bên dưới hoặc tự nhập câu hỏi:',
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
};

const SUGGESTION_CHIPS = [
    { label: '💰 Doanh thu hôm nay', query: 'Doanh thu hôm nay bao nhiêu?' },
    { label: '📊 Booking mới hôm nay', query: 'Có bao nhiêu booking mới hôm nay?' },
    { label: '🏨 Thống kê khách sạn', query: 'Thống kê khách sạn và tỷ lệ đặt phòng' },
    { label: '👥 Người dùng truy cập', query: 'Phân tích người dùng truy cập và booking trong 7 ngày' },
    { label: '📈 Xu hướng tuần này', query: 'Phân tích booking 7 ngày và xu hướng doanh thu' },
    { label: '🔮 Dự báo 3 ngày tới', query: 'Dự báo doanh thu và booking 3 ngày tới' },
    { label: '⏰ Khung giờ cao điểm', query: 'Khung giờ nào có nhiều booking nhất?' },
    { label: '🔍 Phân tích 30 ngày', query: 'Phân tích booking và doanh thu 30 ngày' },
];

const ACTION_CHIPS = [
    { label: '✉️ Gửi mail khách mới', query: 'Gửi email chào mừng cho tất cả khách hàng mới hôm nay' },
    { label: '🎫 Tặng mã khách cũ', query: 'Tạo chương trình giảm giá 10% cho khách hàng quay lại' },
    { label: '🚨 Quét bất thường', query: 'Phân tích và tìm các điểm bất thường về doanh thu và booking hôm nay' },
    { label: '📊 So sánh tuần', query: 'So sánh doanh thu và booking tuần này với tuần trước' },
    { label: '👥 Top khách VIP', query: 'Top 5 khách hàng chi tiêu nhiều nhất' },
    { label: '📈 Export báo cáo', query: 'Xuất báo cáo doanh thu 30 ngày' },
];

function formatCurrency(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toString();
}

function BIDataCharts({ biData }: { biData: BIData }) {
    const hasDailyMetrics = biData.daily_metrics && biData.daily_metrics.length > 0;
    const hasPredictions = biData.predictions && biData.predictions.length > 0;
    const hasHourly = biData.hourly_activity && biData.hourly_activity.length > 0;
    const hasSegments = biData.customer_segments && biData.customer_segments.length > 0;
    const hasHotelStats = !!biData.hotel_stats;
    const hasUserStats = !!biData.user_access_stats;

    // Combine actual + forecast for line chart
    const combinedData = [
        ...(biData.daily_metrics || []).map((d) => ({
            date: d.date.slice(5), // MM-DD
            revenue: d.revenue,
            bookings: d.bookings,
            type: 'actual' as const,
        })),
        ...(biData.predictions || []).map((p) => ({
            date: p.date.slice(5),
            revenue: p.revenue_forecast,
            bookings: p.bookings_forecast,
            type: 'forecast' as const,
        })),
    ];

    const SEGMENT_COLORS: Record<string, string> = {
        new: '#3b82f6',
        returning: '#10b981',
    };

    return (
        <div className="mt-2 space-y-2">
            {/* Daily Revenue + Forecast Chart */}
            {hasDailyMetrics && (
                <div className="bg-background rounded-lg border p-2">
                    <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px] font-medium">
                        <TrendingUp className="h-3 w-3" />
                        Doanh thu & Dự báo
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={combinedData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatCurrency} />
                            <Tooltip
                                formatter={(value: number) => [`${value.toLocaleString()} VND`, 'Doanh thu']}
                                labelFormatter={(label) => `Ngày: ${label}`}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                name="Thực tế"
                                connectNulls
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Bookings Bar Chart */}
            {hasDailyMetrics && (
                <div className="bg-background rounded-lg border p-2">
                    <div className="text-muted-foreground mb-1 flex items-center gap-2 text-[11px] font-medium">
                        <BarChart3 className="h-3 w-3" />
                        Booking theo ngày
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={combinedData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="bookings" name="Bookings" radius={[4, 4, 0, 0]}>
                                {combinedData.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={entry.type === 'forecast' ? '#94a3b8' : '#3b82f6'}
                                        strokeDasharray={entry.type === 'forecast' ? '4 4' : undefined}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Hourly Activity */}
            {hasHourly && (
                <div className="bg-background rounded-lg border p-3">
                    <div className="text-muted-foreground mb-2 text-xs font-medium">⏰ Hoạt động theo giờ</div>
                    <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={biData.hourly_activity}>
                            <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(h) => `${h}h`} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: number) => [`${v} booking`, '']} />
                            <Bar dataKey="bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Customer Segments */}
            {hasSegments && (
                <div className="flex gap-2">
                    {biData.customer_segments!.map((seg) => (
                        <div key={seg.segment} className="flex-1 rounded-lg border p-2 text-center">
                            <div className="text-muted-foreground text-xs capitalize">{seg.segment}</div>
                            <div
                                className="text-lg font-bold"
                                style={{ color: SEGMENT_COLORS[seg.segment] || '#6b7280' }}
                            >
                                {seg.bookings}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Hotel Stats */}
            {hasHotelStats && (
                <div className="space-y-3">
                    {/* Hotel Summary */}
                    <div className="flex gap-2">
                        <div className="flex-1 rounded-lg border p-2 text-center">
                            <div className="text-muted-foreground text-xs">Tổng KS</div>
                            <div className="text-lg font-bold text-blue-600">{biData.hotel_stats!.total_hotels}</div>
                        </div>
                        <div className="flex-1 rounded-lg border p-2 text-center">
                            <div className="text-muted-foreground text-xs">Có booking</div>
                            <div className="text-lg font-bold text-green-600">
                                {biData.hotel_stats!.hotels_with_bookings}
                            </div>
                        </div>
                        <div className="flex-1 rounded-lg border p-2 text-center">
                            <div className="text-muted-foreground text-xs">Tỷ lệ đặt</div>
                            <div className="text-lg font-bold text-orange-600">
                                {biData.hotel_stats!.booking_rate_pct}%
                            </div>
                        </div>
                    </div>

                    {/* Top Hotels Bar Chart */}
                    {biData.hotel_stats!.top_hotels.length > 0 && (
                        <div className="bg-background rounded-lg border p-3">
                            <div className="text-muted-foreground mb-2 text-xs font-medium">
                                🏆 Top khách sạn đặt nhiều
                            </div>
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={biData.hotel_stats!.top_hotels} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis type="number" tick={{ fontSize: 10 }} />
                                    <YAxis dataKey="title" type="category" tick={{ fontSize: 9 }} width={100} />
                                    <Tooltip formatter={(v: number) => [`${v} booking`, '']} />
                                    <Bar dataKey="bookings" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Category Distribution */}
                    {biData.hotel_stats!.category_distribution.length > 0 && (
                        <div className="bg-background rounded-lg border p-3">
                            <div className="text-muted-foreground mb-2 text-xs font-medium">📊 Phân bố theo loại</div>
                            <ResponsiveContainer width="100%" height={120}>
                                <BarChart data={biData.hotel_stats!.category_distribution}>
                                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Bar dataKey="bookings" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Bookings" />
                                    <Bar dataKey="count" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Số KS" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* User Access Stats */}
            {hasUserStats && (
                <div className="space-y-3">
                    {/* User Summary */}
                    <div className="flex gap-2">
                        <div className="flex-1 rounded-lg border p-2 text-center">
                            <div className="text-muted-foreground text-xs">Tổng user</div>
                            <div className="text-lg font-bold text-blue-600">
                                {biData.user_access_stats!.total_unique_users}
                            </div>
                        </div>
                        <div className="flex-1 rounded-lg border p-2 text-center">
                            <div className="text-muted-foreground text-xs">Active 7d</div>
                            <div className="text-lg font-bold text-green-600">
                                {biData.user_access_stats!.active_users_7d}
                            </div>
                        </div>
                        <div className="flex-1 rounded-lg border p-2 text-center">
                            <div className="text-muted-foreground text-xs">Mới</div>
                            <div className="text-lg font-bold text-purple-600">
                                {biData.user_access_stats!.new_users_7d}
                            </div>
                        </div>
                        <div className="flex-1 rounded-lg border p-2 text-center">
                            <div className="text-muted-foreground text-xs">Quay lại</div>
                            <div className="text-lg font-bold text-orange-600">
                                {biData.user_access_stats!.returning_users_7d}
                            </div>
                        </div>
                    </div>

                    {/* Daily Active Users Chart */}
                    {biData.user_access_stats!.daily_active_users.length > 0 && (
                        <div className="bg-background rounded-lg border p-3">
                            <div className="text-muted-foreground mb-2 text-xs font-medium">
                                👥 User active theo ngày
                            </div>
                            <ResponsiveContainer width="100%" height={140}>
                                <LineChart
                                    data={biData.user_access_stats!.daily_active_users.map((d) => ({
                                        ...d,
                                        date: d.date.slice(5),
                                    }))}
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={(v: number) => [`${v} users`, '']} />
                                    <Line
                                        type="monotone"
                                        dataKey="users"
                                        stroke="#8b5cf6"
                                        strokeWidth={2}
                                        dot={{ r: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Top Users */}
                    {biData.user_access_stats!.top_users.length > 0 && (
                        <div className="bg-background rounded-lg border p-3">
                            <div className="text-muted-foreground mb-2 text-xs font-medium">⭐ Top người dùng</div>
                            <div className="space-y-1">
                                {biData.user_access_stats!.top_users.map((u, i) => (
                                    <div key={u.userId} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">
                                            #{i + 1} {u.userId}
                                        </span>
                                        <span className="font-medium">
                                            {u.bookings} booking · {(u.total_spent / 1_000_000).toFixed(1)}M VND
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Growth Rate Comparison */}
            {biData.growth_rate && (
                <div className="flex gap-2">
                    <div className="flex-1 rounded-lg border p-2">
                        <div className="text-muted-foreground text-[10px]">Doanh thu vs kỳ trước</div>
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold">
                                {formatCurrency(biData.growth_rate.revenue.current)}
                            </span>
                            {biData.growth_rate.revenue.growth_pct >= 0 ? (
                                <span className="flex items-center text-[10px] font-medium text-green-600">
                                    <ArrowUpRight className="h-3 w-3" />+{biData.growth_rate.revenue.growth_pct}%
                                </span>
                            ) : (
                                <span className="flex items-center text-[10px] font-medium text-red-600">
                                    <ArrowDownRight className="h-3 w-3" />
                                    {biData.growth_rate.revenue.growth_pct}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 rounded-lg border p-2">
                        <div className="text-muted-foreground text-[10px]">Booking vs kỳ trước</div>
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold">{biData.growth_rate.bookings.current}</span>
                            {biData.growth_rate.bookings.growth_pct >= 0 ? (
                                <span className="flex items-center text-[10px] font-medium text-green-600">
                                    <ArrowUpRight className="h-3 w-3" />+{biData.growth_rate.bookings.growth_pct}%
                                </span>
                            ) : (
                                <span className="flex items-center text-[10px] font-medium text-red-600">
                                    <ArrowDownRight className="h-3 w-3" />
                                    {biData.growth_rate.bookings.growth_pct}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Anomaly WarningCard */}
            {biData.anomalies && biData.anomalies.length > 0 && (
                <div className="animate-pulse rounded-lg border-2 border-red-300 bg-red-50 p-2.5 dark:border-red-800 dark:bg-red-950/40">
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Cảnh báo: {biData.anomalies.length} ngày bất thường
                    </div>
                    <div className="space-y-1">
                        {biData.anomalies.slice(0, 3).map((a, i) => (
                            <div key={i} className="text-[11px] text-red-600 dark:text-red-300">
                                📅 {a.date?.slice(5)}: {a.reasons.join('; ')}
                            </div>
                        ))}
                    </div>
                    {biData.insights && (
                        <div className="mt-2 rounded border border-red-200 bg-white/50 p-1.5 dark:border-red-800 dark:bg-black/20">
                            <div className="text-[10px] font-medium text-red-700 dark:text-red-400">
                                💡 Nguyên nhân: {biData.insights.root_cause}
                            </div>
                            <div className="text-[10px] text-red-600 dark:text-red-300">
                                → {biData.insights.actionable_suggestion}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Admin Action Buttons */}
            {biData.admin_action && (
                <div className="rounded-lg border bg-orange-50 p-2.5 dark:bg-orange-950/30">
                    <div className="mb-1.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                        ⚡ Hành động: {biData.admin_action.description}
                    </div>
                    <p className="mb-2 text-[11px] text-orange-600 dark:text-orange-300">
                        {biData.admin_action.confirmation_text}
                    </p>
                    <div className="flex gap-2">
                        <button
                            className="flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700"
                            onClick={() => alert('Đã thực hiện: ' + biData.admin_action!.description)}
                        >
                            {biData.admin_action.action_type === 'send_email' ? (
                                <Mail className="h-3 w-3" />
                            ) : (
                                <Tag className="h-3 w-3" />
                            )}
                            Xác nhận
                        </button>
                        <button className="text-muted-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
                            Hủy
                        </button>
                    </div>
                </div>
            )}

            {/* Plan / Action Items */}
            {biData.plan && biData.plan.length > 0 && (
                <div className="rounded-lg border bg-blue-50 p-3 dark:bg-blue-950/30">
                    <div className="mb-1 text-xs font-medium text-blue-600 dark:text-blue-400">💡 Khuyến nghị</div>
                    <ul className="space-y-1">
                        {biData.plan.map((item, i) => (
                            <li key={i} className="text-xs text-blue-700 dark:text-blue-300">
                                {i + 1}. {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Data Quality Badge */}
            {biData.data_quality && (
                <div className="text-right">
                    <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            biData.data_quality === 'db'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                    >
                        {biData.data_quality === 'db' ? '🟢 Dữ liệu thực' : '🟡 Dữ liệu mẫu'}
                    </span>
                </div>
            )}
        </div>
    );
}

function ChartSkeleton({ height = 160 }: { height?: number }) {
    return (
        <div className="bg-background animate-pulse rounded-lg border p-2">
            <div className="bg-muted mb-1 h-3 w-24 rounded" />
            <div className="bg-muted/50 rounded" style={{ height }} />
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="animate-pulse space-y-2">
            <div className="flex gap-2">
                <div className="bg-muted h-14 flex-1 rounded-lg" />
                <div className="bg-muted h-14 flex-1 rounded-lg" />
                <div className="bg-muted h-14 flex-1 rounded-lg" />
            </div>
            <ChartSkeleton height={120} />
        </div>
    );
}

export default function ChatboxPage() {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [skeletonType, setSkeletonType] = useState<'chart' | 'card' | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userText = input.trim();
        const userMsg: Message = {
            id: Date.now(),
            role: 'user',
            content: userText,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch(`${SEARCH_SERVICE_URL}/api/admin/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            const aiMsg: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.agent_response || data.data?.summary || 'Không có phản hồi.',
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                biData: data.data || undefined,
            };

            setMessages((prev) => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: `❌ Lỗi kết nối: ${error instanceof Error ? error.message : 'Không xác định'}. Kiểm tra Search Service tại ${SEARCH_SERVICE_URL}`,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleChipClick = (query: string) => {
        // Determine skeleton type based on query
        const q = query.toLowerCase();
        if (q.includes('khách sạn') || q.includes('người dùng') || q.includes('phân tích')) {
            setSkeletonType('card');
        } else {
            setSkeletonType('chart');
        }

        startTransition(() => {
            setInput(query);
            const userMsg: Message = {
                id: Date.now(),
                role: 'user',
                content: query,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, userMsg]);
            setInput('');
        });

        setLoading(true);

        fetch(`${SEARCH_SERVICE_URL}/api/admin/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: query }),
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                const aiMsg: Message = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: data.agent_response || data.data?.summary || 'Không có phản hồi.',
                    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    biData: data.data || undefined,
                };
                setMessages((prev) => [...prev, aiMsg]);
            })
            .catch((error) => {
                const errorMsg: Message = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: `❌ Lỗi kết nối: ${error instanceof Error ? error.message : 'Không xác định'}.`,
                    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages((prev) => [...prev, errorMsg]);
            })
            .finally(() => {
                setLoading(false);
                setSkeletonType(null);
            });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex h-[90vh] flex-col">
            <div className="border-muted flex flex-1 flex-col overflow-hidden rounded-lg border bg-gray-700/10 shadow-none">
                <div className="border-b px-4 py-2">
                    <div className="flex items-center gap-2 text-base">
                        <Bot className="h-5 w-5" />
                        Stazy BI Agent
                        <span className="text-muted-foreground text-xs font-normal">(Groq LLM)</span>
                    </div>
                </div>

                {/* Messages Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
                    <div className="space-y-2">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                                        <Bot className="text-primary h-4 w-4" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                    }`}
                                >
                                    {/* Text content */}
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                                    {/* BI Data Charts */}
                                    {msg.biData && <BIDataCharts biData={msg.biData} />}

                                    <p
                                        className={`mt-1 text-[10px] ${
                                            msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                        }`}
                                    >
                                        {msg.timestamp}
                                    </p>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                                        <User className="h-4 w-4 text-blue-600" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start gap-3">
                                <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                                    <Bot className="text-primary h-4 w-4 animate-pulse" />
                                </div>
                                <div className="bg-muted max-w-[85%] rounded-lg px-4 py-2">
                                    {skeletonType === 'card' ? (
                                        <CardSkeleton />
                                    ) : skeletonType === 'chart' ? (
                                        <ChartSkeleton />
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]" />
                                            <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]" />
                                            <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Suggestion Chips */}
                <div>
                    <div className="border-t px-3 py-1.5">
                        <div className="mb-1 flex flex-wrap gap-1.5">
                            {SUGGESTION_CHIPS.map((chip) => (
                                <button
                                    key={chip.label}
                                    onClick={() => handleChipClick(chip.query)}
                                    disabled={loading}
                                    className="bg-muted/50 hover:bg-muted cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {ACTION_CHIPS.map((chip) => (
                                <button
                                    key={chip.label}
                                    onClick={() => handleChipClick(chip.query)}
                                    disabled={loading}
                                    className="cursor-pointer rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 shadow-sm transition-all duration-200 hover:bg-amber-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-200 dark:backdrop-blur-sm dark:hover:border-amber-400/30 dark:hover:bg-amber-400/15"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="border-t px-3 py-2">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Hỏi về doanh thu, booking, dự báo..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={loading}
                                className="flex-1"
                            />
                            <Button onClick={handleSend} disabled={!input.trim() || loading} size="icon">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
