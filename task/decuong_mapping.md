# ĐỐI CHIẾU ĐỀ CƯƠNG VÀ TRIỂN KHAI THỰC TẾ

> File này ghi lại sự tương ứng giữa từng mục trong đề cương (`task/decuong.md`) và code thực tế trong source code. Dùng để kiểm chứng khi bảo vệ đồ án.

---

## 1. MỤC TIÊU NGHIÊN CỨU (Mục 1.1)

### 1.1. Hệ thống gợi ý lai (Hybrid Recommender System)

| Đề cương                              | Code thực tế                                                               | File                                          | Hàm/Lớp                                                  |
| ------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| Content-based Filtering (cold-start)  | Content-based recommendation                                               | `src/recommend.py`                            | `content_recommend()`                                    |
| Collaborative Filtering: Memory-based | User-based CF + Item-based CF                                              | `src/recommend.py`                            | `user_based_cf_recommend()`, `item_based_cf_recommend()` |
| Collaborative Filtering: Model-based  | SVD (Singular Value Decomposition)                                         | `src/recommend.py` + `train_svd.py`           | `svd_recommend()`, `GridSearchCV(SVD, ...)`              |
| Phân tách user cũ/user mới            | SVD check: `algo.trainset.to_inner_uid(user_id)`                           | `src/recommend.py`                            | `svd_recommend()` dòng 168                               |
| Cache recommendation                  | Offline: `__recommendations.json`, Online: PostgreSQL Recommendation table | `generate_recommendations.py` + Prisma schema | `main()`, `model Recommendation`                         |
| Hybrid SVD + Content (60/40)          | `SVD_WEIGHT = 0.6`, `CONTENT_WEIGHT = 0.4`                                 | `src/recommend.py`                            | `svd_recommend()` dòng 195                               |

**Chi tiết 5 chiến lược:**

| Strategy        | Hàm                         | Thuật toán                 | Trường hợp            |
| --------------- | --------------------------- | -------------------------- | --------------------- |
| `svd` (default) | `svd_recommend()`           | SVD + Content hybrid 60/40 | User cũ, production   |
| `user_cf`       | `user_based_cf_recommend()` | Cosine similarity, K=10    | So sánh, fallback     |
| `item_cf`       | `item_based_cf_recommend()` | Item-item cosine           | "Khách sạn tương tự"  |
| `content`       | `content_recommend()`       | Category/tag matching      | User mới (onboarding) |
| `popular`       | `popular_recommend()`       | reviewStar × reviewCount   | Fallback cuối cùng    |

### 1.2. Phản hồi ngầm định (Implicit feedback)

| Đề cương            | Code                | File                                                           | Trọng số |
| ------------------- | ------------------- | -------------------------------------------------------------- | -------- |
| **CLICK_BOOK_NOW**  | `"CLICK_BOOK_NOW"`  | `evaluate.py` + `generate_recommendations.py` + `recommend.py` | 2.0      |
| **ADD_TO_WISHLIST** | `"ADD_TO_WISHLIST"` | `evaluate.py` + `generate_recommendations.py` + `recommend.py` | 3.0      |
| **BOOK**            | `"BOOK"`            | `evaluate.py` + `generate_recommendations.py` + `recommend.py` | 5.0      |

**Lưu ý:** Đề cương gốc ghi VIEW, LIKE, BOOK, CLICK_BOOK_NOW, CANCEL, SEARCH_QUERY. Đã cập nhật thành 3 loại trên vì:

- VIEW/SEARCH_QUERY: tín hiệu quá yếu, làm loãng matrix
- LIKE: trùng chức năng với ADD_TO_WISHLIST
- CANCEL: chưa có data sinh ra từ `generate_mock_interactions.py`

### 1.3. Phản hồi tường minh (Explicit feedback)

| Đề cương       | Code                                            | File                                     | Giá trị         |
| -------------- | ----------------------------------------------- | ---------------------------------------- | --------------- |
| RATING (1-5⭐) | `"rating": compute_rating(...)`                 | `generate_mock_interactions.py` dòng 175 | 1-5 integer     |
| REVIEW/COMMENT | `"comment": generate_dynamic_review(sentiment)` | `generate_mock_interactions.py` dòng 193 | Vietnamese text |

**Explicit feedback được dùng trong:**

- `evaluate.py` → System B: RMSE/MAE evaluation (Pearson correlation CF)
- `recommend.py` → `build_user_profile()`: ghi đè implicit weight nếu user đã review
- `recommend.py` → `_build_user_item_matrix()`: explicit rating override implicit

### 1.4. Chỉ số đánh giá

| Đề cương    | Code               | File                   | Tham số                                          | Giá trị thực tế |
| ----------- | ------------------ | ---------------------- | ------------------------------------------------ | --------------- |
| Precision@K | `cf_avg_precision` | `evaluate.py` dòng 321 | K = `K_RECOMMENDATIONS = 5`                      | 0.0350          |
| Recall@K    | `cf_avg_recall`    | `evaluate.py` dòng 322 | K = `K_RECOMMENDATIONS = 5`                      | 0.0203          |
| RMSE        | `rmse`             | `evaluate.py` dòng 561 | `np.sqrt(np.mean((predictions - actuals) ** 2))` | 1.2453          |

**Metric bổ sung (code có, đề cương không ghi):**

| Metric | Code                                                          | Giá trị | Mục đích                    |
| ------ | ------------------------------------------------------------- | ------- | --------------------------- |
| NDCG@5 | `compute_ndcg()` evaluate.py dòng 100                         | 0.0371  | Đo chất lượng ranking       |
| MAE    | `np.mean(np.abs(predictions - actuals))` evaluate.py dòng 562 | 1.0095  | Đo lỗi trung bình tuyệt đối |

**Tham số cấu hình evaluate.py:**

```python
# evaluate.py dòng 38-40
K_NEIGHBORS_IMPLICIT = 5    # Số hàng xóm cho implicit CF
K_NEIGHBORS_EXPLICIT = 10   # Số hàng xóm cho explicit CF (nhiều hơn vì sparse)
K_RECOMMENDATIONS = 5        # Top-K gợi ý
```

---

## 2. KIẾN TRÚC (Mục 2)

### 2.1. Search Service (Mục 2.2)

| Đề cương                     | Code                                             | File               |
| ---------------------------- | ------------------------------------------------ | ------------------ |
| SmartSearch + Recommendation | FastAPI app                                      | `main.py`          |
| Semantic search              | Sentence-Transformers + pgvector                 | `search.py`        |
| Image search                 | CLIP embeddings                                  | `search.py`        |
| Chatbot agent                | Groq API (Llama-3.3-70B) + Intent classification | `agent.py`         |
| Recommendation               | Multi-strategy dispatcher                        | `src/recommend.py` |

### 2.2. Recommendation & Analytics Core (Mục 2.4)

| Đề cương                        | Code                                  | File                            | Chi tiết                                                                    |
| ------------------------------- | ------------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| Cold-start → base-content       | Content-based cho user mới            | `src/recommend.py`              | `content_recommend()`: dùng `get_user_interested_categories(user_id)`       |
| Phân tách user cũ/user mới      | SVD check                             | `src/recommend.py`              | `svd_recommend()` dòng 168: `try: algo.trainset.to_inner_uid(user_id)`      |
| CF + SVD                        | User-CF + Item-CF + SVD               | `src/recommend.py`              | `user_based_cf_recommend()`, `item_based_cf_recommend()`, `svd_recommend()` |
| Cache recommendation            | `__recommendations.json` + PostgreSQL | `generate_recommendations.py`   | Offline batch generation                                                    |
| Thu thập Interaction            | `interactions.append({...})`          | `generate_mock_interactions.py` | 8.132 records → `__interactions.json`                                       |
| Tổng hợp DailyStat              | `daily_agg[date_key]`                 | `generate_mock_interactions.py` | 365 ngày → `__daily_stats.json`                                             |
| Lưu SystemMetric                | `historical_metrics.append({...})`    | `generate_mock_interactions.py` | 30 records → `__metrics.json`                                               |
| Dashboard RMSE/Precision/Recall | Admin dashboard                       | Frontend admin app              | Đọc từ `__metrics.json`                                                     |

**Metric giả lập trong `__metrics.json`:**

```python
# generate_mock_interactions.py dòng 268
metric_entry = {
    "rmse": round(base_rmse, 4),                         # 0.80-0.95
    "precisionAt5": round(70 + random.uniform(-5, 5), 2), # ~70%
    "recallAt5": round(60 + random.uniform(-5, 5), 2),    # ~60%
    "algorithm": "SVD",
    "datasetSize": len(interactions),
    "executionTimeMs": random.randint(100, 500),
    "tuningParams": generate_tuning_params(base_rmse),    # Grid search params
}
```

### 2.3. Dữ liệu giả lập (Synthetic Data)

| Đề cương                    | Code                                         | File                                     | Output                                                  |
| --------------------------- | -------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| Dữ liệu giả lập (mock data) | Controlled synthetic data                    | `generate_mock_interactions.py`          | `__interactions.json` (8.132), `__reviews.json` (1.586) |
| User clustering             | Budget / Mid-range / Luxury                  | `generate_mock_interactions.py` dòng 105 | 3 phân khúc, preference matrix 3×3                      |
| Temporal split              | 60% train / 20% val / 20% test               | `evaluate.py` dòng 62                    | `temporal_split()`                                      |
| Baseline comparison         | Top Popular (implicit), User Mean (explicit) | `evaluate.py`                            | So sánh CF vs Baseline                                  |

---

## 3. THAY ĐỔI SO VỚI ĐỀ CƯƠNG GỐC

| Mục               | Đề cương gốc                                           | Đã sửa thành                              | Lý do                                                        |
| ----------------- | ------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| Implicit feedback | VIEW, LIKE, BOOK, CLICK_BOOK_NOW, CANCEL, SEARCH_QUERY | **CLICK_BOOK_NOW, ADD_TO_WISHLIST, BOOK** | Khớp với dữ liệu sinh ra bởi `generate_mock_interactions.py` |
| Đánh giá          | Precision@K, Recall@K, RMSE                            | Giữ nguyên + bổ sung NDCG@5, MAE          | Code có đầy đủ metric                                        |

---

## 4. CÂU HỎI HỘI ĐỒNG CÓ THỂ HỎI

**Q: Tại sao chỉ dùng 3 implicit signals mà không dùng VIEW/LIKE/CANCEL?**
A: VIEW quá phổ biến (ai cũng xem mọi thứ) sẽ làm loãng matrix. LIKE trùng chức năng với ADD_TO_WISHLIST. CANCEL chưa có dữ liệu sinh ra. 3 loại CLICK_BOOK_NOW → ADD_TO_WISHLIST → BOOK tạo thành conversion funnel rõ ràng, phù hợp với nghiên cứu CF.

**Q: Tại sao Precision@5 chỉ có 3.5%?**
A: Ma trận rất thưa (90.9%), mỗi user chỉ tương tác ~40/255 khách sạn. Khi chia train/test, tập test chỉ chứa một phần nhỏ item. CF phải dự đoán đúng 1 trong 5 gợi ý đầu tiên vào đúng tập test — xác suất thấp là bình thường với dữ liệu sparse. CF vẫn tốt hơn baseline (+20.7%).

**Q: Tại sao Explicit CF không tốt hơn baseline?**
A: Độ thưa 98.2% với chỉ ~8 reviews/user, Pearson correlation không đủ dữ liệu để tính tương đồng chính xác. Đây là lý do recommend.py dùng SVD (model-based) thay vì memory-based CF cho production.
