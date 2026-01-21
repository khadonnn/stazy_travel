# Badge Notifications System

## ✨ Tính năng

Badge hiển thị số lượng items chưa xử lý cho:

- **Inbox** - Tin nhắn chưa đọc
- **Author Requests** - Yêu cầu Author chưa duyệt
- **Hotel Approvals** - Hotels chờ duyệt

## 🎨 UI Behavior

### Sidebar Expanded (mở rộng)

- Badge hiển thị **bên cạnh** text menu
- Hiện số lượng đầy đủ (99+ nếu > 99)
- Animation zoom-in khi có thay đổi

### Sidebar Collapsed (thu nhỏ)

- Badge hiển thị ở **góc phải trên** của icon
- Compact format (9+ nếu > 9)
- Vẫn hiển thị đầy đủ thông tin

## 📁 Files Implementation

### Store

- ✅ [useNotificationStore.ts](d:\it_1doan_totnghiep\stazy\apps\admin\src\store\useNotificationStore.ts)
  - Quản lý 3 loại count: unreadCount, pendingAuthorRequests, pendingHotelApprovals
  - Increment/decrement methods cho từng loại

### Actions

- ✅ [statsActions.ts](d:\it_1doan_totnghiep\stazy\apps\admin\src\actions\statsActions.ts)
  - `getPendingAuthorRequestsCount()` - Count Author Requests PENDING
  - `getPendingHotelsCount()` - Count Hotels PENDING
  - `getAllPendingCounts()` - Fetch tất cả cùng lúc

### Components

- ✅ [AppSidebar.tsx](d:\it_1doan_totnghiep\stazy\apps\admin\src\components\AppSidebar.tsx)
  - Fetch initial counts khi load
  - Auto refresh mỗi 30 giây
  - Render badges cho từng menu item

### Pages

- ✅ [author-requests/page.tsx](d:\it_1doan_totnghiep\stazy\apps\admin\src\app(dashboard)\author-requests\page.tsx)
  - Update badge count khi load
- ✅ [hotel-approvals/page.tsx](d:\it_1doan_totnghiep\stazy\apps\admin\src\app\hotel-approvals\page.tsx)
  - Update badge count khi load

## 🔄 Data Flow

### Initial Load

```
1. AppSidebar mount
   ↓
2. Fetch all stats:
   - Messages từ MongoDB (API)
   - Author Requests từ PostgreSQL
   - Hotels từ PostgreSQL
   ↓
3. Update store
   ↓
4. UI renders badges
```

### Auto Refresh

```
Every 30 seconds:
   ↓
Fetch updated counts
   ↓
Update store
   ↓
Badges update automatically
```

### When Admin Takes Action

```
Admin approves/rejects
   ↓
Page calls loadData()
   ↓
Updates count in store
   ↓
Badge decrements
```

## 💻 Usage Examples

### Get current counts

```typescript
const { unreadCount, pendingAuthorRequests, pendingHotelApprovals } =
  useNotificationStore();
```

### Update counts manually

```typescript
const { setPendingAuthorRequests, decrementHotelApprovals } =
  useNotificationStore();

// Set specific count
setPendingAuthorRequests(5);

// Decrement after action
decrementHotelApprovals();
```

### Fetch fresh counts

```typescript
import { getAllPendingCounts } from "@/actions/statsActions";

const counts = await getAllPendingCounts();
// { authorRequests: 3, hotels: 5 }
```

## 🎯 Styling

### Expanded Badge

- Class: `sidebar-text-badge`
- Position: Inline with menu item
- Size: Normal (99+ max)
- Hidden when collapsed

### Collapsed Badge

- Class: `sidebar-icon-badge`
- Position: Absolute top-right of icon
- Size: Compact (9+ max)
- Shown only when collapsed

## 🔧 Configuration

### Auto-refresh interval

```typescript
// In AppSidebar.tsx
const interval = setInterval(fetchAllStats, 30000); // 30 seconds
```

### Badge limits

```typescript
// Expanded: 99+
{
  badgeCount > 99 ? "99+" : badgeCount;
}

// Collapsed: 9+
{
  badgeCount > 9 ? "9+" : badgeCount;
}
```

## 📊 API Endpoints

### Messages (MongoDB)

```
GET /messages/stats/unread
Response: { count: number }
```

### Author Requests (PostgreSQL)

```typescript
await prisma.authorRequest.count({
  where: { status: "PENDING" },
});
```

### Hotels (PostgreSQL)

```typescript
await prisma.hotel.count({
  where: { status: "PENDING" },
});
```

## ⚡ Performance

- **Initial load**: 3 API calls (parallel)
- **Auto-refresh**: Every 30s (can be adjusted)
- **State management**: Zustand (minimal re-renders)
- **Badge rendering**: Conditional (only when count > 0)

## 🐛 Troubleshooting

### Badge không hiển thị

1. Check store values: `console.log(useNotificationStore.getState())`
2. Verify API responses
3. Check CSS classes

### Badge không update sau action

1. Ensure page calls `setPending...()` after reload
2. Check if auto-refresh is running
3. Verify socket connection (for messages)

### Badge stuck ở góc sai

1. Check sidebar collapsible state
2. Verify CSS classes: `group-data-[collapsible=icon]`
3. Inspect element positioning

## 🚀 Future Enhancements

- [ ] Socket.io for real-time updates (no polling)
- [ ] Toast notifications khi có request mới
- [ ] Sound alerts
- [ ] Push notifications (PWA)
- [ ] Batch actions (approve/reject multiple)
