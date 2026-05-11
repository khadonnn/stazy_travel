## RECOMMENDATION PROMPT

Dành cho câu hỏi theo lifestyle, vibe, cảm xúc.

### ROLE:

- Chuyên gia tư vấn du lịch cá nhân hóa
- Phân tích Budget, Travel purpose, Vibe của user

### RULES:

- Đề xuất 2-3 khách sạn từ lịch sử chat hoặc context
- Dùng ngôn từ cảm xúc, mô tả tại sao hợp với gu user
- Nếu chưa có context → hỏi nhẹ: "Bạn đang plan chuyến đi cho dịp nào? (cặp đôi, gia đình, solo...)"
- KHÔNG tự động chuyển sang BOOK

### FEW-SHOT:

User: "Resort nào chill nhất ở Nha Trang?" → Phân tích vibe "chill" → gợi ý resort có pool, view biển, spa
User: "Khách sạn cho honeymoon" → Phân tích purpose "romantic" → gợi ý KS có view đẹp, private, sang trọng

## 12-5

## `generate_recommendations.py` đã được cập nhật — Merge CẢ 2 nguồn dữ liệu

### Pipeline dữ liệu hoàn chỉnh:

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│  generate_mock_interactions.py  │     │  generate_reviews_from_csv.py    │
│  (Implicit: VIEW, BOOK, WISH)  │     │  (Explicit: rating + comment VN) │
└──────────┬──────────────────────┘     └──────────┬───────────────────────┘
           │                                        │
           ▼                                        ▼
    __interactions.json                      __reviews_real_vi.json
    (implicit signals)                       (15k Vietnamese reviews)
           │                                        │
           └──────────────┬──────────────────────────┘
                          ▼
              generate_recommendations.py
              ┌─────────────────────────┐
              │ MERGE logic:            │
              │ 1. Implicit → weight    │
              │ 2. Explicit → GHI ĐÈ    │
              │    (same user+hotel)    │
              │                         │
              │ → User-Item Matrix      │
              │ → Cosine Similarity     │
              │ → CF Recommendations    │
              └──────────┬──────────────┘
                         ▼
              __recommendations.json
                         │
                         ▼
              seed.ts → Prisma DB
```

### Trọng số sau merge:

- **Implicit**: VIEW=0.5, CLICK_BOOK_NOW=2.0, ADD_TO_WISHLIST=3.0, BOOK=5.0
- **Explicit**: rating 1-5 (GHI ĐÈ implicit nếu cùng user+hotel pair)

### Thứ tự chạy:

```bash
cd apps/search-service
uv run generate_reviews_from_csv.py    # Tạo __reviews_real_vi.json (nếu chưa có)
uv run generate_mock_interactions.py   # Tạo __interactions.json (implicit)
uv run generate_recommendations.py     # Merge cả 2 → __recommendations.json
```

### Đồng bộ với:

- `train_svd.py` — Đã merge cả 2 nguồn (tương tự)
- `recommend.py` — Đã merge cả 2 nguồn trong `_build_user_item_matrix()`
- `evaluate.py` — Đánh giá riêng implicit/explicit
