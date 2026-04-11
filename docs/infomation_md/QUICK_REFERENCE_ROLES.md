# Quick Reference: Role Authorization

## 🎯 Khi nào dùng gì?

### Client Component

```tsx
import { useIsAuthor, useIsAdmin, useRole } from "@/hooks/useRole";

// ✅ Hiện/ẩn UI dựa trên role
{
  isAuthor && <CreateButton />;
}

// ✅ Redirect trong useEffect
useEffect(() => {
  if (!isAuthor) router.push("/profile?error=require_author");
}, [isAuthor]);
```

### Server Component

```tsx
import { requireAuthor } from "@/lib/auth/middleware";

// ✅ Bảo vệ toàn bộ page
await requireAuthor(); // Auto redirect
```

### Server Action

```tsx
import { getUserRole } from "@/lib/auth/roles";

// ✅ Kiểm tra role trước khi thực hiện action
const role = await getUserRole();
if (role !== "AUTHOR" && role !== "ADMIN") {
  throw new Error("Unauthorized");
}
```

## 📋 Checklist khi tạo feature mới

### Feature chỉ dành cho AUTHOR:

- [ ] **Client UI**: Dùng `useIsAuthor()` để hiện button/link
- [ ] **Route Protection**: Check role trong page component
- [ ] **Server Action**: Validate role trong action
- [ ] **Menu**: Thêm vào UserSetting với conditional rendering

### Feature chỉ dành cho ADMIN:

- [ ] **Client UI**: Dùng `useIsAdmin()`
- [ ] **Route Protection**: Dùng `requireAdmin()` trong server component
- [ ] **Server Action**: Validate với `await getUserRole() === "ADMIN"`

## 🔧 Common Patterns

### Pattern 1: Protected Client Page

```tsx
"use client";
import { useIsAuthor } from "@/hooks/useRole";

export default function ProtectedPage() {
  const isAuthor = useIsAuthor();

  useEffect(() => {
    if (!isAuthor) router.push("/profile?error=require_author");
  }, [isAuthor]);

  if (!isAuthor) return null;
  return <Content />;
}
```

### Pattern 2: Protected Server Page

```tsx
import { requireAuthor } from "@/lib/auth/middleware";

export default async function ProtectedPage() {
  await requireAuthor(); // Auto redirect nếu không đủ quyền
  return <Content />;
}
```

### Pattern 3: Protected Server Action

```tsx
"use server";
import { getUserRole } from "@/lib/auth/roles";

export async function protectedAction(data: any) {
  const role = await getUserRole();

  if (role !== "AUTHOR" && role !== "ADMIN") {
    return { success: false, message: "Unauthorized" };
  }

  // Your logic
}
```

### Pattern 4: Conditional Rendering

```tsx
import { useIsAuthor, useIsAdmin } from "@/hooks/useRole";

function Menu() {
  const isAuthor = useIsAuthor();
  const isAdmin = useIsAdmin();

  return (
    <>
      <MenuItem href="/profile">Profile</MenuItem>
      {isAuthor && <MenuItem href="/create-hotel">Tạo khách sạn</MenuItem>}
      {isAdmin && <MenuItem href="/admin">Admin Panel</MenuItem>}
    </>
  );
}
```

## ⚡ Shortcuts

```bash
# Sync roles từ DB lên Clerk
pnpm --filter client sync-roles

# Check role của user hiện tại (trong browser console)
console.log(window.Clerk?.user?.publicMetadata?.role)
```

## 🐛 Troubleshooting

### User không thấy menu "Tạo khách sạn"

1. Check `user.publicMetadata.role` trong Clerk Dashboard
2. Check `User.role` trong database
3. Chạy sync: `pnpm --filter client sync-roles`

### Role không sync sau khi admin approve

- Kiểm tra `authorAdminActions.ts` có gọi `syncRoleToClerk()` không
- Check Clerk API key có đúng không
- Xem logs có error không

### Page không redirect khi user không có quyền

- Check xem có dùng `requireAuthor()` hoặc `useIsAuthor()` chưa
- Đảm bảo `useEffect` dependency array đầy đủ
- Kiểm tra Next.js cache (clear cache: Ctrl+Shift+R)

## 📚 Files quan trọng

| File                     | Mục đích                |
| ------------------------ | ----------------------- |
| `lib/auth/roles.ts`      | Core role utilities     |
| `lib/auth/middleware.ts` | Server-side protection  |
| `hooks/useRole.ts`       | Client hooks            |
| `lib/auth/README.md`     | Documentation đầy đủ    |
| `ROLE_AUTHORIZATION.md`  | Tổng kết implementation |
