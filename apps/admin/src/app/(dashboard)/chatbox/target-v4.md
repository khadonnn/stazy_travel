Prompt: Thiết kế hệ thống Chart thông minh cho BI Agent

Bạn là Senior BI Architect và Data Visualization Expert.

Context

Đây là AI BI Agent cho Admin hệ thống đặt phòng khách sạn.

Hiện tại hệ thống có:

RevenueLineChart
BookingsBarChart
HourlyActivityChart
InsightCard
TableCard
KPI Cards

Tôi muốn nâng cấp khả năng trực quan hóa dữ liệu.

Mục tiêu

Không phải thêm chart cho nhiều.

Mà là:

AI Agent tự chọn loại chart phù hợp với dữ liệu.

Quy tắc chọn Chart

1. Line Chart

Dùng cho dữ liệu theo thời gian.

Ví dụ:

Doanh thu 7 ngày
Doanh thu 30 ngày
Booking theo ngày
Xu hướng tăng trưởng

Ví dụ query:

Doanh thu 30 ngày
Xu hướng booking tuần này
Tăng trưởng doanh thu 2. Area Chart

Dùng cho:

Dự báo
Trend + Forecast

Ví dụ:

Dự báo doanh thu 7 ngày
Dự báo booking tuần tới

Không dùng Line Chart cho forecast.

Ưu tiên Area Chart.

3. Bar Chart

Dùng cho:

So sánh nhóm
So sánh danh mục

Ví dụ:

Doanh thu theo loại hình
Booking theo khu vực
Doanh thu theo khách sạn 4. Horizontal Bar Chart

Dùng cho ranking.

Ví dụ:

Top 10 khách sạn
Top 10 khách VIP
Top nguồn doanh thu

Quy tắc:

Nếu >= 6 items
Dùng Horizontal Bar

Không dùng Pie Chart.

5. Donut Chart

Dùng cho tỷ lệ.

Ví dụ:

Khách mới vs khách quay lại
Booking thành công vs hủy
Phân khúc khách hàng

Quy tắc:

Chỉ dùng khi <= 5 nhóm
Tổng phải bằng 100% 6. Stacked Bar Chart

Dùng cho nhiều trạng thái.

Ví dụ:

Booking theo trạng thái

Confirmed
Pending
Cancelled

Hoặc:

Doanh thu theo loại hình và trạng thái
Không sử dụng

Không đề xuất:

Radar Chart
Bubble Chart
Gauge Chart
3D Chart
Funnel Chart

Vì không phù hợp với Admin Hotel.

Nâng cấp bi_agent.py

Review và đề xuất cách để:

{
"query_type": "...",
"chart_type": "...",
"chart_title": "...",
"chart_data": [...]
}

được trả về từ BI Agent.

Agent phải quyết định:

revenue_trend
-> line

forecast
-> area

customer_segments
-> donut

top_hotels
-> horizontal_bar

booking_status
-> stacked_bar
UI Architecture mong muốn
Agent Response
↓
Insight Card
↓
Chart phù hợp với query
↓
Table (nếu cần)
↓
Follow-up Chips

Không render tất cả chart cùng lúc.

Render theo intent.

Output yêu cầu
Danh sách chart nên hỗ trợ
Mapping query → chart
Thiết kế response schema cho bi_agent.py
Cách sửa AgentMessage.tsx để render động theo chart_type
Component tree cuối cùng
Đánh giá mức độ phù hợp cho đồ án tốt nghiệp
====

## Hoàn thành: Nâng cấp Chart thông minh cho BI Agent

### 1. Danh sách chart hỗ trợ

| Chart Type       | Component                                 | Mục đích                        | Query type mapping                   |
| ---------------- | ----------------------------------------- | ------------------------------- | ------------------------------------ |
| `line`           | `RevenueLineChart`                        | Xu hướng doanh thu, tăng trưởng | `revenue_trend`, `growth`, `general` |
| `area`           | `ForecastAreaChart` **(mới)**             | Dự báo + Trend                  | `forecast`                           |
| `bar`            | `BookingsBarChart` / `HorizontalBarChart` | So sánh nhóm                    | `hourly_activity`, `hotel`           |
| `horizontal_bar` | `HorizontalBarChart` **(mới)**            | Ranking (≥ 6 items)             | `top_hotels`, `top_users`            |
| `donut`          | `DonutChart` **(mới)**                    | Tỷ lệ (≤ 5 nhóm, 100%)          | `customer_segments`                  |
| `stacked_bar`    | `StackedBarChart` **(mới)**               | Nhiều trạng thái                | `booking_status`                     |

### 2. Response schema (đã thêm vào BIData)

```typescript
{
  chart_type: 'line' | 'area' | 'bar' | 'horizontal_bar' | 'donut' | 'stacked_bar' | 'table' | 'kpi';
  chart_title: string;            // Tên hiển thị
  chart_data: ChartDataItem[];    // Dữ liệu chuẩn hóa {name, value, color?}
  query_type: 'revenue_trend' | 'forecast' | 'customer_segments' | 'top_hotels' | ...
}
```

### 3. Luồng xử lý Agent

```
User Query
    ↓ Key: _determine_chart_type() + _build_chart_data()
    ↓
bi_agent.py response có chart_type, chart_title, chart_data
    ↓
AgentMessage.tsx renderBiData() → DynamicChartRenderer
    ↓
Chọn đúng chart component theo chart_type
    ↓
Follow-up Chips
```

### 4. Component tree cuối cùng

```
AgentMessage
 ├── renderBiData()
 │    ├── InsightCard (growth + anomalies)
 │    ├── DynamicChartRenderer (intent-driven)
 │    │    ├── chart_type='line' → RevenueLineChart
 │    │    ├── chart_type='area' → ForecastAreaChart
 │    │    ├── chart_type='bar' → BookingsBarChart / HorizontalBarChart
 │    │    ├── chart_type='horizontal_bar' → HorizontalBarChart
 │    │    ├── chart_type='donut' → DonutChart
 │    │    └── chart_type='stacked_bar' → StackedBarChart
 │    ├── HotelStats (KPI + TopHotelsTable)
 │    ├── UserStats (KPI + TopUsersTable)
 │    ├── AnomalyWarningCard + AnomalyTable
 │    └── ActionCard
 └── FollowUpChips
```

### 5. Files đã thay đổi/tạo mới

**Sửa đổi:**

- `apps/admin/src/app/(dashboard)/chatbox/types/chat.ts` — Thêm `ChartType`, `ChartDataItem`, `chart_type`, `chart_title`, `chart_data`, `query_type`
- `apps/admin/src/app/(dashboard)/chatbox/components/messages/AgentMessage.tsx` — Refactor renderBiData() thành intent-driven
- `apps/search-service/bi_agent.py` — Thêm 3 hàm chart selection, tích hợp vào cả 3 code path
- `apps/admin/src/app/(dashboard)/chatbox/registry/capabilities.ts` — Thêm `QUERY_TO_CHART`, `QUERY_LABELS`

**Tạo mới:**

- `ForecastAreaChart.tsx` — Area chart cho forecast
- `HorizontalBarChart.tsx` — Horizontal bar chart cho ranking
- `DonutChart.tsx` — Donut chart cho tỷ lệ
- `StackedBarChart.tsx` — Stacked bar chart cho trạng thái
- `DynamicChartRenderer.tsx` — Điều phối chart động theo `chart_type`

### 6. Đánh giá mức độ phù hợp cho đồ án tốt nghiệp

| Tiêu chí          | Đánh giá                                                                           |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Kiến trúc**     | 9/10 — Tách biệt rõ ràng: Agent quyết định chart → DynamicChartRenderer render     |
| **Mở rộng**       | 10/10 — Thêm chart_type mới chỉ cần thêm case trong switch                         |
| **UI/UX**         | 9/10 — AI tự chọn chart phù hợp, không render tất cả cùng lúc                      |
| **Độ phức tạp**   | 8/10 — Tích hợp giữa Python backend (chart logic) và React frontend (chart render) |
| **Giá trị đồ án** | 10/10 — Thể hiện AI decision-making, adaptive UI, practical BI use case            |
