import { CapabilityDefinition } from '../types/chat';

export const CAPABILITIES: CapabilityDefinition[] = [
    {
        id: 'analytics',
        icon: '📊',
        label: 'Phân tích',
        color: '#3b82f6',
        dataKeys: ['daily_metrics', 'predictions', 'hourly_activity', 'customer_segments', 'growth_rate', 'anomalies'],
        prompts: [
            { label: '💰 Doanh thu hôm nay', query: 'Doanh thu hôm nay bao nhiêu?' },
            { label: '📊 Booking mới hôm nay', query: 'Có bao nhiêu booking mới hôm nay?' },
            { label: '📈 Xu hướng tuần này', query: 'Phân tích booking 7 ngày và xu hướng doanh thu' },
            { label: '🔮 Dự báo 3 ngày tới', query: 'Dự báo doanh thu và booking 3 ngày tới' },
            { label: '⏰ Khung giờ cao điểm', query: 'Khung giờ nào có nhiều booking nhất?' },
            { label: '🔍 Phân tích 30 ngày', query: 'Phân tích booking và doanh thu 30 ngày' },
            { label: '📊 So sánh tuần', query: 'So sánh doanh thu và booking tuần này với tuần trước' },
            {
                label: '🚨 Quét bất thường',
                query: 'Phân tích và tìm các điểm bất thường về doanh thu và booking hôm nay',
            },
        ],
    },
    {
        id: 'hotels',
        icon: '🏨',
        label: 'Khách sạn',
        color: '#8b5cf6',
        dataKeys: ['hotel_stats'],
        prompts: [
            { label: '🏨 Thống kê khách sạn', query: 'Thống kê khách sạn và tỷ lệ đặt phòng' },
            { label: '📊 Phân bố loại phòng', query: 'Phân tích phân bố loại khách sạn và booking' },
            { label: '⭐ Top 5 KS nhiều booking', query: 'Top 5 khách sạn nhiều booking nhất' },
        ],
    },
    {
        id: 'customers',
        icon: '👥',
        label: 'Khách hàng',
        color: '#f59e0b',
        dataKeys: ['user_access_stats', 'customer_segments'],
        prompts: [
            { label: '👥 Người dùng truy cập', query: 'Phân tích người dùng truy cập và booking trong 7 ngày' },
            { label: '⭐ Top khách VIP', query: 'Top 5 khách hàng chi tiêu nhiều nhất' },
            { label: '🍩 Phân khúc khách hàng', query: 'Phân khúc khách hàng mới và cũ' },
        ],
    },
    {
        id: 'operations',
        icon: '⚡',
        label: 'Hành động',
        color: '#ef4444',
        dataKeys: ['admin_action'],
        prompts: [
            { label: '✉️ Gửi mail khách mới', query: 'Gửi email chào mừng cho tất cả khách hàng mới hôm nay' },
            { label: '🎫 Tặng mã khách cũ', query: 'Tạo chương trình giảm giá 10% cho khách hàng quay lại' },
            { label: '📈 Export báo cáo', query: 'Xuất báo cáo doanh thu 30 ngày' },
        ],
    },
    {
        id: 'ai_charts',
        icon: '🤖',
        label: 'Chart thông minh',
        color: '#06b6d4',
        dataKeys: ['chart_type', 'chart_data'],
        prompts: [
            { label: '🍩 Phân khúc mới & cũ', query: 'Phân khúc khách hàng mới và cũ' },
            { label: '🏆 Top 5 KS', query: 'Top 5 khách sạn nhiều booking nhất' },
            { label: '🟦 Dự báo 7 ngày', query: 'Dự báo doanh thu 7 ngày tới' },
            { label: '📈 Xu hướng tuần', query: 'Phân tích xu hướng doanh thu và booking 7 ngày qua' },
        ],
    },
];

export const QUICK_PROMPTS = CAPABILITIES.flatMap((cap) => cap.prompts.slice(0, 2));

export function getCapabilityByDataKey(dataKey: string): CapabilityDefinition | undefined {
    return CAPABILITIES.find((cap) => cap.dataKeys.includes(dataKey));
}

export function getPromptsForMessage(biData: Record<string, unknown>): { label: string; query: string }[] {
    const matched: { label: string; query: string }[] = [];
    const dataKeys = Object.keys(biData);

    for (const cap of CAPABILITIES) {
        if (cap.dataKeys.some((key) => dataKeys.includes(key))) {
            matched.push(...cap.prompts.slice(0, 2));
        }
    }

    // Limit to max 4 follow-up chips
    return matched.slice(0, 4);
}

/** Mapping from query_type (detected by BI agent) to chart_type */
export const QUERY_TO_CHART: Record<string, string> = {
    revenue_trend: 'line',
    forecast: 'area',
    customer_segments: 'donut',
    top_hotels: 'horizontal_bar',
    top_users: 'horizontal_bar',
    booking_status: 'stacked_bar',
    hourly_activity: 'bar',
    growth: 'line',
    hotel: 'bar',
    user: 'horizontal_bar',
    general: 'line',
    action: 'line',
};

/** Mapping from query_type to display label */
export const QUERY_LABELS: Record<string, string> = {
    revenue_trend: 'Xu hướng doanh thu',
    forecast: 'Dự báo',
    customer_segments: 'Phân khúc khách hàng',
    top_hotels: 'Top khách sạn',
    top_users: 'Top khách hàng',
    booking_status: 'Trạng thái booking',
    hourly_activity: 'Hoạt động theo giờ',
    growth: 'Tăng trưởng',
    hotel: 'Thống kê khách sạn',
    user: 'Thống kê người dùng',
    general: 'Tổng quan',
    action: 'Hành động',
};

/** Get chart type for a given query_type */
export function getChartTypeForQuery(queryType: string): string {
    return QUERY_TO_CHART[queryType] || 'line';
}
