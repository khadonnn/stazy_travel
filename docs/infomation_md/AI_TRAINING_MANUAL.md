# 🤖 AI Training Manual Control

## Tổng Quan

Admin có thể chủ động train lại AI Recommendation Model bằng nút "Train Now" trong **Dashboard > TodoList**.

## Vị Trí

Dashboard Homepage → TodoList Card → AI Recommendation Model Section

## Tính Năng

### 1. **Hiển thị Trạng Thái**

- Total interactions: Tổng số tương tác (VIEW, LIKE, BOOK, RATING)
- Last trained: Thời gian train gần nhất
- Metrics: RMSE, Precision@5, Recall@5 (nếu có)

### 2. **Nút Train Now**

- **Khi nào dùng:**
  - Sau khi có nhiều người dùng mới đăng ký
  - Sau khi thêm nhiều khách sạn mới
  - Sau campaign marketing để cập nhật preferences
  - Không muốn đợi cronjob (02:00 hàng ngày)

- **Điều kiện:**
  - Cần ít nhất 10 interactions trong DB
  - Nếu không đủ → Hiển thị warning

- **Thời gian:**
  - Khoảng 5-30 giây tuỳ lượng dữ liệu
  - Loading spinner hiển thị trong quá trình train

### 3. **Kết Quả**

- ✅ **Thành công:** Toast notification với duration và số interactions
- ❌ **Thất bại:** Toast error với thông báo lỗi

## API Endpoints

### `POST /admin/train-ai`

**Headers:** `Authorization: Bearer <token>`

**Response Success:**

```json
{
  "success": true,
  "message": "Train model thành công! (12.5s)",
  "data": {
    "duration": "12.5",
    "totalInteractions": 250,
    "output": "✅ Train xong Model SVD."
  }
}
```

**Response Error:**

```json
{
  "success": false,
  "message": "Chưa đủ dữ liệu để train (cần ít nhất 10 interactions)",
  "data": { "totalInteractions": 5 }
}
```

### `GET /admin/training-status`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "totalInteractions": 250,
  "recentInteractions": 45,
  "lastTrained": "2026-01-22T10:30:00.000Z",
  "metrics": {
    "rmse": 0.85,
    "precisionAt5": 0.72,
    "recallAt5": 0.68
  }
}
```

## Luồng Hoạt Động

```
1. Admin click "Train Now"
   ↓
2. Kiểm tra token authentication
   ↓
3. API kiểm tra số lượng interactions
   ↓ (≥10)
4. Chạy `python train_real.py`
   ↓
5. Lưu model mới (.pkl)
   ↓
6. Cập nhật SystemMetric trong DB
   ↓
7. Toast thông báo thành công
   ↓
8. Refresh status hiển thị metrics mới
```

## So Sánh: Manual vs Cronjob

| Tính năng     | Manual (TodoList) | Cronjob (Auto)        |
| ------------- | ----------------- | --------------------- |
| **Thời gian** | Bất cứ lúc nào    | 02:00 mỗi ngày        |
| **Điều kiện** | ≥10 interactions  | ≥50 interactions/24h  |
| **Phản hồi**  | Instant toast     | Log file              |
| **Dùng khi**  | Cần update ngay   | Vận hành thường xuyên |

## Lưu Ý

- ⚠️ Không train quá thường xuyên (< 1 giờ) → Lãng phí tài nguyên
- ⚠️ Training block server 5-30s → Tránh train trong giờ cao điểm
- ✅ Best practice: Train sau khi có ≥50 interactions mới
- ✅ Cronjob tự động chạy hàng đêm, chỉ dùng manual khi thật sự cần

## Troubleshooting

**Lỗi: "Chưa đủ dữ liệu"**

- Kiểm tra: `SELECT COUNT(*) FROM interactions;`
- Tạo mock data: Chạy script `generate_mock_interactions.py`

**Lỗi: "Training failed"**

- Check Python environment: `python train_real.py` manual
- Check logs: Xem output trong API response
- Verify path: `SEARCH_SERVICE_PATH` trong .env

**Training quá lâu (>2 phút)**

- Quá nhiều data → Tối ưu script
- Server yếu → Tăng timeout hoặc dùng background job
