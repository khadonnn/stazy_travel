# Kịch bản đánh giá mô hình Recommendation

## Kịch bản 3.1: Đánh giá SVD Model (Bảng 1)

### Mục tiêu

Đo lường khả năng dự đoán rating của mô hình SVD Optimized so với SVD Baseline (default params). Chỉ số đánh giá: RMSE (Root Mean Squared Error) và MAE (Mean Absolute Error).

### Điều kiện tiên quyết

- PostgreSQL chứa dữ liệu interactions và reviews thực tế (không phải mock data)
- File `recsys_model.pkl` đã được tạo bởi `train_real.py`
- Bảng `system_metrics` trong PostgreSQL đã tồn tại

### Các bước thực hiện

**Bước 1: Train mô hình SVD từ dữ liệu thật**

```bash
cd apps/search-service
uv run python train_real.py
```

Quy trình bên trong:

1. Kết nối PostgreSQL, đọc toàn bộ `interactions` table (userId, hotelId, type, rating, timestamp)
2. Đọc toàn bộ `reviews` table (userId, hotelId, rating)
3. Chuyển đổi implicit signals thành điểm số: VIEW=1, CLICK_BOOK_NOW=4, LIKE=3, BOOK=5
4. Explicit ratings từ reviews ghi đè implicit nếu cùng cặp (userId, hotelId)
5. GridSearchCV trên 24 tổ hợp siêu tham số (n_factors: [50, 100, 150], n_epochs: [20, 30], lr_all: [0.005, 0.01], reg_all: [0.02, 0.1]) với 3-fold cross-validation
6. Huấn luyện SVD Baseline (default params: n_factors=100, n_epochs=20) và SVD Optimized (best params từ GridSearch)
7. 5-fold cross-validation cho cả hai mô hình
8. Lưu model vào `jsons/recsys_model.pkl` và report vào `analytics/real_svd_training_report.json`

**Bước 2: Đánh giá trên test set**

```bash
uv run python evaluate_real.py --mode svd
```

Quy trình bên trong:

1. Load mô hình SVD đã train
2. Chia dữ liệu temporal: 80% train, 20% test (sắp xếp theo thời gian)
3. Chạy 5-fold cross-validation trên train set
4. Dự đoán rating cho tất cả (user, hotel) pairs trong test set
5. Tính RMSE và MAE so với rating thực tế
6. Baseline: dự đoán bằng global mean rating
7. Lưu kết quả vào `analytics/real_svd_evaluation_report.json` và `system_metrics` table

**Bước 3: Lấy kết quả điền vào bảng**

Đọc file `analytics/real_svd_evaluation_report.json`:

```json
{
  "cross_validation": {
    "cv_rmse": "...",
    "cv_mae": "..."
  },
  "test_results": {
    "rmse": "...",
    "mae": "..."
  },
  "baseline_results": {
    "rmse": "...",
    "mae": "..."
  },
  "improvement_pct": {
    "rmse": "...",
    "mae": "..."
  }
}
```

### Kết quả mong đợi

| Mô hình       | RMSE  | MAE   | Cải thiện RMSE | Cải thiện MAE |
| ------------- | ----- | ----- | -------------- | ------------- |
| SVD Baseline  | ~0.95 | ~0.78 | -              | -             |
| SVD Optimized | ~0.85 | ~0.68 | ~10-15%        | ~10-15%       |

**Phân tích kết quả:**

- RMSE < 1.0: Mô hình dự đoán rating sai số trung bình dưới 1 sao (thang 1-5) → chấp nhận được
- Cải thiện > 10%: GridSearch tìm được siêu tham số tốt hơn default → justify việc optimize
- Nếu RMSE > 1.2: Cần xem lại dữ liệu (quá sparse hoặc noise nhiều)

### Công thức

**RMSE (Root Mean Squared Error):**
$$RMSE = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(\hat{r}_i - r_i)^2}$$

**MAE (Mean Absolute Error):**
$$MAE = \frac{1}{n}\sum_{i=1}^{n}|\hat{r}_i - r_i|$$

**Cải thiện:**
$$\text{Improvement} = \frac{\text{Baseline} - \text{Optimized}}{\text{Baseline}} \times 100\%$$

---

## Kịch bản 3.2: Đánh giá Implicit CF - Ranking Quality (Bảng 2)

### Mục tiêu

Đo lường chất lượng xếp hạng gợi ý của User-Based CF so với Top Popular baseline. Chỉ số: Precision@5, Recall@5, NDCG@5.

### Điều kiện tiên quyết

- PostgreSQL chứa trên 100 interactions từ nhiều users khác nhau
- Có ít nhất 10 users có trên 5 interactions mỗi user
- Dữ liệu có phân bố interaction types đa dạng (VIEW, CLICK_BOOK_NOW, ADD_TO_WISHLIST, BOOK)

### Các bước thực hiện

**Bước 1: Đảm bảo dữ liệu đủ lớn**

```bash
# Kiểm tra số lượng interactions trong DB
cd apps/search-service
uv run python -c "
from sqlalchemy import create_engine, text
engine = create_engine('postgresql://admin:123456@localhost:5432/products')
with engine.connect() as conn:
    r = conn.execute(text('SELECT COUNT(*) FROM interactions'))
    print(f'Interactions: {r.scalar()}')
    r = conn.execute(text('SELECT COUNT(DISTINCT \"userId\") FROM interactions'))
    print(f'Users: {r.scalar()}')
"
```

Nếu chưa đủ dữ liệu, chạy seed hoặc dùng hệ thống thật:

```bash
cd packages/product-db
npx prisma db seed
```

**Bước 2: Chạy đánh giá Implicit CF**

```bash
cd apps/search-service
uv run python evaluate_real.py --mode implicit
```

Quy trình bên trong chi tiết:

1. **Load dữ liệu:** Đọc interactions từ PostgreSQL, chuyển implicit signals thành điểm số (VIEW=0.5, CLICK=2.0, WISHLIST=3.0, BOOK=5.0, RATE_NEG=-3.0)
2. **Temporal split:** Sắp xếp theo timestamp, chia 60% train / 20% validation / 20% test (không random, giữ nguyên thứ tự thời gian)
3. **Xây dựng ma trận user-item:** Ma trận (users × hotels) với giá trị là weighted interaction scores
4. **Tính cosine similarity:** Ma trận user-user similarity từ train set
5. **Baseline:** Top Popular Items = khách sạn có tổng weighted interaction score cao nhất trong train set
6. **Đánh giá cho mỗi user trong test set:**
   - Tìm K=5 users相似 nhất (cosine similarity cao nhất)
   - Tổng hợp weighted scores từ similar users cho các hotel chưa tương tác
   - Sắp xếp giảm dần → lấy Top 5 recommendations
   - So sánh với các hotel user thực sự tương tác trong test set
   - Tính Precision@5, Recall@5, NDCG@5
7. **Tính trung bình** Precision, Recall, NDCG trên tất cả evaluated users
8. **Lưu kết quả** vào `analytics/real_implicit_cf_report.json` và `system_metrics` table

**Bước 3: Lấy kết quả điền vào bảng**

Đọc file `analytics/real_implicit_cf_report.json`:

```json
{
  "cf_results": {
    "precision_at_k": "...",
    "recall_at_k": "...",
    "ndcg_at_k": "..."
  },
  "baseline_results": {
    "precision_at_k": "...",
    "recall_at_k": "...",
    "ndcg_at_k": "..."
  },
  "improvement_pct": {
    "precision": "...",
    "recall": "...",
    "ndcg": "..."
  }
}
```

### Kết quả mong đợi

| Mô hình                | Precision@5 | Recall@5   | NDCG@5     |
| ---------------------- | ----------- | ---------- | ---------- |
| Top Popular (Baseline) | ~0.05-0.10  | ~0.03-0.08 | ~0.05-0.10 |
| User-Based CF          | ~0.08-0.15  | ~0.06-0.12 | ~0.08-0.15 |
| Cải thiện              | ~30-50%     | ~30-50%    | ~30-50%    |

**Phân tích kết quả:**

- Precision@5 thấp (5-15%) là bình thường với implicit data vì ground truth sparse
- Nếu Precision CF < Popular: Dữ liệu quá ít users hoặc quá sparse → CF không hiệu quả, cần fallback Popular
- Nếu NDCG CF > Popular: CF xếp đúng item liên quan lên cao hơn Popular → chứng tỏ cá nhân hóa có tác dụng
- Nếu Cải thiện < 0%: CF worse than Popular → có thể do cold-start users quá nhiều hoặc data noise

### Công thức

**Precision@K:**
$$\text{Precision@K} = \frac{|\{\text{Recommended items trong Top-K}\} \cap \{\text{Relevant items}\}|}{K}$$

**Recall@K:**
$$\text{Recall@K} = \frac{|\{\text{Recommended items trong Top-K}\} \cap \{\text{Relevant items}\}|}{|\{\text{Relevant items}\}|}$$

**NDCG@K (Normalized Discounted Cumulative Gain):**
$$\text{NDCG@K} = \frac{\text{DCG@K}}{\text{IDCG@K}}, \quad \text{DCG@K} = \sum_{i=1}^{K}\frac{\text{rel}_i}{\log_2(i+1)}$$

---

## Kịch bản 3.3: Đánh giá Explicit CF - Rating Prediction (Bảng 3)

### Mục tiêu

Đo lường khả năng dự đoán rating (1-5 sao) của User-Based CF với Pearson Correlation so với User Mean baseline. Chỉ số: RMSE và MAE.

### Điều kiện tiên quyết

- PostgreSQL chứa reviews với explicit ratings (1-5 sao)
- Có ít nhất 50 reviews từ trên 10 users khác nhau
- Mỗi user có ít nhất 2 reviews (để có thể tính mean-centering)

### Các bước thực hiện

**Bước 1: Kiểm tra dữ liệu reviews**

```bash
cd apps/search-service
uv run python -c "
from sqlalchemy import create_engine, text
engine = create_engine('postgresql://admin:123456@localhost:5432/products')
with engine.connect() as conn:
    r = conn.execute(text('SELECT COUNT(*) FROM reviews WHERE rating IS NOT NULL'))
    print(f'Reviews: {r.scalar()}')
    r = conn.execute(text('SELECT COUNT(DISTINCT \"userId\") FROM reviews'))
    print(f'Users with reviews: {r.scalar()}')
    r = conn.execute(text('SELECT rating, COUNT(*) FROM reviews GROUP BY rating ORDER BY rating'))
    for row in r: print(f'  {row[0]}★: {row[1]}')
"
```

**Bước 2: Chạy đánh giá Explicit CF**

```bash
cd apps/search-service
uv run python evaluate_real.py --mode explicit
```

Quy trình bên trong chi tiết:

1. **Load dữ liệu:** Đọc reviews từ PostgreSQL (userId, hotelId, rating, createdAt)
2. **Temporal split:** Sắp xếp theo createdAt, chia 60% train / 20% validation / 20% test
3. **Xây dựng ma trận rating:** Ma trận (users × hotels) với giá trị là explicit rating (1-5)
4. **Mean-centering:** Với mỗi user, trừ đi mean rating của user đó → loại bỏ bias cá nhân
5. **Tính Pearson Correlation:** Dùng cosine similarity trên ma trận đã mean-centering
6. **Baseline:** User Mean = dự đoán bằng trung bình rating của mỗi user
7. **Đánh giá cho mỗi (user, hotel) pair trong test set:**
   - Tìm K=10 users相似 nhất (Pearson correlation cao nhất)
   - Dự đoán: $\hat{r}_{u,i} = \bar{r}_u + \frac{\sum_{v \in N(u)} \text{sim}(u,v) \cdot (r_{v,i} - \bar{r}_v)}{\sum_{v \in N(u)} |\text{sim}(u,v)|}$
   - Clamp predicted rating trong khoảng [1, 5]
   - Tính RMSE và MAE so với rating thực tế
8. **Lưu kết quả** vào `analytics/real_explicit_cf_report.json` và `system_metrics` table

**Bước 3: Lấy kết quả điền vào bảng**

Đọc file `analytics/real_explicit_cf_report.json`:

```json
{
  "cf_results": {
    "rmse": "...",
    "mae": "..."
  },
  "baseline_results": {
    "rmse": "...",
    "mae": "..."
  },
  "improvement_pct": {
    "rmse": "...",
    "mae": "..."
  }
}
```

### Kết quả mong đợi

| Mô hình                 | RMSE    | MAE     |
| ----------------------- | ------- | ------- |
| User Mean (Baseline)    | ~1.10   | ~0.85   |
| User-Based CF (Pearson) | ~0.95   | ~0.72   |
| Cải thiện               | ~10-15% | ~10-15% |

**Phân tích kết quả:**

- RMSE < 1.0: CF dự đoán rating sai số dưới 1 sao → tốt cho implicit-to-explicit conversion
- Nếu RMSE CF > Baseline: Pearson correlation không hoạt động tốt → có thể do dữ liệu quá sparse (ít users có nhiều ratings chung)
- Nếu MAE < 0.8: Sai số tuyệt đối trung bình dưới 0.8 sao → chấp nhận được cho recommendation display
- Nếu Cải thiện < 0%: CF worse than mean → nên dùng SVD (hybrid approach) thay vì pure CF

### Công thức

**Pearson Correlation (Mean-Centered Cosine):**
$$\text{sim}(u,v) = \frac{\sum_{i \in I_{uv}}(r_{u,i} - \bar{r}_u)(r_{v,i} - \bar{r}_v)}{\sqrt{\sum_{i \in I_{uv}}(r_{u,i} - \bar{r}_u)^2} \cdot \sqrt{\sum_{i \in I_{uv}}(r_{v,i} - \bar{r}_v)^2}}$$

**Rating Prediction:**
$$\hat{r}_{u,i} = \bar{r}_u + \frac{\sum_{v \in N_K(u)} \text{sim}(u,v) \cdot (r_{v,i} - \bar{r}_v)}{\sum_{v \in N_K(u)} |\text{sim}(u,v)|}$$

---

## Cách chạy tất cả đánh giá

```bash
# Cách 1: Chạy tất cả cùng lúc
cd apps/search-service
uv run python evaluate_real.py --mode all

# Cách 2: Chạy riêng từng phần
uv run python evaluate_real.py --mode svd        # Bảng 1
uv run python evaluate_real.py --mode implicit   # Bảng 2
uv run python evaluate_real.py --mode explicit   # Bảng 3

# Kết quả lưu tại:
# apps/search-service/analytics/real_svd_evaluation_report.json     → Bảng 1
# apps/search-service/analytics/real_implicit_cf_report.json        → Bảng 2
# apps/search-service/analytics/real_explicit_cf_report.json        → Bảng 3
# apps/search-service/analytics/real_evaluation_summary.json        → Tổng hợp
# PostgreSQL system_metrics table                                     → Admin dashboard
```
