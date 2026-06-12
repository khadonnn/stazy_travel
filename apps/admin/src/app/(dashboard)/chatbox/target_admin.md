# BI Admin Chatbox — Product Design Proposal

## 1. UX Audit

### Current State Analysis

| Aspect                | Rating (1-5) | Notes                                                            |
| --------------------- | :----------: | ---------------------------------------------------------------- |
| Information Hierarchy |      1       | 14 chips flat, no grouping, no priority                          |
| Cognitive Load        |      2       | Everything visible at once — analysis, actions, operations mixed |
| Visual Alignment      |      2       | Charts crammed into 120-160px bubbles, hard to read              |
| Empty State           |      1       | No first-time experience, no onboarding                          |
| Scalability           |      1       | Adding new capability = more chips, more chaos                   |
| AI Conversational UX  |      2       | Feels like dashboard button panel, not ChatGPT/Claude            |
| Message Readability   |      3       | Content + charts in same bubble = info overload                  |
| Loading UX            |      2       | Single skeleton type, no granularity                             |

## 2. Vấn Đề Hiện Tại

### 2.1 Cognitive Overload

- **8 Suggestion Chips + 6 Action Chips = 14 buttons** hiển thị cùng lúc
- Admin phải scan toàn bộ để tìm cái mình cần
- Action chips (Gửi mail, Tặng mã) lẫn với Analytics chips

### 2.2 Không Có Phân Cấp Thông Tin

```
Hiện tại: [💰] [📊] [🏨] [👥] [📈] [🔮] [⏰] [🔍] [✉️] [🎫] [🚨] [📊] [👥] [📈]
→ 14 items cùng cấp độ visual → không biết đâu là quan trọng
```

### 2.3 Chart Rendering Trong Message Bubble

- Charts bị giới hạn ở 120-160px height — quá nhỏ để phân tích
- Không có fullscreen / expand mode
- Mixed text + chart + KPIs trong một bubble = không thể scan nhanh

### 2.4 Thiếu Context Awareness

- Chips không thay đổi dựa trên lịch sử chat
- Sau khi hỏi về khách sạn, vẫn show chip về doanh thu — không theo ngữ cảnh

### 2.5 Không Có Empty State

- Lần đầu mở chat: thấy ngay 14 chips + input box
- Không có hướng dẫn, không có KPI overview, không biết nên hỏi gì

### 2.6 Không Scale Được

- Thêm Marketing Agent → thêm 6 chips nữa
- Thêm Finance Agent → thêm 6 chips nữa
- Tổng cộng có thể lên 30+ chips → unusable

## 3. Thiết Kế Đề Xuất

### 3.1 Thiết Kế Tổng Thể

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🤖 BI Agent · Hotel Intelligence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─ Empty State / Dashboard ─────────────────────┐
  │  📊 Tổng quan hôm nay                          │
  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
  │  │28.5M │ │  24  │ │ 120  │ │ 89%  │          │
  │  │Revenue│Booking│Hotels│Occup.│          │
  │  └──────┘ └──────┘ └──────┘ └──────┘          │
  │                                                 │
  │  💡 Gợi ý nhanh:                                │
  │  [Doanh thu hôm nay] [Booking mới]              │
  │  [Top khách sạn]    [Dự báo 3 ngày]             │
  └─────────────────────────────────────────────────┘

  ┌─ Conversation ─────────────────────────────────┐
  │  👤 Tôi: Doanh thu hôm nay bao nhiêu?          │
  │  ─────────────────────────────────────────────  │
  │  🤖 Agent: Doanh thu hôm nay đạt 28.5M VND     │
  │     ↑12.3% so với hôm qua.                     │
  │                                                 │
  │  ┌─ Revenue Chart ──────────────────────────┐  │
  │  │  [📈 Biểu đồ doanh thu 7 ngày]           │  │
  │  │  [Expand ▸]                              │  │
  │  └──────────────────────────────────────────┘  │
  │                                                 │
  │  📋 Khuyến nghị:                                │
  │  • Tăng ngân sách quảng cáo khung 14h-16h      │
  │  • Đẩy ưu đãi cuối tuần cho khách mới           │
  │                                                 │
  │  🔍 Muốn xem thêm?                              │
  │  [📈 Xu hướng] [🏨 Khách sạn] [👥 Khách hàng]  │
  │  [📊 So sánh]   [🚨 Bất thường]                 │
  └─────────────────────────────────────────────────┘

  ┌─ Quick Actions ───────────────────────────────┐
  │  [✉️ Email] [🎫 Promo] [📥 Export]            │
  │  (chỉ hiện khi cần thiết)                      │
  ├────────────────────────────────────────────────┤
  │  [ Hỏi về doanh thu, booking, phân tích... ] [→]│
  └─────────────────────────────────────────────────┘
```

### 3.2 Thông Số Chi Tiết

#### Empty State (First Visit)

```
┌─────────────────────────────────────────────────┐
│  🤖 BI Agent · Hotel Intelligence                 │
│  Xin chào Admin! Mình là trợ lý phân tích         │
│  dữ liệu khách sạn thông minh.                    │
│                                                   │
│  📊 Dashboard nhanh                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ 28.5M  │ │   24   │ │  120   │ │  89%   │     │
│  │Revenue │ Bookings│ Hotels  │Occupancy│     │
│  │ +8.2%  │  +15%   │   -     │  +3.2%  │     │
│  └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                   │
│  💡 Bắt đầu với:                                  │
│  ┌────────────────────────────────────────┐      │
│  │ [💰 Doanh thu hôm nay]                 │      │
│  │ [📈 Xu hướng 7 ngày gần nhất]          │      │
│  │ [🏨 Top khách sạn đặt nhiều]           │      │
│  │ [👥 Phân tích khách hàng]             │      │
│  └────────────────────────────────────────┘      │
│                                                   │
│  Hoặc gõ câu hỏi của bạn bên dưới...              │
└─────────────────────────────────────────────────┘

Thông số:
- 4 KPI cards, mỗi card có: value + label + % change
- 4 Suggested prompts (max) — không show action chips ở empty state
- Không show action chips (Email, Promo, Export) khi chưa có context
```

#### Conversation Mode

```
Sau khi user gửi câu hỏi → có 3 zones:

Zone 1: Agent Response
┌─────────────────────────────────────────────────┐
│  🤖 Doanh thu hôm nay đạt 28,500,000 VND         │
│  ↑ 12.3% so với hôm qua.                        │
│  Khung giờ cao điểm: 14:00-16:00 (42% bookings) │
└─────────────────────────────────────────────────┘

Zone 2: Visual Data (collapsible, expandable)
┌─────────────────────────────────────────────────┐
│  📈 Doanh thu 7 ngày                    [Expand] │
│  ┌──────────────────────────────────────────┐   │
│  │     📊 Bar Chart (compact 180px)         │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Khi click [Expand]: mở modal full-width         │
│  với chart đầy đủ + controls                    │
└─────────────────────────────────────────────────┘

Zone 3: Suggested Follow-ups (context-aware)
┌─────────────────────────────────────────────────┐
│  Hỏi thêm:                                      │
│  [So sánh với tuần trước]  [Dự báo 3 ngày]      │
│  [Phân tích theo giờ]      [Top khách sạn]       │
└─────────────────────────────────────────────────┘
```

#### Quick Actions Bar (bottom)

```
┌─────────────────────────────────────────────────┐
│  ⚡ Hành động nhanh                              │
│  [✉️ Gửi mail] [🎫 Tạo khuyến mãi] [📥 Export]  │
│     → Icon + label ngắn                          │
│     → Disabled khi chưa có context hợp lệ        │
│     → Chỉ active khi agent detect được intent    │
├─────────────────────────────────────────────────┤
│  [Input box...                         ] [Send] │
└─────────────────────────────────────────────────┘

Quy tắc: Quick actions chỉ sáng khi:
- Email: user đã hỏi về gửi mail / khách hàng
- Promo: user đã hỏi về khuyến mãi / giảm giá
- Export: user đã yêu cầu xuất báo cáo
```

## 4. Suggestion Chip Strategy

### 4.1 Số Lượng Chip

| State                 | Max Chips | Loại      | Notes                            |
| --------------------- | :-------: | --------- | -------------------------------- |
| Empty / First visit   |     4     | Analytics | Chỉ gợi ý khám phá dữ liệu       |
| After analytics query |    4-5    | Follow-up | Context-aware, mở rộng phân tích |
| After action intent   |    2-3    | Action    | Confirm/cancel action            |
| After error           |     2     | Retry     | Thử lại / hỏi khác               |

**Nguyên tắc:**

- Luôn ≤ 5 chips hiển thị
- Phần còn lại → "Xem thêm" dropdown hoặc capabilitiy tabs
- Action chips tách riêng, không trộn với analysis chips

### 4.2 Cấu Trúc Đề Xuất

```
Thay vì flat list → sử dụng 2-level progressive disclosure:

Level 1: Quick Prompts (4 chips)
[💰 Doanh thu] [📊 Booking] [🏨 Khách sạn] [👥 User]

Level 2: "Xem thêm capability →" (hover/click mở panel)
┌─────────────────────────────────────────────┐
│  📊 Phân tích                                │
│  • Doanh thu hôm nay                         │
│  • Xu hướng tuần này                         │
│  • Dự báo 3 ngày                             │
│  • So sánh 30 ngày                           │
│                                              │
│  🏨 Khách sạn                                │
│  • Thống kê khách sạn                        │
│  • Tỷ lệ đặt phòng                           │
│  • Phân bố loại phòng                        │
│                                              │
│  👥 Khách hàng                                │
│  • Người dùng truy cập                       │
│  • Top khách VIP                             │
│  • Phân khúc khách hàng                      │
│                                              │
│  ⚡ Hành động                                 │
│  • Gửi mail khách mới                        │
│  • Tạo khuyến mãi                            │
│  • Export báo cáo                            │
└─────────────────────────────────────────────┘

Panel này là collapsible drawer, không phải popup nhỏ.
```

## 5. Message Rendering Strategy

### 5.1 Decision Tree

```
API Response đến → kiểm tra data fields:

┌─ Có daily_metrics? ─────→ Hiển thị Line Chart Revenue
│                           Hiển thị Bar Chart Bookings
│                           Hiển thị KPI Cards (Total Rev, Total Bookings)
│
┌─ Có predictions? ───────→ Thêm Forecast Line vào chart hiện tại
│                           (dashed line, gray color)
│
┌─ Có hourly_activity? ───→ Hiển thị Bar Chart "Hoạt động theo giờ"
│
┌─ Có customer_segments? ─→ Hiển thị Donut Chart hoặc 2 KPI cards
│
┌─ Có hotel_stats? ───────→ Hiển thị:
│                             • 3 KPI cards (Tổng KS, Có booking, Tỷ lệ)
│                             • Horizontal Bar Chart (Top hotels)
│                             • Grouped Bar Chart (Category distribution)
│
┌─ Có user_access_stats? ─→ Hiển thị:
│                             • 4 KPI cards (Total, Active, New, Returning)
│                             • Line Chart (Daily active users)
│                             • Table (Top users)
│
┌─ Có growth_rate? ───────→ Hiển thị 2 comparison cards (Revenue, Booking)
│                             với arrow indicator + % change
│
┌─ Có anomalies? ─────────→ Warning card (red border, pulse animation)
│                             + insight card bên dưới
│
┌─ Có admin_action? ──────→ Action confirmation card
│                             [Confirm] [Cancel] buttons
│
┌─ Có plan? ──────────────→ Bullet list "Khuyến nghị" card
```

### 5.2 Layout Rules

```
Mỗi visual element là một card riêng biệt, KHÔNG nhét vào message bubble:

┌─ Message Bubble ────────────────────────────┐
│  🤖 Agent text response here...              │
│  (summary, insights, forecast_text)          │
└──────────────────────────────────────────────┘

─── Spacing ───

┌─ InsightCard: Growth Rate ──────────────────┐
│  [Revenue: +12.3%] [Booking: +8.5%]         │
└──────────────────────────────────────────────┘

─── Spacing ───

┌─ ChartCard: Revenue (collapsible) ──────────┐
│  Title bar: 📈 Doanh thu 7 ngày   [↗ Expand]│
│  ┌────────────────────────────────────────┐ │
│  │  Chart (compact)                       │ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘

─── Spacing ───

┌─ ActionCard: Admin Action ──────────────────┐
│  ⚡ Xác nhận gửi mail cho 23 khách mới?     │
│  [✅ Xác nhận] [❌ Hủy]                     │
└──────────────────────────────────────────────┘
```

## 6. Scalability Design

### 6.1 Capability Registry Pattern

```typescript
// Conceptual — KHÔNG implement code, chỉ architecture

Capability Registry:
{
  "analytics": {
    icon: "📊",
    label: "Phân tích",
    prompts: ["Doanh thu", "Booking", "Xu hướng", "Dự báo"],
    dataKeys: ["daily_metrics", "predictions", "hourly_activity"],
    renderer: "AnalyticsRenderer"
  },
  "hotels": {
    icon: "🏨",
    label: "Khách sạn",
    prompts: ["Thống kê", "Tỷ lệ đặt", "Phân bố"],
    dataKeys: ["hotel_stats"],
    renderer: "HotelRenderer"
  },
  "customers": {
    icon: "👥",
    label: "Khách hàng",
    prompts: ["Người dùng", "VIP", "Phân khúc"],
    dataKeys: ["user_access_stats", "customer_segments"],
    renderer: "CustomerRenderer"
  },
  "operations": {
    icon: "⚡",
    label: "Hành động",
    prompts: ["Email", "Promo", "Export"],
    dataKeys: ["admin_action"],
    renderer: "ActionRenderer"
  }
}
```

### 6.2 Thêm Agent Mới (Future)

```
Khi thêm Marketing Agent:

1. Định nghĩa trong registry:
   "marketing": {
     icon: "📣",
     label: "Marketing",
     prompts: ["Campaign", "ROI", "Channel"],
     dataKeys: ["campaign_stats", "roi_metrics"],
     renderer: "MarketingRenderer"
   }

2. Tab mới tự động xuất hiện trong capability panel
3. Không cần sửa layout, không cần thêm chip

Khi thêm Finance Agent:
   "finance": {
     icon: "💰",
     label: "Tài chính",
     prompts: ["P&L", "Cash flow", "Budget"],
     dataKeys: ["financial_metrics"],
     renderer: "FinanceRenderer"
   }
```

### 6.3 Tab-based Navigation cho Nhiều Agent

```
Khi có 3+ agents → sử dụng tab system:

┌─────────────────────────────────────────────────┐
│  [🤖 BI] [📣 Marketing] [💰 Finance] [🔧 More▾]│
└─────────────────────────────────────────────────┘

Mỗi tab có:
- Riêng conversation history
- Riêng suggestion chips
- Riêng quick actions
- Switch tab giữ nguyên context
```

## 7. Component Architecture

### 7.1 Component Tree

```
AdminChatPage
├── ChatLayout (grid container)
│   ├── ChatHeader
│   │   ├── AgentAvatar (icon + name + status)
│   │   ├── CapabilityTabs (khi có 3+ agents)
│   │   └── HeaderActions (clear chat, settings)
│   │
│   ├── ChatMessages
│   │   ├── MessageList (virtualized scroll)
│   │   │   ├── UserMessage
│   │   │   │   ├── Avatar
│   │   │   │   └── MessageBubble
│   │   │   │
│   │   │   ├── AgentMessage
│   │   │   │   ├── Avatar
│   │   │   │   ├── MessageBubble (text)
│   │   │   │   ├── ChartCard[] (collapsible)
│   │   │   │   │   ├── ChartHeader (title + expand)
│   │   │   │   │   └── ChartRenderer
│   │   │   │   │       ├── RevenueLineChart
│   │   │   │   │       ├── BookingsBarChart
│   │   │   │   │       ├── HourlyActivityChart
│   │   │   │   │       ├── CustomerSegmentsChart
│   │   │   │   │       ├── HotelStatsChart
│   │   │   │   │       └── UserActivityChart
│   │   │   │   ├── InsightCard
│   │   │   │   │   ├── GrowthRateCard
│   │   │   │   │   ├── AnomalyWarningCard
│   │   │   │   │   └── RecommendationCard
│   │   │   │   ├── ActionCard
│   │   │   │   │   ├── ConfirmationButtons
│   │   │   │   │   └── StatusIndicator
│   │   │   │   └── FollowUpChips (context-aware)
│   │   │   │
│   │   │   └── TypingIndicator
│   │   │
│   │   └── EmptyState / DashboardOverview
│   │       ├── KPIGrid
│   │       │   └── KPICard[] (4 cards)
│   │       └── SuggestedPrompts
│   │           └── PromptChip[] (4 chips)
│   │
│   └── ChatInputArea
│       ├── CapabilityDrawer (collapsible)
│       │   ├── CapabilityGroup[]
│       │   │   ├── GroupHeader (icon + label)
│       │   │   └── PromptChip[]
│       │   └── QuickActionBar
│       │       └── ActionButton[]
│       ├── InputBox
│       └── SendButton
```

### 7.2 Data Flow

```
User Input / Chip Click
        │
        ▼
  API Call → /api/admin/chat
        │
        ▼
  Response JSON
        │
        ▼
  MessageDispatcher
  ├── Parse data fields
  ├── Match với capability registry
  ├── Determine render components
  └── Return: { text, cards[], chips[] }
        │
        ▼
  AgentMessage
  ├── text → MessageBubble
  ├── cards[] → ChartCard[] / InsightCard[] / ActionCard[]
  └── chips[] → FollowUpChips
```

### 7.3 File Structure Đề Xuất

```
chatbox/
├── page.tsx                    # Entry point (giữ nguyên route)
├── components/
│   ├── ChatLayout.tsx          # Grid layout container
│   ├── ChatHeader.tsx          # Header với tabs
│   ├── ChatMessages.tsx        # Virtualized message list
│   ├── EmptyState.tsx          # Dashboard overview
│   ├── MessageDispatcher.tsx   # Route response → components
│   │
│   ├── messages/
│   │   ├── UserMessage.tsx
│   │   ├── AgentMessage.tsx
│   │   └── TypingIndicator.tsx
│   │
│   ├── charts/
│   │   ├── ChartCard.tsx        # Collapsible container
│   │   ├── RevenueLineChart.tsx
│   │   ├── BookingsBarChart.tsx
│   │   ├── HourlyActivityChart.tsx
│   │   ├── CustomerSegmentsChart.tsx
│   │   ├── HotelStatsChart.tsx
│   │   └── UserActivityChart.tsx
│   │
│   ├── insights/
│   │   ├── InsightCard.tsx
│   │   ├── GrowthRateCard.tsx
│   │   ├── AnomalyWarningCard.tsx
│   │   └── RecommendationCard.tsx
│   │
│   ├── actions/
│   │   └── ActionCard.tsx
│   │
│   ├── chips/
│   │   ├── FollowUpChips.tsx    # Context-aware after response
│   │   ├── CapabilityDrawer.tsx # Collapsible capability panel
│   │   ├── CapabilityGroup.tsx  # Grouped prompts
│   │   └── QuickActionBar.tsx
│   │
│   ├── input/
│   │   ├── ChatInput.tsx
│   │   └── SendButton.tsx
│   │
│   ├── kpi/
│   │   ├── KPIGrid.tsx
│   │   └── KPICard.tsx
│   │
│   └── shared/
│       ├── Avatar.tsx
│       └── Badge.tsx
│
├── hooks/
│   ├── useChat.ts              # Chat state management
│   ├── useCapabilityRegistry.ts # Dynamic capability loading
│   └── useChartExpand.ts       # Chart expand/collapse
│
├── registry/
│   └── capabilities.ts         # Capability definitions
│
└── types/
    └── chat.ts                 # TypeScript interfaces
```

## 8. Migration Plan

### Phase 1: Foundation (Day 1-2)

```
1. Tách BIDataCharts → từng component nhỏ:
   - ChartCard wrapper
   - RevenueLineChart
   - BookingsBarChart
   - KPI mini components

2. Tạo EmptyState component:
   - 4 KPI cards với mock data
   - 4 suggested prompts

3. Tách chip section → CapabilityDrawer:
   - Group chips theo category
   - Collapsible groups
   - Max 5 visible chips + "Xem thêm"
```

### Phase 2: UX Improvement (Day 3-4)

```
4. Implement MessageDispatcher:
   - Parse response data
   - Route to correct renderers
   - Separate text, charts, actions

5. Implement FollowUpChips:
   - Context-aware after each response
   - Dựa vào query_type để suggest

6. ChartCard với expand:
   - Compact mode (180px) default
   - Expand modal với full chart
```

### Phase 3: Polish (Day 5-6)

```
7. Add animations:
   - Smooth chip transitions
   - Chart card expand/collapse
   - Message list scroll behavior

8. Empty state refinement:
   - Real-time KPI from API
   - Dynamic suggested prompts

9. QuickActionBar:
   - Show/hide based on context
   - Confirmation flow
```

### Phase 4: Scalability (Day 7+)

```
10. Capability Registry:
    - JSON-based config
    - Dynamic component loading
    - Tab system for multiple agents

11. Performance optimization:
    - Virtualized message list
    - Lazy load chart components
    - Memoize expensive renders
```

## 9. Key UX Principles Applied

| Principle               | How We Apply                                              |
| ----------------------- | --------------------------------------------------------- |
| Progressive Disclosure  | 4 chips first → "Xem thêm" panel → full capability drawer |
| Context Continuity      | Chips change based on last query type                     |
| Cognitive Load          | ≤5 suggestions at any time, grouped by category           |
| Visual Hierarchy        | Text > Charts > Insights > Actions (in that order)        |
| Error Prevention        | Action chips only show when intent is confirmed           |
| Recognition over Recall | Capability drawer shows ALL options, but organized        |
| Aesthetic Integrity     | Consistent card design, spacing, typography               |
| Flexibility-Efficiency  | Both chip click AND free text input always available      |

## 10. Before/After Comparison

| Aspect               | Before                   | After                                            |
| -------------------- | ------------------------ | ------------------------------------------------ |
| Chips hiển thị       | 14 cùng lúc              | 4 + drawer                                       |
| Empty state          | Không có                 | 4 KPI cards + 4 prompts                          |
| Chart size           | 120-160px                | 180px (expandable to full)                       |
| Information grouping | Không                    | 4 capability groups                              |
| Action chips         | Trộn với analysis        | Quick action bar, context-aware                  |
| Scalability          | Không thể mở rộng        | Registry pattern, tab system                     |
| Loading state        | 1 skeleton type          | Granular: card/chart/text skeleton               |
| Message structure    | Content + chart 1 bubble | Separated: text → charts → insights → follow-ups |

---

**Kết luận:** Thiết kế lại này biến BI Chatbox từ một dashboard-button-collection thành một **Enterprise AI Assistant** thực thụ, với UX lấy cảm hứng từ ChatGPT/Claude nhưng được tối ưu cho admin hotel với dữ liệu BI phức tạp. Architecture mới cho phép scale lên 10+ agents mà không cần redesign.
