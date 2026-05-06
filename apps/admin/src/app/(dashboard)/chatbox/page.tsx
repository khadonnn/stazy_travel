'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, User, BarChart3, TrendingUp } from 'lucide-react';
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

interface BIData {
    summary?: string;
    forecast_text?: string;
    plan?: string[];
    predictions?: { date: string; revenue_forecast: number; bookings_forecast: number }[];
    daily_metrics?: { date: string; revenue: number; bookings: number }[];
    hourly_activity?: { hour: number; bookings: number }[];
    customer_segments?: { segment: string; bookings: number }[];
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
        'Xin chào! Mình là **BI Agent** 🤖. Hãy hỏi mình về doanh thu, booking, hoặc xu hướng kinh doanh.\n\nVí dụ:\n• "Doanh thu tuần này thế nào?"\n• "Phân tích booking 30 ngày"\n• "Dự báo 3 ngày tới"',
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
};

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
        <div className="mt-3 space-y-4">
            {/* Daily Revenue + Forecast Chart */}
            {hasDailyMetrics && (
                <div className="bg-background rounded-lg border p-3">
                    <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium">
                        <TrendingUp className="h-3 w-3" />
                        Doanh thu & Dự báo
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
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
                <div className="bg-background rounded-lg border p-3">
                    <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium">
                        <BarChart3 className="h-3 w-3" />
                        Booking theo ngày
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
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

export default function ChatboxPage() {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex h-[calc(100vh-2rem)] flex-col p-6">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">BI Agent Chatbox</h1>
                <p className="text-muted-foreground text-sm">Hỏi đáp về doanh thu, booking & xu hướng kinh doanh</p>
            </div>

            <Card className="flex flex-1 flex-col overflow-hidden">
                <CardHeader className="border-b py-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Bot className="h-5 w-5" />
                        Stazy BI Agent
                        <span className="text-muted-foreground text-xs font-normal">(Groq LLM)</span>
                    </CardTitle>
                </CardHeader>

                {/* Messages Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
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
                                <div className="bg-muted rounded-lg px-4 py-2">
                                    <div className="flex items-center gap-1">
                                        <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]" />
                                        <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]" />
                                        <div className="bg-muted-foreground/50 h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="border-t p-4">
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
            </Card>
        </div>
    );
}
