# Tổng kết: Hệ thống Role-Based Authorization

## ✅ Đã hoàn thành

### 1. Cấu trúc Role

- **3 roles**: USER, AUTHOR, ADMIN
- **Lưu ở 2 nơi**:
  - Clerk `publicMetadata.role` (cache, kiểm tra nhanh)
  - PostgreSQL `User.role` (source of truth)

### 2. Files đã tạo/sửa

#### **Client App** (`apps/client/src`)

**Utilities & Hooks:**

- ✅ `lib/auth/roles.ts` - Role utilities (getUserRole, syncRoleToClerk, etc.)
- ✅ `lib/auth/middleware.ts` - Server-side protection (requireAuthor, requireAdmin)
- ✅ `hooks/useRole.ts` - Client hooks (useIsAuthor, useIsAdmin, useRole)
- ✅ `lib/auth/README.md` - Documentation đầy đủ

**Components:**

- ✅ `components/UserSetting.tsx` - Chỉ hiện "Tạo khách sạn" cho Author

**Pages:**

- ✅ `app/create-hotel/page.tsx` - Kiểm tra role trước khi cho tạo hotel
- ✅ `app/my-hotels/page.tsx` - Kiểm tra role để xem danh sách hotel

**Actions:**

- ✅ `actions/authorActions.ts` - Import syncRoleToClerk

**Scripts:**

- ✅ `scripts/sync-roles.ts` - Script sync role cho existing users
- ✅ `middleware.example.ts` - Example Next.js middleware

#### **Admin App** (`apps/admin/src`)

- ✅ `lib/auth/roles.ts` - Admin role utilities
- ✅ `actions/authorAdminActions.ts` - Đồng bộ role lên Clerk khi approve

### 3. Flow hoạt động

```
1. User gửi AuthorRequest
   ↓
2. Admin approve request trong admin panel
   ↓
3. authorAdminActions.approveAuthorRequest():
   - Cập nhật AuthorRequest.status = APPROVED
   - Cập nhật User.role = AUTHOR trong PostgreSQL
   - Gọi syncRoleToClerk() → Clerk publicMetadata.role = "AUTHOR"
   ↓
4. User reload page
   ↓
5. useIsAuthor() hook check publicMetadata.role từ Clerk
   ↓
6. Hiện menu "Tạo khách sạn"
   ↓
7. User click vào /create-hotel
   ↓
8. Page kiểm tra isAuthor
   ↓
9. Cho phép tạo khách sạn
```

## 📋 Checklist sử dụng

### Khi deploy lần đầu:

- [ ] Chạy script sync roles cho existing users:
  ```bash
  pnpm --filter client sync-roles
  ```
  (Cần add script vào package.json)

### Khi tạo route mới cần Author:

- [ ] Client Component: Dùng `useIsAuthor()` hook
- [ ] Server Component: Dùng `requireAuthor()` middleware
- [ ] Server Action: Kiểm tra role với `getUserRole()`

### Khi admin approve AuthorRequest:

- [x] Tự động sync lên Clerk (đã implement)

## 🎯 Ví dụ sử dụng

### Client Component

```tsx
import { useIsAuthor } from "@/hooks/useRole";

function MyComponent() {
  const isAuthor = useIsAuthor();

  if (!isAuthor) {
    return <div>Bạn cần là Author để truy cập</div>;
  }

  return <AuthorContent />;
}
```

### Server Component

```tsx
import { requireAuthor } from "@/lib/auth/middleware";

export default async function CreateHotelPage() {
  await requireAuthor(); // Auto redirect nếu không phải Author

  return <CreateHotelForm />;
}
```

### Server Action

```tsx
import { getUserRole } from "@/lib/auth/roles";

export async function createHotel(data: HotelInput) {
  const role = await getUserRole();

  if (role !== "AUTHOR" && role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Create hotel logic
}
```

## ⚠️ Lưu ý quan trọng

1. **Source of Truth**: PostgreSQL là nguồn chính, Clerk là cache
2. **Security**: Luôn validate ở server-side
3. **Sync**: Khi approve AuthorRequest, tự động sync lên Clerk
4. **Migration**: Chạy sync script cho existing users

## 📝 Các routes được bảo vệ

| Route             | Role Required | Status           |
| ----------------- | ------------- | ---------------- |
| `/create-hotel`   | AUTHOR/ADMIN  | ✅ Protected     |
| `/my-hotels`      | AUTHOR/ADMIN  | ✅ Protected     |
| `/edit-hotel/:id` | AUTHOR/ADMIN  | ⚠️ Cần implement |
| `/admin/*`        | ADMIN         | ⚠️ Cần implement |

## 🔧 Còn thiếu (optional)

- [ ] Next.js Middleware protection (có example file)
- [ ] Webhook từ Clerk để sync role changes
- [ ] Admin UI để thay đổi role trực tiếp
- [ ] Logging role changes
- [ ] Rate limiting cho role-sensitive operations

## 📚 Documentation

Xem chi tiết tại: [apps/client/src/lib/auth/README.md](apps/client/src/lib/auth/README.md)
