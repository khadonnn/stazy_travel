export interface HotelStatsData {
    total_hotels: number;
    hotels_with_bookings: number;
    booking_rate_pct: number;
    top_hotels: { id: number; title: string; bookings: number; revenue: number }[];
    category_distribution: { category: string; count: number; bookings: number }[];
}

export interface UserAccessData {
    total_unique_users: number;
    active_users_7d: number;
    new_users_7d: number;
    returning_users_7d: number;
    avg_bookings_per_user: number;
    top_users: { userId: string; bookings: number; total_spent: number }[];
    daily_active_users: { date: string; users: number }[];
}

export interface GrowthRateData {
    revenue: { current: number; previous: number; growth_pct: number };
    bookings: { current: number; previous: number; growth_pct: number };
}

export interface AnomalyData {
    date: string;
    type: string;
    reasons: string[];
    revenue: number;
    bookings: number;
}

export interface InsightsData {
    root_cause: string;
    actionable_suggestion: string;
}

export interface AdminActionData {
    action_type: string;
    target: string;
    label: string;
    description: string;
    confirmation_text: string;
}

export type ChartType = 'line' | 'area' | 'bar' | 'horizontal_bar' | 'donut' | 'stacked_bar' | 'table' | 'kpi' | 'none';

export interface ChartDataItem {
    name: string;
    value: number;
    color?: string;
    /** For stacked bar: sub-category */
    category?: string;
    /** For stacked bar: the stack group */
    stack?: string;
}

export interface BIData {
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

    // ── Intelligent Chart Fields ──
    /** Agent's chosen chart type based on query intent */
    chart_type?: ChartType;
    /** Display title for the chart */
    chart_title?: string;
    /** Normalized data for dynamic chart rendering */
    chart_data?: ChartDataItem[];
    /** Agent's detected query category */
    query_type?:
        | 'revenue_trend'
        | 'forecast'
        | 'customer_segments'
        | 'top_hotels'
        | 'top_users'
        | 'booking_status'
        | 'hourly_activity'
        | 'growth'
        | 'general';
}

export interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    biData?: BIData;
}

export interface CapabilityDefinition {
    id: string;
    icon: string;
    label: string;
    prompts: { label: string; query: string }[];
    dataKeys: string[];
    color: string;
}

export interface ChipItem {
    label: string;
    query: string;
    variant?: 'default' | 'action';
}
