# ROLE

Bạn là Senior Software Architect, Senior Product Designer và AI Agent Reviewer.

Nhiệm vụ của bạn là review và đề xuất cải tiến cho một BI Agent Admin trong hệ thống đặt phòng khách sạn.

# CONTEXT

Hệ thống hiện đã có:

- Booking System
- Recommendation System
- BI Dashboard
- AI Chatbox cho Admin

AI Chatbox có các nhóm chức năng:

### Analytics

- Doanh thu
- Booking
- Xu hướng
- Dự báo
- Bất thường

### Hotels

- Thống kê khách sạn
- Tỷ lệ đặt phòng

### Customers

- Khách hàng
- Phân khúc khách hàng

### Operations

- Export báo cáo
- Các thao tác quản trị

Hệ thống đã có:

- PostgreSQL
- Backend API
- BI Agent
- KPI Cards
- Charts
- Suggestion Chips
- React Frontend

# RÀNG BUỘC

KHÔNG thay đổi:

- Database Schema
- PostgreSQL
- API Contracts hiện có
- Business Logic hiện tại
- Recommendation System
- Booking System

KHÔNG đề xuất:

- Multi-Agent Architecture
- Microservices mới
- Marketing Agent
- Finance Agent
- Plugin System
- Registry Pattern phức tạp
- Over-engineering

Mục tiêu là:

"Cải thiện BI Agent hiện tại để phù hợp đồ án tốt nghiệp."

# REVIEW OBJECTIVES

Hãy đánh giá:

## 1. Những gì nên GIỮ NGUYÊN

Xác định các thành phần đã đủ tốt.

Ví dụ:

- KPI Cards
- Revenue Chart
- Booking Chart
- Chat UI
- Suggestion Chips

---

## 2. Những gì nên BỔ SUNG

Chỉ đề xuất các cải tiến thực sự tạo giá trị cho AI Agent.

Ưu tiên:

### Insight Card

Ví dụ:

📈 Doanh thu tăng 12%

Nguyên nhân:

- Booking cuối tuần tăng

Khuyến nghị:

- Đẩy quảng bá Villa

---

### Table Card

Ví dụ:

Top Hotels
Top Customers
Anomaly List

---

### Donut Chart

Ví dụ:

Customer Segments

- New Customers
- Returning Customers

---

### Context-aware Follow-up Chips

Ví dụ:

Sau khi hỏi doanh thu:

[So sánh hôm qua]
[Dự báo]
[Khung giờ cao điểm]

Thay vì:

[Top khách VIP]
[Gửi mail]

---

## 3. Những gì KHÔNG NÊN LÀM

Chỉ ra các phần không đáng đầu tư cho đồ án.

Ví dụ:

- Multi-Agent
- Plugin Architecture
- Virtualized Chat
- Complex Date Parser
- Capability Registry
- Expand Modal

---

## 4. Kiến trúc UI tối ưu

Đề xuất kiến trúc đơn giản nhất:

Admin BI Agent
│
├── KPI Cards
├── Chat Messages
├── Charts
├── Table Card
├── Insight Card
└── Suggestion Chips

---

## 5. Roadmap triển khai

Phân chia:

### Bắt buộc

### Nên có

### Có thể bỏ

để hoàn thành đồ án.

---

## 6. Đánh giá đồ án

Cho điểm:

- Booking System
- Recommendation System
- BI Dashboard
- AI Agent
- Overall Graduation Project Readiness

và giải thích ngắn gọn.

# OUTPUT FORMAT

1. Keep
2. Add
3. Remove
4. Final UI Architecture
5. Implementation Priority
6. Graduation Project Assessment

Không viết code.

Tập trung vào tính thực tiễn, tính học thuật và khả năng bảo vệ đồ án.

=> prompt agent:

## 1. Keep — Giữ nguyên (không cần sửa)

| Thành phần                                  | Lý do                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Dashboard (routes `/analytics`)**         | Đã đủ charts, KPIs, sentiment analysis, evaluation — thể hiện rõ hybrid recommendation |
| **BI Agent chatbox architecture**           | Component tree đã ổn (UserMessage, AgentMessage, TypingIndicator, ChatInput)           |
| **KPI Cards**                               | 4 cards ở EmptyState đơn giản, dễ đọc, đúng insight admin cần                          |
| **Revenue Line Chart**                      | Cần thiết cho time-series data                                                         |
| **Booking Bar Chart**                       | Phù hợp, dễ so sánh                                                                    |
| **Skeleton loading**                        | 3 types (text/card/chart) là đủ tốt                                                    |
| **Suggestion chips (4 chips đầu)**          | 4 chips ở EmptyState là đúng UX                                                        |
| **Gọi API `/api/admin/chat`**               | Server Action pattern dùng đúng, không cần đổi                                         |
| **Status filter (`CONFIRMED`/`COMPLETED`)** | Đã fix, đồng bộ với analytics dashboard                                                |

---

## 2. Add — Nên bổ sung (ưu tiên cho đồ án)

### 2a. Insight Card (Quan trọng nhất)

**Giá trị:** Đây là thứ biến chatbox từ "hỏi gì đáp nấy" thành "AI phân tích chủ động". Trong đồ án, đây là điểm cho thấy AI Agent không chỉ là chatbot.

**Cách implement đơn giản (không cần AI LLM):**

`bi_agent.py` đã có sẵn:

- `anomalies` list — nếu có → "⚠️ Phát hiện bất thường"
- `growth_rate` — nếu > 10% → "📈 Cơ hội tăng trưởng"
- `predictions` — nếu có → "📊 Dự báo 3 ngày"

**Chỉ cần 1 component InsightCard.tsx:**

```
┌─ 💡 Insight ─────────────────────────┐
│  📈 Doanh thu +12.3% so với hôm qua   │
│  → Booking cuối tuần tăng              │
│  → Khung giờ cao điểm 14-16h           │
│                                         │
│  🎯 Đề xuất:                            │
│  • Tăng quảng cáo khung 12-14h          │
│  • Ưu đãi Villa cho khách mới           │
└─────────────────────────────────────────┘
```

**Effort:** 2-3 tiếng (Python backend logic đã có, chỉ cần UI)

### 2b. Table Card Component

**Giá trị:** Admin hotel cần danh sách cụ thể hơn biểu đồ. Table có thể tái sử dụng cho Top Hotels, Top Customers, Anomalies.

**Thiết kế tối thiểu:**

```typescript
// 1 component dùng chung
<TableCard
  title="Top 5 Khách sạn"
  columns={[
    { key: 'rank', label: '#' },
    { key: 'title', label: 'Tên KS' },
    { key: 'bookings', label: 'Booking', align: 'right' },
    { key: 'revenue', label: 'Doanh thu', align: 'right', format: 'vnd' },
  ]}
  data={hotelStats.top_hotels}
/>
```

**Effort:** 1-2 tiếng (1 component tái sử dụng)

### 2c. Donut Chart cho Customer Segments

**Giá trị:** "Hôm nay bao nhiêu khách mới, bao nhiêu khách quay lại?" — là câu hỏi admin hotel hay hỏi. Donut chart chỉ 2 phân khúc là đẹp nhất.

Chỉ cần thêm render case trong AgentMessage:

```
Có customer_segments? → DonutChart
Có hotel_stats? → TableCard (top_hotels)
```

**Effort:** 1 tiếng (component nhỏ)

### 2d. Context-aware Follow-up Chips

**Giá trị:** Thể hiện AI có "trí nhớ" và hiểu ngữ cảnh. Trong đồ án, đây là điểm cộng về UX.

**Cách làm đơn giản:**

- Dùng `query_type` đã có (general/hotel/user/action)
- Hardcode mapping thay vì AI sinh chips:

```typescript
const CONTEXT_CHIPS = {
    general: [
        { label: 'So sánh với hôm qua', query: 'so sánh doanh thu hôm qua' },
        { label: 'Dự báo 3 ngày', query: 'dự báo 3 ngày tới' },
        { label: 'Khung giờ cao điểm', query: 'khung giờ nào đông nhất' },
        { label: 'Bất thường', query: 'có gì bất thường không' },
    ],
    hotel: [
        { label: 'Top khách sạn', query: 'top khách sạn đặt nhiều nhất' },
        { label: 'Tỷ lệ đặt phòng', query: 'tỷ lệ đặt phòng trung bình' },
        { label: 'Phân bố loại phòng', query: 'phân bố loại phòng' },
    ],
    user: [
        { label: 'Top khách VIP', query: 'top khách hàng đặt nhiều nhất' },
        { label: 'Khách mới', query: 'có bao nhiêu khách mới' },
        { label: 'Phân khúc', query: 'phân khúc khách hàng' },
    ],
};
```

**Effort:** 1 tiếng (thay vì 4 chips cố định)

---

## 3. Remove — Không nên làm (cho đồ án)

| Thành phần                              | Lý do bỏ                                                        |
| --------------------------------------- | --------------------------------------------------------------- |
| **CapabilityRegistry pattern**          | Overengineering — chỉ cần hardcode 5 capabilities cho đồ án     |
| **CapabilityDrawer collapsible**        | 4 chips là đủ, không cần drawer "Xem thêm"                      |
| **Expand Modal cho chart**              | Chart 180px là đủ cho demo                                      |
| **QuickActionBar (Email/Promo/Export)** | Chưa có backend action thật, chỉ làm UI layout không có giá trị |
| **Virtualized Message List**            | Chatbox demo có < 20 messages, không cần                        |
| **Tab system cho multi-agent**          | Chỉ 1 BI Agent là đủ                                            |
| **useChartExpand hook**                 | Complexity không tương xứng giá trị                             |
| **AVATAR component riêng**              | Chỉ dùng 1-2 chỗ, có thể inline                                 |
| **React.ReactNode typing phức tạp**     | Dùng `any` hoặc đơn giản hóa                                    |

---

## 4. Final UI Architecture

```
ChatboxPage
│
├── ChatHeader              (giữ nguyên)
│   ├── Agent Icon
│   ├── Agent Name + Status
│   └── Description
│
├── ChatMessages
│   ├── EmptyState           (4 KPI cards + 4 chips)
│   │
│   ├── AgentMessage[]
│   │   ├── TextBubble       (nội dung text)
│   │   ├── InsightCard[]      ← THÊM MỚI
│   │   ├── ChartCard[]      (giữ nguyên)
│   │   ├── TableCard[]        ← THÊM MỚI
│   │   ├── KPICard[]        (giữ nguyên)
│   │   └── FollowUpChips    (context-aware) ← CẢI TIẾN
│   │
│   └── TypingIndicator      (giữ nguyên)
│
└── ChatInput                (giữ nguyên)
    └── 4 Quick Chips        (giữ nguyên)
```

**Component tree tối thiểu:**

```
components/
├── EmptyState.tsx         # Giữ nguyên, sửa KPI values
├── messages/
│   ├── UserMessage.tsx    # Giữ nguyên
│   ├── AgentMessage.tsx   # Sửa: thêm render TableCard + InsightCard + DonutChart
│   └── TypingIndicator.tsx# Giữ nguyên
├── charts/
│   ├── ChartCard.tsx      # Giữ nguyên
│   ├── RevenueLineChart.tsx# Giữ nguyên
│   ├── BookingsBarChart.tsx# Giữ nguyên
│   ├── HourlyActivityChart.tsx# Giữ nguyên
│   └── DonutChart.tsx     # THÊM MỚI (cho customer_segments)
├── insights/
│   └── InsightCard.tsx    # THÊM MỚI
├── table/
│   └── TableCard.tsx      # THÊM MỚI (cho top_hotels, top_users, anomalies)
├── kpi/
│   ├── KPIGrid.tsx        # Giữ nguyên
│   └── KPICard.tsx        # Giữ nguyên
└── chips/
    └── FollowUpChips.tsx  # CẢI TIẾN (context-aware)
```

---

## 5. Implementation Priority

### 🔴 Bắt buộc (phải có để bảo vệ)

| #   | Task                               | Effort | Lý do                                      |
| --- | ---------------------------------- | ------ | ------------------------------------------ |
| 1   | **Fix đồng bộ doanh thu** (đã làm) | ✅     | Không thể demo với số liệu khác nhau       |
| 2   | **Insight Card**                   | 2-3h   | Đây là "AI Agent" chứ không phải "Chatbot" |
| 3   | **Table Card**                     | 1-2h   | Admin cần danh sách, không chỉ chart       |
| 4   | **Context-aware follow-up chips**  | 1h     | Thể hiện AI có ngữ cảnh                    |

### 🟡 Nên có (tăng điểm)

| #   | Task                                                       | Effort | Giá trị             |
| --- | ---------------------------------------------------------- | ------ | ------------------- |
| 5   | Donut Chart cho Customer Segments                          | 1h     | Visual đẹp, dễ hiểu |
| 6   | Data freshness badge (mock vs real)                        | 0.5h   | Tăng độ tin cậy     |
| 7   | 1 câu hỏi mẫu khi vào chat: "Hỏi về doanh thu, booking..." | 0.5h   | UX mượt hơn         |

### 🟢 Có thể bỏ (không ảnh hưởng)

- QuickActionBar (Email/Promo/Export)
- Expand chart modal
- Guest/Host avatar riêng
- Animate chip transitions

---

## 6. Graduation Project Assessment

| Thành phần                | Điểm (1-10) | Nhận xét                                                                                            |
| ------------------------- | :---------: | --------------------------------------------------------------------------------------------------- |
| **Booking System**        |    9/10     | Đầy đủ CRUD, real-time status, payment integration. Mạnh nhất                                       |
| **Recommendation System** |    8/10     | Hybrid CF + Content-Based + Sentiment. Có evaluation metrics (RMSE, Precision, Recall)              |
| **BI Dashboard**          |    7/10     | Đầy đủ charts, filtering, export PDF. Nhưng chưa có real-time data                                  |
| **AI Agent**              |    6/10     | Chatbox UI tốt, BI data đã có, nhưng thiếu Insight layer — đang là chatbot hơn là AI Agent          |
| **Tổng thể**              |   7.5/10    | Hệ thống hoàn chỉnh, kiến trúc tốt. Cần thêm Insight Card + Table Card để AI Agent thực sự có value |

**Điểm mạnh khi bảo vệ:**

- Booking System + Recommendation System là core mạnh, có evaluation metrics đầy đủ
- BI Dashboard có nhiều loại chart, export PDF
- Chatbox UI responsive, skeleton loading, typing indicator

**Cần cải thiện trước khi bảo vệ:**

- **Insight Card**: Đây là thứ hội đồng sẽ hỏi "AI của em làm được gì ngoài trả lời câu hỏi?" — Insight Card là câu trả lời
- **Table Card**: "Admin cần gì?" — cần danh sách cụ thể, không chỉ biểu đồ
- **Đồng bộ dữ liệu**: 3 nguồn dữ liệu (analytics/chatbox/empty-state) phải cho cùng 1 con số

**Câu hỏi phản biện cần chuẩn bị:**

1. "Vì sao doanh thu ở dashboard và chatbox khác nhau?" → Đã fix
2. "AI Agent của em khác gì chatbot thông thường?" → Insight Card là câu trả lời
3. "Recommendation có thực sự hoạt động?" → Evaluation metrics (RMSE, Precision@5)
4. "Hệ thống scale được không?" → Kiến trúc microservices + message queue
