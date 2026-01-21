# Role-Based Authorization System

## Tổng quan

Hệ thống quản lý role của user qua 2 nơi:

1. **Clerk** - Lưu trong `publicMetadata.role` (để kiểm tra nhanh ở client/middleware)
2. **PostgreSQL** - Lưu trong bảng `User.role` (source of truth chính)

## Roles

- `USER` - Người dùng thông thường
- `AUTHOR` - Người có quyền tạo khách sạn (sau khi được admin approve)
- `ADMIN` - Quản trị viên

## Flow chuyển từ USER → AUTHOR

### 1. User gửi yêu cầu

```typescript
import { submitAuthorRequest } from "@/actions/authorActions";

await submitAuthorRequest({
  businessName: "ABC Hotel",
  businessType: "COMPANY",
  phone: "0123456789",
  email: "abc@hotel.com",
  address: "123 ABC Street",
  identityCard: "123456789",
  identityImages: ["url1", "url2"],
  reason: "Tôi muốn đăng khách sạn của mình",
});
```

### 2. Admin approve yêu cầu

Khi admin approve trong admin dashboard:

- Cập nhật `AuthorRequest.status = APPROVED`
- Cập nhật `User.role = AUTHOR` trong PostgreSQL
- **Đồng bộ lên Clerk**: `publicMetadata.role = "AUTHOR"`

### 3. User có thể tạo khách sạn

Sau khi được approve, user có thể:

- Truy cập `/create-hotel`
- Thấy menu "Tạo khách sạn" trong UserSetting

## Sử dụng trong Code

### Client Component (React hooks)

```typescript
import { useIsAuthor, useIsAdmin, useRole } from "@/hooks/useRole";

function MyComponent() {
  const isAuthor = useIsAuthor(); // true nếu AUTHOR hoặc ADMIN
  const isAdmin = useIsAdmin();   // true nếu ADMIN
  const role = useRole();         // "USER" | "AUTHOR" | "ADMIN"

  return (
    <>
      {isAuthor && <CreateHotelButton />}
      {isAdmin && <AdminPanel />}
    </>
  );
}
```

### Server Component / Server Action

```typescript
import { requireAuthor, requireAdmin } from "@/lib/auth/middleware";
import { getUserRole } from "@/lib/auth/roles";

// Yêu cầu Author
export default async function CreateHotelPage() {
  await requireAuthor(); // Redirect nếu không phải Author/Admin

  return <CreateHotelForm />;
}

// Kiểm tra role không redirect
export async function myAction() {
  const role = await getUserRole();

  if (role === "ADMIN") {
    // Admin logic
  }
}

// Yêu cầu Admin
export async function adminAction() {
  await requireAdmin(); // Redirect nếu không phải Admin

  // Admin logic here
}
```

### Routes được bảo vệ

Các routes yêu cầu AUTHOR role:

- `/create-hotel` - Tạo khách sạn mới
- `/my-hotels` - Quản lý khách sạn của mình
- (Thêm các routes khác khi cần)

## Đồng bộ Role

### Khi nào cần đồng bộ?

**Tự động đồng bộ:**

- Khi admin approve AuthorRequest → Tự động sync lên Clerk

**Thủ công (nếu cần):**

```typescript
import { syncRoleToClerk, syncRoleToPostgres } from "@/lib/auth/roles";

// Sync từ PostgreSQL lên Clerk
await syncRoleToClerk(userId, "AUTHOR");

// Sync từ Clerk xuống PostgreSQL
await syncRoleToPostgres(userId);
```

## Tại sao lưu ở cả 2 nơi?

### Clerk (publicMetadata)

✅ Kiểm tra nhanh ở client-side  
✅ Không cần query database  
✅ Có sẵn trong `useUser()` hook

### PostgreSQL

✅ Source of truth chính  
✅ Có audit trail  
✅ Liên kết với AuthorRequest  
✅ Dễ query, báo cáo

## Ví dụ thực tế

### UserSetting Component

```typescript
import { useIsAuthor } from "@/hooks/useRole";

export default function UserSetting() {
  const isAuthor = useIsAuthor();

  return (
    <DropdownMenu>
      {/* ... */}
      {isAuthor && (
        <DropdownMenuItem>
          <Link href="/create-hotel">Tạo khách sạn</Link>
        </DropdownMenuItem>
      )}
    </DropdownMenu>
  );
}
```

### Create Hotel Page

```typescript
import { useIsAuthor } from "@/hooks/useRole";

export default function CreateHotelPage() {
  const isAuthor = useIsAuthor();

  useEffect(() => {
    if (!isAuthor) {
      router.push("/profile?error=require_author");
    }
  }, [isAuthor]);

  if (!isAuthor) return null;

  return <CreateHotelForm />;
}
```

## Lưu ý quan trọng

1. **Source of Truth**: PostgreSQL là nguồn chính, Clerk là cache
2. **Clerk limitations**: publicMetadata có giới hạn 8KB
3. **Security**: Luôn validate role ở server-side, không tin client
4. **Migration**: Nếu có users cũ, cần script sync role lên Clerk

## Troubleshooting

### Role không đồng bộ

```typescript
// Chạy script sync cho tất cả users
const users = await prisma.user.findMany();
for (const user of users) {
  await syncRoleToClerk(user.id, user.role);
}
```

### User không thấy menu "Tạo khách sạn"

1. Kiểm tra `publicMetadata.role` trong Clerk Dashboard
2. Kiểm tra `User.role` trong database
3. Chạy sync nếu không khớp
