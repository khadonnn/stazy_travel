# 🚨 QUICK FIX: Role không đồng bộ

## Vấn đề

Bạn đã được duyệt làm Author nhưng không thấy menu "Tạo khách sạn" và không vào được `/create-hotel` hoặc `/my-hotels`.

## Nguyên nhân

Role đã được cập nhật trong **PostgreSQL** nhưng chưa đồng bộ lên **Clerk metadata**.

---

## ✅ GIẢI PHÁP 1: Dùng trang Debug (Khuyến nghị)

### Bước 1: Truy cập trang debug

Vào: **http://localhost:3002/debug-role**

### Bước 2: Kiểm tra trạng thái

- Nếu "Trạng thái đồng bộ" = ❌ Chưa đồng bộ
- Xem Role trên Clerk vs Role trong Database

### Bước 3: Nhấn nút "Đồng bộ quyền truy cập"

- Đợi 2 giây → Trang tự động reload
- Kiểm tra lại menu → Sẽ thấy "Tạo khách sạn"

---

## ✅ GIẢI PHÁP 2: Chạy Script (Cho Admin/Dev)

### Option A: Sync 1 user cụ thể

```bash
cd apps/client
pnpm sync-user-role <userId>

# Example:
pnpm sync-user-role user_2abc123xyz
```

### Option B: Sync tất cả users

```bash
cd apps/client
pnpm sync-roles
```

---

## ✅ GIẢI PHÁP 3: Logout & Login lại

1. Logout khỏi app
2. Clear cache trình duyệt (Ctrl+Shift+Delete)
3. Login lại
4. Vào `/debug-role` để kiểm tra
5. Nếu vẫn chưa sync → Dùng Giải pháp 1

---

## 🔍 Kiểm tra thủ công

### Check role trên Clerk

1. Vào: https://dashboard.clerk.com
2. Chọn application
3. Users → Tìm user của bạn
4. Xem "Public Metadata" → Phải có `"role": "AUTHOR"`

### Check role trong Database

```sql
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

---

## 🛠️ Ngăn chặn vấn đề trong tương lai

### Cho Admin: Đảm bảo sync khi approve

File: `apps/admin/src/actions/authorAdminActions.ts`

Khi approve AuthorRequest, phải có:

```typescript
// Cập nhật DB
await prisma.user.update({
  where: { id: request.userId },
  data: { role: "AUTHOR" },
});

// ✅ QUAN TRỌNG: Sync lên Clerk
await syncRoleToClerk(request.userId, "AUTHOR");
```

---

## 📞 Nếu vẫn không được

1. Check logs trong console (F12)
2. Xem network tab khi gọi API
3. Liên hệ admin với thông tin:
   - User ID
   - Email
   - Screenshot từ `/debug-role`
