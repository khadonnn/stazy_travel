# require

```js

-Hiểu yêu cầu tự nhiên (ví dụ: "Tìm khách sạn view biển ở Nha Trang, gần chợ đêm, có bể bơi, dưới 2 triệu/đêm, cho 2 người lớn và 1 trẻ em, từ 20–25/7"),
-Phân tích ngữ cảnh người dùng: lịch sử đặt, sở thích (tiện ích yêu thích, mức giá trung bình, thành phố ưa thích),
-Tự động gợi ý/kết hợp lựa chọn (theo collaborative filtering, content-based, hoặc hybrid),
-Tự động điền form & hoàn tất booking (tích hợp Stripe, PayPal, VNPay…),
-Theo dõi và cập nhật theo hành vi thực (xem, like, click, share, hủy đơn…) để tinh chỉnh gợi ý.
```

# design flow

graph TD
User[User Chat] -->|Text/Voice| FE[Next.js Frontend]
FE -->|API /agent/chat + UserId| BE[Python Backend Agent]

    subgraph "AI Brain (Backend)"
        BE -->|1. Get Context| DB[(Postgres DB)]
        BE -->|2. Intent Extract| LLM[Groq / Llama 3]
        BE -->|3. Hybrid Search| VectorDB[PGVector]

        VectorDB -->|Candidates| Ranker[Re-ranking Logic]
        DB -->|User History| Ranker
    end

    Ranker -->|Top Results| FE

    User -->|Click/Book| FE
    FE -->|Event Log| Analytics[Tracking Service]
    Analytics -->|Update| DB

    User -->|Confirm Booking| Stripe[Payment Gateway]
