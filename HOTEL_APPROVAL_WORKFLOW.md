# Hotel Approval Workflow

## 🔄 Quy trình phê duyệt khách sạn

### **CÓ, Author tạo hotel CẦN admin chấp nhận!**

## Workflow chi tiết:

```
1. Author tạo hotel
   ↓
2. Hotel được lưu với status = "PENDING"
   ↓
3. Admin vào /hotel-approvals để xem danh sách
   ↓
4. Admin có thể:
   - ✅ Approve → status = "APPROVED" → Hiển thị công khai
   - ❌ Reject → status = "REJECTED" → Không hiển thị + có lý do
   ↓
5. Author xem status trong /my-hotels
```

## 📊 Hotel Status

| Status | Ý nghĩa | Ai thấy được? |
|--------|---------|---------------|
| `DRAFT` | Nháp, chưa gửi | Chỉ author |
| `PENDING` | Chờ duyệt | Chỉ author & admin |
| `APPROVED` | Đã duyệt | **Công khai cho tất cả** |
| `REJECTED` | Bị từ chối | Chỉ author (có lý do) |
| `SUSPENDED` | Tạm ngưng | Chỉ author & admin |

## 🎯 Files đã tạo/sửa

### Admin App
- ✅ [actions/hotelAdminActions.ts](d:\it\_1doan_totnghiep\stazy\apps\admin\src\actions\hotelAdminActions.ts) - Actions để approve/reject
- ✅ [app/hotel-approvals/page.tsx](d:\it\_1doan_totnghiep\stazy\apps\admin\src\app\hotel-approvals\page.tsx) - Trang admin duyệt hotel
- ✅ [components/AppSidebar.tsx](d:\it\_1doan_totnghiep\stazy\apps\admin\src\components\AppSidebar.tsx) - Thêm menu "Hotel Approvals"

### Client App  
- ✅ [components/CreateHotelForm.tsx](d:\it\_1doan_totnghiep\stazy\apps\client\src\components\CreateHotelForm.tsx) - Đã có `status: "PENDING"`
- ✅ [components/HotelStatusBadge.tsx](d:\it\_1doan_totnghiep\stazy\apps\client\src\components\HotelStatusBadge.tsx) - Component hiển thị status

## 💡 Cách sử dụng

### Admin - Duyệt khách sạn

1. Vào **Admin Dashboard** → Menu **"Hotel Approvals"**
2. Xem danh sách hotels đang chờ (PENDING)
3. Click:
   - ✅ **"Duyệt"** - Approve hotel
   - ❌ **"Từ chối"** - Reject + nhập lý do
   - 👁️ **"Xem"** - Xem chi tiết hotel

### Author - Xem trạng thái

1. Vào **/my-hotels**
2. Xem badge status của từng hotel:
   - ⏳ **Chờ duyệt** - Đang chờ admin
   - ✅ **Đã duyệt** - Hotel đang live
   - ❌ **Bị từ chối** - Có lý do từ chối

### User - Xem hotel công khai

- Chỉ thấy hotels có `status = "APPROVED"`
- Filtering tự động trong search/list API

## 🔧 Cần implement thêm

### 1. Update My Hotels Page

Trong `/my-hotels`, thêm HotelStatusBadge:

```tsx
import { HotelStatusBadge } from "@/components/HotelStatusBadge";

// Trong table cell:
<TableCell>
  <HotelStatusBadge 
    status={hotel.status} 
    rejectionReason={hotel.rejectionReason}
  />
</TableCell>
```

### 2. Filter hotels công khai

Trong API search/list hotels, chỉ lấy APPROVED:

```typescript
const hotels = await prisma.hotel.findMany({
  where: {
    status: "APPROVED", // Chỉ lấy hotels đã duyệt
    // ...other filters
  }
});
```

### 3. Notification khi được duyệt

```typescript
// Sau khi approve, gửi notification cho author
await sendNotification({
  userId: hotel.authorId,
  type: "HOTEL_APPROVED",
  message: `Khách sạn "${hotel.title}" đã được duyệt!`
});
```

### 4. Re-submit sau khi bị reject

Cho phép author sửa và submit lại:

```typescript
// Trong edit hotel form
if (hotel.status === "REJECTED") {
  // Cho phép edit và submit lại
  // Set status về "PENDING"
}
```

## 📝 Business Rules

1. **Author không thể tự approve** - Chỉ admin mới approve
2. **Hotel PENDING không hiển thị công khai** - Tránh spam
3. **Reject phải có lý do** - Giúp author biết sửa gì
4. **Có thể re-submit** - Sau khi bị reject, author có thể sửa và gửi lại
5. **Admin có thể suspend** - Nếu vi phạm sau khi approved

## ⚠️ Lưu ý

- Đảm bảo Product Service API có filter `status: "APPROVED"` khi public search
- Admin cần có role checking để tránh unauthorized access
- Có thể thêm email notification khi hotel được approve/reject
- Consider thêm field `reviewNotes` cho admin ghi chú nội bộ
