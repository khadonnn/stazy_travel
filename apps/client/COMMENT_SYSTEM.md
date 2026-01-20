# Hệ thống Bình luận/Đánh giá Khách sạn

## Tổng quan

Hệ thống cho phép người dùng:

- ✅ Xem danh sách đánh giá của khách sạn
- ✅ Viết đánh giá mới với rating (1-5 sao)
- ✅ Tự động cập nhật danh sách sau khi gửi đánh giá
- ✅ Yêu cầu đăng nhập để viết đánh giá

## Cấu trúc Components

### 1. Server Actions (`apps/client/src/app/hotels/[slug]/actions/review.ts`)

- `getReviews(hotelId)`: Lấy danh sách reviews từ database
- `submitReview(formData)`: Tạo review mới + interaction tracking

### 2. Client Components

#### `CommentListClient.tsx`

- Component hiển thị danh sách đánh giá
- Tự động fetch dữ liệu khi mount
- Support refresh qua prop `key`

```tsx
<CommentListClient hotelId={123} key={refreshKey} />
```

#### `AddCommentForm.tsx`

- Form nhập đánh giá (rating + comment)
- Props:
  - `hotelId`: ID khách sạn
  - `userId`: ID người dùng (từ Clerk)
  - `hotelSlug`: Slug để revalidate cache
  - `onSuccess`: Callback khi gửi thành công

```tsx
<AddCommentForm
  hotelId={123}
  userId="user_xxx"
  hotelSlug="grand-hotel"
  onSuccess={() => setRefreshComments((prev) => prev + 1)}
/>
```

### 3. Tích hợp vào StayDetailPage

```tsx
const [refreshComments, setRefreshComments] = useState(0);

// Trong renderSection6()
<CommentListClient hotelId={stayData.id} key={refreshComments} />;

{
  isSignedIn && user?.id ? (
    <AddCommentForm
      hotelId={stayData.id}
      userId={user.id}
      hotelSlug={slug}
      onSuccess={() => setRefreshComments((prev) => prev + 1)}
    />
  ) : (
    <div>Vui lòng đăng nhập...</div>
  );
}
```

## Database Schema

Model `Review` trong Prisma:

```prisma
model Review {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(...)
  hotelId   Int
  hotel     Hotel    @relation(...)
  rating    Int      // 1-5 sao
  comment   String?  @db.Text
  sentiment String?  // "POSITIVE", "NEGATIVE", "NEUTRAL"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Flow hoạt động

1. **User vào trang chi tiết khách sạn**
   - `CommentListClient` tự động fetch reviews qua `getReviews()`

2. **User viết đánh giá**
   - Nhập rating (click stars) + comment
   - Click "Gửi đánh giá"
   - `submitReview()` được gọi:
     - Tạo Review trong DB
     - Tạo Interaction (type: RATING)
     - Revalidate cache của trang

3. **Sau khi gửi thành công**
   - Form được reset
   - `onSuccess()` callback trigger
   - `refreshComments` state tăng lên
   - `CommentListClient` re-fetch dữ liệu mới

## Lưu ý quan trọng

### ⚠️ Cần đăng nhập để comment

```tsx
const { isSignedIn, user } = useUser();

if (!isSignedIn || !user?.id) {
  // Hiển thị nút "Đăng nhập"
}
```

### ⚠️ Revalidation

File `review.ts` đã có logic revalidate:

```tsx
if (hotelSlug && hotelSlug !== "null") {
  revalidatePath(`/hotels/${hotelSlug}`);
}
```

### ⚠️ Validation

- Comment không được để trống
- Rating mặc định là 5 sao
- UserId phải hợp lệ

## Testing

1. **Kiểm tra hiển thị comments**:

   ```sql
   SELECT * FROM reviews WHERE "hotelId" = 1 ORDER BY "createdAt" DESC;
   ```

2. **Test thêm comment mới**:
   - Đăng nhập
   - Chọn số sao
   - Nhập nội dung
   - Gửi
   - Kiểm tra DB và UI tự động cập nhật

3. **Test không đăng nhập**:
   - Logout
   - Xem trang chi tiết
   - Nên thấy message "Vui lòng đăng nhập"

## Troubleshooting

### Không thấy comments hiển thị?

1. Kiểm tra có data trong DB không:

   ```sql
   SELECT r.*, u.name, u.avatar
   FROM reviews r
   JOIN users u ON r."userId" = u.id
   WHERE r."hotelId" = [ID];
   ```

2. Check console browser xem có lỗi fetch không

3. Verify `hotelId` được truyền đúng vào component

### Comment không tự động cập nhật?

1. Kiểm tra `onSuccess` callback có được gọi không
2. Verify `refreshComments` state có thay đổi không
3. Check `router.refresh()` có chạy không

### Lỗi "userId is required"?

1. Verify user đã đăng nhập: `console.log(user?.id)`
2. Check Clerk middleware đã cấu hình đúng chưa
