### 5.4 Đánh giá hiệu năng hệ thống — Chi tiết

Phần này tổng hợp kết quả đo hiệu năng hệ thống trong môi trường kiểm thử nội bộ. Các con số là giá trị tham khảo (trung bình/p95/p99) thu được bằng bộ công cụ: `ab`, `k6`, `docker stats`, và `pg_stat_statements`.

#### a) Môi trường kiểm thử

|     Thành phần | Thông số                                                        |
| -------------: | :-------------------------------------------------------------- |
|            CPU | Intel Core i7-12700K / 2 vCPU (chạy trong Docker)               |
|            RAM | 32 GB (dev), 8 GB (production)                                  |
|             OS | Windows 11 / Ubuntu 22.04                                       |
|       Database | PostgreSQL 16 + `pgvector`                                      |
|          Cache | Redis 7.2                                                       |
| Message broker | Kafka 3.7                                                       |
|     Công cụ đo | Apache Bench (`ab`), `k6`, `docker stats`, `pg_stat_statements` |

#### b) Kết quả đo API (thời gian phản hồi)

| API                         | Avg (ms) | p95 (ms) | p99 (ms) | Throughput (req/s) |
| :-------------------------- | -------: | -------: | -------: | -----------------: |
| `GET /api/hotels` (search)  |       85 |      150 |      210 |                320 |
| `GET /api/hotels/{id}`      |       32 |       55 |       78 |                450 |
| `POST /api/bookings`        |      120 |      210 |      310 |                180 |
| `GET /api/recommendations`  |       95 |      160 |      240 |                220 |
| `POST /api/chat` (AI agent) |    1,850 |    2,500 |    3,500 |                 45 |
| `POST /api/search/semantic` |      210 |      320 |      450 |                120 |

Ghi chú: `POST /api/chat` phản ánh độ trễ của inference LLM; cải thiện cần tối ưu batching hoặc giảm context size.

#### c) Ảnh hưởng của Redis cache

| API                                  | Không cache (ms) | Có cache Redis (ms) | Cải thiện |
| :----------------------------------- | ---------------: | ------------------: | --------: |
| `GET /api/recommendations`           |              450 |                  95 |     78.9% |
| `GET /api/hotels` (hot destinations) |              180 |                  35 |     80.6% |

Caching giảm đáng kể tail latency cho các endpoint đọc-heavy.

#### d) Thời gian xử lý từng thành phần (AI service)

| Thành phần                                | Thời gian trung bình (ms) | Ghi chú                         |
| :---------------------------------------- | ------------------------: | :------------------------------ |
| CLIP embedding (text)                     |                     45–65 | `SentenceTransformer`           |
| CLIP embedding (image)                    |                    80–120 | Resize + encode                 |
| Cosine similarity (255 hotels, in-memory) |                     15–25 |                                 |
| Hybrid search (SQL + vector)              |                     35–50 | `pgvector` trên PostgreSQL      |
| LLM inference (Groq Llama 3)              |                 800–1,500 | Phụ thuộc độ dài prompt/context |
| SVD prediction (in-memory)                |                       2–5 | Lightweight matrix ops          |

#### e) Tài nguyên tiêu thụ (quan sát từ `docker stats`)

| Service                       | CPU (%) | RAM (MB) | Ghi chú                      |
| :---------------------------- | ------: | -------: | :--------------------------- |
| Product Service (Express)     |   10–20 |      256 |                              |
| Booking Service (Fastify)     |    8–15 |      320 |                              |
| Payment Service (Hono)        |    5–10 |      128 |                              |
| Search & AI Service (FastAPI) |   25–40 |    2,048 | CLIP models resident in RAM  |
| Socket Service (Fastify)      |    5–10 |      128 |                              |
| PostgreSQL                    |   15–25 |      512 | Includes `pgvector` overhead |
| Redis                         |    5–10 |      256 |                              |
| Kafka                         |   10–15 |      512 |                              |

#### f) Kết quả load test (k6)

Kịch bản mẫu: simulating up to 1,000 concurrent users thực hiện luồng đặt phòng.

| Concurrent users | Success rate | Avg response (ms) | p95 (ms) |
| :--------------- | -----------: | ----------------: | -------: |
| 50               |         100% |               125 |      210 |
| 100              |        99.5% |               180 |      320 |
| 200              |        98.2% |               320 |      580 |
| 500              |        94.1% |               650 |    1,200 |

Hệ thống bắt đầu xuất hiện timeout/giảm tỷ lệ thành công khi concurrent users > 300 — cần thêm autoscaling hoặc tối ưu hóa bottleneck (DB / AI inference).

#### g) Thời gian huấn luyện mô hình

| Model                             |  Dataset size | Training time | Evaluation time |
| :-------------------------------- | ------------: | ------------: | --------------: |
| SVD (baseline)                    | 7,401 ratings |          12 s |             3 s |
| SVD (optimized)                   | 7,401 ratings |          18 s |             3 s |
| GridSearchCV (24 params × 3-fold) | 7,401 ratings |         210 s |               — |

---

Ghi chú tổng quát: các kết quả trên là giá trị tham khảo lấy từ môi trường thử nghiệm. Để báo cáo chính thức, nên đính kèm cấu hình thử nghiệm (seed, dataset, phiên bản model) và file kết quả (JSON/CSV) kèm timestamp.
