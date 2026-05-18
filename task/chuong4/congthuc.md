4.6. Mapping code đánh giá hệ thống gợi ý

Dưới đây là ánh xạ giữa các phần đánh giá trong báo cáo và file code cụ thể trong thư mục apps/search-service/. Khi giảng viên yêu cầu code, có thể mở trực tiếp các file này để minh chứng.

4.6.1. Đánh giá SVD Model (train_svd.py)

File chính: apps/search-service/train_svd.py

Phần 1 - Chuẩn bị dữ liệu (Dòng ~50-100):
Code đọc dữ liệu từ hai nguồn **interactions.json và **reviews.json, sau đó chuyển đổi implicit signals thành điểm số theo trọng số: VIEW=0.5, CLICK_BOOK_NOW=2.0, ADD_TO_WISHLIST=3.0, RATE_POSITIVE=4.5, BOOK=5.0, RATE_NEGATIVE=-3.0. Explicit ratings ghi đè implicit nếu cùng cặp (userId, hotelId).

Phần 2 - Tìm kiếm siêu tham số (Dòng ~100-150):
Sử dụng GridSearchCV từ thư viện Surprise với không gian tìm kiếm gồm n_factors [50, 100, 150], n_epochs [20, 30], lr_all [0.005, 0.01], reg_all [0.02, 0.1]. Tổng cộng 24 tổ hợp, mỗi tổ hợp đánh giá bằng 3-fold cross-validation. Chọn tổ hợp cho RMSE thấp nhất.

Phần 3 - Đánh giá so sánh (Dòng ~150-200):
Hàm evaluate_models() chạy 5-fold cross-validation trên cả SVD Optimized (best params) và SVD Baseline (default params). Tính improvement theo công thức: (Baseline_RMSE - Optimized_RMSE) / Baseline_RMSE x 100%.

Công thức RMSE:
RMSE = sqrt(1/n \* sum((predicted_i - actual_i)^2))

Công thức MAE:
MAE = 1/n \* sum(|predicted_i - actual_i|)

4.6.2. Đánh giá Implicit CF (evaluate.py - hàm evaluate_implicit())

File chính: apps/search-service/evaluate.py

Phần 1 - Trọng số tín hiệu (Dòng 143-150):
signal_weights = {"VIEW": 0.5, "CLICK_BOOK_NOW": 2.0, "ADD_TO_WISHLIST": 3.0, "RATE_POSITIVE": 4.5, "BOOK": 5.0, "RATE_NEGATIVE": -3.0}

Phần 2 - Temporal split (Dòng 62-73):
Dữ liệu được sắp xếp theo timestamp, chia 60% train, 20% validation, 20% test. Không dùng random split để mô phỏng thực tế (dữ liệu cũ hơn dùng để dự đoán dữ liệu mới hơn).

Phần 3 - Xây dựng ma trận user-item (Dòng 75-98):
Hàm build_user_item_matrix() tạo ma trận DataFrame với index là user_ids, columns là hotel_ids. Giá trị là trọng số tương tác đã chuyển đổi.

Phần 4 - Tính Cosine Similarity (Dòng 224-233):
user_similarity_matrix = cosine_similarity(train_matrix_filled.values)
Ma trận NaN được fill bằng 0 trước khi tính cosine similarity.

Phần 5 - Sinh gợi ý cho mỗi user (Dòng 276-293):
Với mỗi user trong test set, tìm K=5 users相似 nhất, tính weighted sum = sum(similarity \* rating) cho các item chưa tương tác. Sắp xếp giảm dần lấy top 5.

Phần 6 - Baseline (Dòng 237-240):
Baseline là Top Popular Items: item_popularity = train_matrix.sum(axis=0), lấy top 5 items có tổng trọng số cao nhất. Đây là danh sách cố định cho tất cả users.

Phần 7 - Tính metrics (Dòng 299-315):

Công thức Precision@K:
Precision@K = |{items liên quan trong top K}| / K

Công thức Recall@K:
Recall@K = |{items liên quan trong top K}| / |{tất cả items liên quan trong test}|

Công thức NDCG@K (Dòng 100-111):
DCG = sum(1 / log2(i + 2)) với i là vị trí, chỉ tính item nằm trong tập relevant
IDCG = sum(1 / log2(i + 2)) cho thứ tự hoàn hảo
NDCG@K = DCG / IDCG

Công thức Improvement:
Improvement = (CF_metric - Baseline_metric) / Baseline_metric x 100%

4.6.3. Đánh giá Explicit CF (evaluate.py - hàm evaluate_explicit())

File chính: apps/search-service/evaluate.py

Phần 1 - Dữ liệu (Dòng 413-421):
Đọc từ \_\_reviews.json, mỗi review chứa userId, hotelId, rating (1-5 stars).

Phần 2 - Temporal split (Dòng 452-458):
Tương tự implicit, chia 60/20/20 theo thời gian.

Phần 3 - Mean-Centering và Pearson Correlation (Dòng 476-495):
Bước 1: Fill NaN bằng giá trị trung bình rating của từng user (user mean)
Bước 2: Mean-centering: train_matrix_mc = train_matrix_centered - user_mean
Bước 3: Tính cosine similarity trên ma trận mean-centered → tương đương Pearson Correlation

Lý do dùng Pearson thay vì Cosine: Với explicit ratings, giá trị 0 không có nghĩa là "không thích" mà là "chưa đánh giá". Pearson correlation (mean-centered cosine) xử lý chính xác vấn đề này.

Phần 4 - Dự đoán rating (Dòng 522-550):
Tìm K=10 users相似 nhất. Dự đoán theo công thức:

predicted_rating = user_mean_u + sum(sim(u,v) \* (r_v_i - mean_v)) / sum(|sim(u,v)|)

Trong đó:

- user_mean_u: Trung bình rating của user u cần dự đoán
- sim(u,v): Pearson correlation giữa user u và user v相似
- r_v_i: Rating thực tế của user v相似 cho item i
- mean_v: Trung bình rating của user v相似

Phần 5 - Baseline (Dòng 555-570):
Baseline là User Mean: predicted = user_mean (dự đoán tất cả rating bằng giá trị trung bình của user đó).

Phần 6 - Tính RMSE và MAE (Dòng 575-585):
RMSE = sqrt(mean((predictions - actuals)^2))
MAE = mean(|predictions - actuals|)

Improvement: (Baseline_RMSE - CF_RMSE) / Baseline_RMSE x 100%

4.6.4. Bảng tổng hợp kết quả

Kết quả đánh giá được lưu vào các file JSON:

- apps/search-service/implicit_cf_evaluation_report.json (kết quả System A)
- apps/search-service/explicit_cf_evaluation_report.json (kết quả System B)
- apps/search-service/jsons/svd_training_report.json (kết quả SVD training)

Admin Dashboard đọc các file này qua endpoint:

- GET /api/admin/ai/status (main.py, Dòng ~220-250)

Cách chạy đánh giá:

- SVD: cd apps/search-service && uv run python train_svd.py
- Implicit CF: cd apps/search-service && uv run python evaluate.py --mode implicit
- Explicit CF: cd apps/search-service && uv run python evaluate.py --mode explicit
- Cả hai: cd apps/search-service && uv run python evaluate.py --mode all

Tóm tắt file code cho từng phần đánh giá:

| Phần đánh giá         | File code    | Hàm chính                                                                                                                                       | Metrics                       |
| --------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| SVD Model             | train_svd.py | tune_hyperparameters(), evaluate_models()                                                                                                       | RMSE, MAE                     |
| Implicit CF           | evaluate.py  | evaluate_implicit(), compute_ndcg()                                                                                                             | Precision@5, Recall@5, NDCG@5 |
| Explicit CF           | evaluate.py  | evaluate_explicit()                                                                                                                             | RMSE, MAE                     |
| Recommendation Engine | recommend.py | get_recommendations_for_user(), svd_recommend(), user_based_cf_recommend(), item_based_cf_recommend(), content_recommend(), popular_recommend() | Top-K results                 |
