'use client';

import { Bot, TrendingUp, CalendarDays, Hotel, Users, ArrowRight } from 'lucide-react';
import { KPICard } from './kpi/KPICard';
import { QUICK_PROMPTS } from '../registry/capabilities';

interface EmptyStateProps {
    onPromptClick: (query: string) => void;
    loading?: boolean;
}

export function EmptyState({ onPromptClick, loading }: EmptyStateProps) {
    // Show first 4 quick prompts
    const quickPrompts = QUICK_PROMPTS.slice(0, 4);

    return (
        <div className="flex h-full flex-col items-center justify-center px-6">
            {/* Welcome */}
            <div className="mb-6 text-center">
                <div className="bg-primary/10 mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl">
                    <Bot className="text-primary h-8 w-8" />
                </div>
                <h2 className="mb-1 text-lg font-semibold">BI Agent · Hotel Intelligence</h2>
                <p className="text-muted-foreground max-w-md text-sm">
                    Trợ lý phân tích dữ liệu khách sạn thông minh. Hỏi về doanh thu, booking, xu hướng kinh doanh bất kỳ
                    lúc nào.
                </p>
            </div>

            {/* KPI Dashboard */}
            <div className="mb-6 w-full max-w-lg">
                <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Tổng quan hôm nay
                </div>
                <div className="flex gap-2">
                    <KPICard label="Doanh thu" value="12.5M" color="#3b82f6" />
                    <KPICard label="Booking" value={4} color="#10b981" />
                    <KPICard label="Khách sạn" value={120} color="#8b5cf6" />
                    <KPICard label="Tỷ lệ đặt" value="89%" change={3.2} color="#f59e0b" />
                </div>
            </div>

            {/* Quick Start */}
            <div className="w-full max-w-lg">
                <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Bắt đầu với
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {quickPrompts.map((prompt) => (
                        <button
                            key={prompt.label}
                            onClick={() => onPromptClick(prompt.query)}
                            disabled={loading}
                            className="bg-background hover:bg-muted dark:bg-background/60 group inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
                        >
                            {prompt.label}
                            <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
