# Hướng dẫn thực hiện kịch bản kiểm thử

---

## Kịch bản 2.4: Khách sạn tương tự (trang chi tiết)

### Điều kiện tiên quyết

- Search-service đang chạy trên cổng 8008
- File `jsons/__hotel_vectors.json` và `jsons/__homeStay.json` đã tồn tại
- Next.js client đang chạy trên cổng 3000

### Các bước thực hiện

**Bước 1: Khởi động search-service**

```bash
cd apps/search-service
uv run python main.py
```

Kiểm tra console hiển thị:

```
✅ Loaded X hotel vectors into memory.
```

**Bước 2: Kiểm tra API tương tự trực tiếp**

Mở trình duyệt hoặc dùng curl:

```bash
curl http://127.0.0.1:8008/similar/1?top_k=5
```

Nếu trả về JSON array chứa 5 khách sạn → API hoạt động.

**Bước 3: Mở trang chi tiết khách sạn**

Truy cập: `http://localhost:3000/hotels/1` (thay `1` bằng ID khách sạn bất kỳ)

**Bước 4: Quan sát kết quả**

- Cuộn xuống cuối trang chi tiết
- Kiểm tra phần "Khách sạn tương tự" hiển thị 5 khách sạn
- So sánh với khách sạn gốc: cùng loại hình? cùng phân khúc giá?

### Kết quả mong đợi

- API `/similar/1` trả về 5 objects JSON, mỗi object có `id`, `title`, `price`, `category`, `destination`
- 5 khách sạn tương tự hiển thị trên trang chi tiết
- Thời gian phản hồi API < 500ms

---

## Kịch bản 2.5: So sánh các chiến lược recommendation

### Điều kiện tiên quyết

- Search-service đang chạy trên cổng 8008
- File `jsons/__homeStay.json` và `jsons/__interactions.json` đã tồn tại (hoặc PostgreSQL có dữ liệu interactions)
- Có user đã tương tác với trên 10 khách sạn (ví dụ: `user_1` từ mock data)

### Các bước thực hiện

**Bước 1: Khởi động search-service**

```bash
cd apps/search-service
uv run python main.py
```

**Bước 2: Gọi API lần lượt với 5 chiến lược**

Mở 5 tab trình duyệt (hoặc 5 terminal chạy curl):

```bash
# Tab 1: SVD (mặc định)
curl "http://127.0.0.1:8008/recommend/user_1?strategy=svd&top_k=5" | python -m json.tool

# Tab 2: User-Based CF
curl "http://127.0.0.1:8008/recommend/user_1?strategy=user_cf&top_k=5" | python -m json.tool

# Tab 3: Item-Based CF
curl "http://127.0.0.1:8008/recommend/user_1?strategy=item_cf&top_k=5" | python -m json.tool

# Tab 4: Content-Based
curl "http://127.0.0.1:8008/recommend/user_1?strategy=content&top_k=5" | python -m json.tool

# Tab 5: Popular (baseline)
curl "http://127.0.0.1:8008/recommend/user_1?strategy=popular&top_k=5" | python -m json.tool
```

**Bước 3: Ghi nhận kết quả vào bảng so sánh**

| #   | Khách sạn | SVD | User-CF | Item-CF | Content | Popular |
| --- | --------- | --- | ------- | ------- | ------- | ------- |
| 1   | (ghi tên) | ✓/✗ | ✓/✗     | ✓/✗     | ✓/✗     | ✓/✗     |
| 2   | (ghi tên) | ✓/✗ | ✓/✗     | ✓/✗     | ✓/✗     | ✓/✗     |
| 3   | (ghi tên) | ✓/✗ | ✓/✗     | ✓/✗     | ✓/✗     | ✓/✗     |
| 4   | (ghi tên) | ✓/✗ | ✓/✗     | ✓/✗     | ✓/✗     | ✓/✗     |
| 5   | (ghi tên) | ✓/✗ | ✓/✗     | ✓/✗     | ✓/✗     | ✓/✗     |

✓ = chiến lược này gợi ý khách sạn này, ✗ = không gợi ý

**Bước 4: Kiểm tra console search-service**

Xem log terminal chạy `main.py`, tìm các dòng:

```
🎯 [Recommend] User=user_1 | Strategy=svd | Top-K=5
   #1: ... | SVD=... | Content=... | Hybrid=...
```

### Kết quả mong đợi

- 5 API calls đều trả về JSON array (không lỗi, không rỗng)
- Popular trả về khách sạn có `reviewStar × reviewCount` cao nhất (không cá nhân hóa)
- SVD, User-CF, Item-CF trả về khách sạn khác nhau giữa các user (cá nhân hóa)
- Content trả về khách sạn khớp với categories trong `UserPreference`
- Danh sách kết quả giữa 5 chiến lược KHÔNG trùng hoàn toàn
