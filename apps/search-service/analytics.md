cd apps/search-service
uv run evaluate_real.py --mode all # Đánh giá tất cả
uv run evaluate_real.py --mode implicit # Chỉ implicit CF
uv run evaluate_real.py --mode explicit # Chỉ explicit CF
uv run evaluate_real.py --mode svd # Chỉ SVD model

##

cd apps/search-service
uv run train_real.py

##

1. Thao tác trên web (click, view, book, review...)
2. uv run train_real.py → Train model từ DB, lưu vào analytics/
3. uv run evaluate_real.py → Đánh giá model, lưu vào analytics/ + DB
4. Xem kết quả trong analytics/ hoặc bảng system_metrics
