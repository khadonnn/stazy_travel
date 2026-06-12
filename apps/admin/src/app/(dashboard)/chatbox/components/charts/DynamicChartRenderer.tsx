'use client';

import { ChartType, ChartDataItem, BIData } from '../../types/chat';
import { ChartCard } from './ChartCard';
import { RevenueLineChart } from './RevenueLineChart';
import { ForecastAreaChart } from './ForecastAreaChart';
import { BookingsBarChart } from './BookingsBarChart';
import { HorizontalBarChart } from './HorizontalBarChart';
import { DonutChart } from './DonutChart';
import { StackedBarChart } from './StackedBarChart';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Layers, Activity } from 'lucide-react';

interface DynamicChartRendererProps {
    biData: BIData;
}

/**
 * Chart type → icon mapping
 */
function getChartIcon(chartType: ChartType) {
    switch (chartType) {
        case 'line':
            return <TrendingUp className="h-3 w-3" />;
        case 'area':
            return <Activity className="h-3 w-3" />;
        case 'bar':
            return <BarChart3 className="h-3 w-3" />;
        case 'horizontal_bar':
            return <BarChart3 className="h-3 w-3" />;
        case 'donut':
            return <PieChart className="h-3 w-3" />;
        case 'stacked_bar':
            return <Layers className="h-3 w-3" />;
        case 'table':
            return <BarChart3 className="h-3 w-3" />;
        default:
            return <TrendingUp className="h-3 w-3" />;
    }
}

/**
 * Renders a chart based on chart_type from BI Agent.
 * Falls back to legacy rendering if chart_type is not set.
 */
export function DynamicChartRenderer({ biData }: DynamicChartRendererProps) {
    const { chart_type, chart_title, chart_data, daily_metrics, predictions, hourly_activity, customer_segments } =
        biData;

    // If no chart_type, return null (legacy rendering in AgentMessage handles it)
    if (!chart_type || chart_type === 'none') return null;

    const title = chart_title || getDefaultTitle(chart_type);
    const defaultHeight = chart_type === 'horizontal_bar' ? 200 : chart_type === 'donut' ? 180 : 160;
    const icon = getChartIcon(chart_type);

    switch (chart_type) {
        // ─── LINE CHART: Revenue trends ───
        case 'line': {
            if (!daily_metrics || daily_metrics.length === 0) return null;
            return (
                <ChartCard title={title} icon={icon} defaultHeight={defaultHeight}>
                    <RevenueLineChart dailyMetrics={daily_metrics} predictions={predictions} />
                </ChartCard>
            );
        }

        // ─── AREA CHART: Forecast ───
        case 'area': {
            if (!daily_metrics || daily_metrics.length === 0) return null;
            return (
                <ChartCard title={title} icon={icon} defaultHeight={defaultHeight}>
                    <ForecastAreaChart dailyMetrics={daily_metrics} predictions={predictions} />
                </ChartCard>
            );
        }

        // ─── BAR CHART: Comparisons ───
        case 'bar': {
            if (!chart_data || chart_data.length === 0) {
                // Fallback: use daily_metrics bookings
                if (!daily_metrics || daily_metrics.length === 0) return null;
                return (
                    <ChartCard title={title} icon={icon} defaultHeight={defaultHeight}>
                        <BookingsBarChart dailyMetrics={daily_metrics} predictions={predictions} />
                    </ChartCard>
                );
            }
            return (
                <ChartCard title={title} icon={icon} defaultHeight={defaultHeight}>
                    <HorizontalBarChart data={chart_data} valueLabel="Giá trị" />
                </ChartCard>
            );
        }

        // ─── HORIZONTAL BAR: Rankings ───
        case 'horizontal_bar': {
            if (!chart_data || chart_data.length === 0) return null;
            return (
                <ChartCard title={title} icon={icon} defaultHeight={defaultHeight}>
                    <HorizontalBarChart data={chart_data} valueLabel="Số lượng" />
                </ChartCard>
            );
        }

        // ─── DONUT CHART: Proportions ───
        case 'donut': {
            // Fallback: use customer_segments if chart_data not provided
            const data =
                chart_data && chart_data.length > 0
                    ? chart_data
                    : (customer_segments || []).map((s) => ({
                          name: s.segment === 'new' ? 'Khách mới' : 'Khách quay lại',
                          value: s.bookings,
                          color: s.segment === 'new' ? '#3b82f6' : '#10b981',
                      }));
            if (data.length === 0) return null;
            return (
                <ChartCard title={title} icon={icon} defaultHeight={defaultHeight}>
                    <DonutChart data={data} />
                </ChartCard>
            );
        }

        // ─── STACKED BAR: Multi-status ───
        case 'stacked_bar': {
            if (!chart_data || chart_data.length === 0) return null;
            // chart_data format: [{ name: "date", confirmed: 5, pending: 2, cancelled: 1 }, ...]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stackedData: any[] = chart_data.map((item) => ({
                ...item,
            }));
            const keys = Object.keys(stackedData[0]).filter((k) => k !== 'name');
            const colorMap: Record<string, string> = {
                confirmed: '#10b981',
                pending: '#f59e0b',
                cancelled: '#ef4444',
                completed: '#3b82f6',
            };
            const barKeys = keys.map((k) => ({
                dataKey: k,
                fill: colorMap[k.toLowerCase()] || '#94a3b8',
                name: k.charAt(0).toUpperCase() + k.slice(1),
            }));
            return (
                <ChartCard title={title} icon={icon} defaultHeight={defaultHeight}>
                    <StackedBarChart data={stackedData} keys={barKeys} />
                </ChartCard>
            );
        }

        // ─── TABLE ───
        case 'table': {
            // Tables are handled separately in AgentMessage via TableCard
            return null;
        }

        // ─── KPI ───
        case 'kpi': {
            // KPIs handled separately via KPICard
            return null;
        }

        default:
            return null;
    }
}

function getDefaultTitle(chartType: ChartType): string {
    switch (chartType) {
        case 'line':
            return 'Xu hướng doanh thu';
        case 'area':
            return 'Dự báo';
        case 'bar':
            return 'So sánh';
        case 'horizontal_bar':
            return 'Xếp hạng';
        case 'donut':
            return 'Tỷ lệ';
        case 'stacked_bar':
            return 'Trạng thái';
        default:
            return 'Biểu đồ';
    }
}
