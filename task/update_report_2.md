# Bản cập nhật 2 — Hệ thống gợi ý & Các luồng hoạt động quan trọng

## Mục tiêu

- Mô tả chi tiết kiến trúc hệ thống gợi ý (Recommendation Engine) đa chiến lược đã triển khai.
- Trình bày luồng huấn luyện mô hình SVD và đánh giá offline.
- Minh họa các luồng hoạt động quan trọng khác: Admin Dashboard, User Profile & Badges, Interaction → Recommendation feedback loop.

---

## 1. Kiến trúc hệ thống gợi ý (Multi-Strategy Recommendation Engine)

Hệ thống Stazy triển khai **5 chiến lược gợi ý** trong file `src/recommend.py`, với cơ chế fallback tự động khi chiến lược chính không khả dụng (cold-start, sparse data).

```mermaid
flowchart TB
    subgraph Client["🖥️ Client App (Next.js)"]
        REQ["GET /recommend/{user_id}<br/>?strategy=svd&top_k=5"]
    end

    subgraph SearchService["⚙️ Search Service (FastAPI :8008)"]
        DISPATCH["Strategy Dispatcher<br/>STRATEGY_MAP.get(strategy)"]
        S1["🤖 SVD Recommend<br/>(SVD + Content Hybrid)<br/>Weight: SVD 60% + Content 40%"]
        S2["👥 User-Based CF<br/>(Cosine Similarity)<br/>Top-K=10 similar users"]
        S3["🏨 Item-Based CF<br/>(Item-Item Similarity)<br/>Based on interacted hotels"]
        S4["🏷️ Content-Based<br/>(Onboarding Categories)"]
        S5["🎲 Popular Fallback<br/>(reviewStar × reviewCount)"]
    end

    subgraph DataSources["📊 Data Sources"]
        MODEL["recsys_model.pkl<br/>(SVD - Surprise library)"]
        INTERACTIONS["__interactions.json<br/>(VIEW, BOOK, WISHLIST...)"]
        REVIEWS["__reviews.json<br/>(Explicit ratings 1-5)"]
        HOTELS["__homeStay.json<br/>(Hotel metadata)"]
        PREFS["UserPreference DB<br/>(interestedCategories)"]
    end

    subgraph Scoring["🧮 Hybrid Scoring"]
        CONTENT_SCORE["Content Score (40%)<br/>Price + Location + Amenity + Category"]
        COLLAB_SCORE["Collaborative Score (30%)<br/>User behavior patterns"]
        SENTIMENT_SCORE["Sentiment Score (20%)<br/>Aspect-based review sentiment"]
        POPULARITY_SCORE["Popularity Score (10%)<br/>Average rating safety"]
    end

    REQ --> DISPATCH
    DISPATCH -->|strategy=svd| S1
    DISPATCH -->|strategy=user_cf| S2
    DISPATCH -->|strategy=item_cf| S3
    DISPATCH -->|strategy=content| S4
    DISPATCH -->|strategy=popular| S5

    S1 --> MODEL
    S1 --> CONTENT_SCORE
    S2 --> INTERACTIONS
    S2 --> REVIEWS
    S3 --> INTERACTIONS
    S3 --> REVIEWS
    S4 --> PREFS
    S4 --> HOTELS
    S5 --> HOTELS

    S1 -.->|Cold-start fallback| S4
    S2 -.->|No matrix fallback| S5
    S3 -.->|No interactions fallback| S4
    S4 -.->|No categories fallback| S5

    CONTENT_SCORE --> HOTELS
    COLLAB_SCORE --> INTERACTIONS
    SENTIMENT_SCORE --> REVIEWS
    POPULARITY_SCORE --> HOTELS
```

### Bảng chiến lược & cơ chế fallback

| Chiến lược      | Mô tả                                             | Dữ liệu đầu vào                       | Fallback khi cold-start |
| --------------- | ------------------------------------------------- | ------------------------------------- | ----------------------- |
| `svd` (default) | SVD Matrix Factorization + Content Hybrid (60/40) | `recsys_model.pkl` + User profile     | → `content` → `popular` |
| `user_cf`       | User-Based CF (Cosine Similarity, K=10)           | User-Item Matrix từ interactions      | → `content` → `popular` |
| `item_cf`       | Item-Based CF (Item-Item Similarity)              | User-Item Matrix transpose            | → `content` → `popular` |
| `content`       | Content-Based (Onboarding categories)             | `UserPreference.interestedCategories` | → `popular`             |
| `popular`       | Top-rated hotels (reviewStar × reviewCount)       | Hotel metadata                        | — (ultimate fallback)   |

---

## 2. Luồng huấn luyện mô hình SVD (Training Pipeline)

Quy trình huấn luyện offline được thực hiện bởi `train_svd.py` với 5 bước: Load Data → GridSearchCV → Train Final → Evaluate → Save.

```mermaid
flowchart LR
    subgraph Input["📥 Dữ liệu đầu vào"]
        INTER["__interactions.json<br/>Implicit signals:<br/>VIEW(0.5), CLICK(2.0)<br/>WISHLIST(3.0), BOOK(5.0)<br/>RATE_NEG(-3.0)"]
        REV["__reviews.json<br/>Explicit ratings:<br/>1-5 stars"]
    end

    subgraph Merge["🔄 Bước 1: Merge Data"]
        MAP["Rating Map<br/>(userId, hotelId) → score<br/>Explicit overrides Implicit"]
    end

    subgraph Tune["🔍 Bước 2: GridSearchCV"]
        GRID["Search Space:<br/>n_factors: [50, 100, 150]<br/>n_epochs: [20, 30]<br/>lr_all: [0.005, 0.01]<br/>reg_all: [0.02, 0.1]<br/>3-fold CV × 24 combos"]
        BEST["Best Params<br/>(min RMSE)"]
    end

    subgraph Train["🏋️ Bước 3: Train"]
        OPT["SVD Optimized<br/>(best params)"]
        BASE["SVD Baseline<br/>(default params)"]
    end

    subgraph Eval["📊 Bước 4: Evaluate"]
        CV["5-Fold Cross-Validation<br/>Metrics: RMSE, MAE<br/>Compare: Optimized vs Baseline"]
    end

    subgraph Output["💾 Bước 5: Save"]
        MODEL["recsys_model.pkl<br/>(pickle)"]
        REPORT["svd_training_report.json<br/>(metrics + params + stats)"]
        METRICS["system_metrics table<br/>(PostgreSQL)"]
    end

    INTER --> MAP
    REV --> MAP
    MAP --> GRID
    GRID --> BEST
    BEST --> OPT
    MAP --> BASE
    OPT --> CV
    BASE --> CV
    CV --> MODEL
    CV --> REPORT
    CV --> METRICS
```

---

## 3. Luồng tương tác người dùng → Gợi ý (Interaction → Recommendation Feedback Loop)

Mỗi hành vi của người dùng (VIEW, BOOK, WISHLIST, RATE...) được ghi vào bảng `Interaction` và gián tiếp cải thiện chất lượng gợi ý qua chu kỳ huấn luyện lại mô hình.

```mermaid
sequenceDiagram
    participant User as 👤 Người dùng
    participant Client as 🖥️ Client App
    participant Product as ⚙️ Product Service
    participant DB as 🗄️ PostgreSQL
    participant Search as 🔍 Search Service
    participant SVD as 🤖 SVD Model

    Note over User, SVD: GIAI ĐOẠN 1: NGƯỜI DÙNG TƯƠNG TÁC

    User->>Client: Xem khách sạn (VIEW)
    Client->>Product: POST /interactions<br/>{type: "VIEW", hotelId}
    Product->>DB: INSERT Interaction<br/>(userId, hotelId, VIEW, timestamp)

    User->>Client: Đặt phòng thành công (BOOK)
    Client->>Product: Auto-log Interaction<br/>{type: "BOOK", hotelId}
    Product->>DB: INSERT Interaction<br/>(weight: 5.0)

    User->>Client: Đánh giá 4 sao (RATING)
    Client->>Product: POST /reviews<br/>(rating: 4, comment: "...")
    Product->>DB: INSERT Review + Interaction<br/>{type: "RATE_POSITIVE"}

    Note over User, SVD: GIAI ĐOẠN 2: HỆ THỐNG GỢI Ý (REALTIME)

    User->>Client: Trang chủ / "Gợi ý cho bạn"
    Client->>Search: GET /recommend/{userId}?strategy=svd
    Search->>SVD: predict(userId, hotelId) → score
    Search->>Search: hybrid_score = 0.6×SVD + 0.4×Content
    Search-->>Client: Top-K hotels (sorted by score)
    Client-->>User: Hiển thị gợi ý cá nhân hóa

    Note over User, SVD: GIAI ĐOẠN 3: HUẤN LUYỆN LẠI (BATCH - CRON)

    SVD->>DB: Đọc interactions + reviews mới
    SVD->>SVD: Merge implicit + explicit<br/>GridSearchCV → Train SVD
    SVD->>SVD: Save model.pkl<br/>(recsys_model.pkl)
    Note over Search: Lần gọi /recommend tiếp theo<br/>sẽ load model mới
```

---

## 4. Luồng quản trị Admin Dashboard

Admin Dashboard là trung tâm điều khiển của hệ thống, cho phép quản trị viên theo dõi thống kê, phê duyệt khách sạn, quản lý người dùng và xem biểu đồ doanh thu.

```mermaid
flowchart TB
    subgraph Admin["👮 Admin Portal (:3003)"]
        DASH["Dashboard"]
        USERS["Users Management"]
        HOTELS["Hotels Approval"]
        STATS["Charts & Analytics"]
    end

    subgraph Actions["⚡ Server Actions (Next.js)"]
        GA["get-user-detail.ts<br/>get-user-bookings.ts<br/>get-user-contribution.ts<br/>get-user-activity.ts"]
        GS["get-popular-stays.ts<br/>get-latest-transactions.ts<br/>get-daily-stats.ts<br/>get-revenue.ts"]
        HA["hotelAdminActions.ts<br/>(Approve/Reject/Suspend)"]
    end

    subgraph DB["🗄️ PostgreSQL (Prisma)"]
        U[("users<br/>bookings<br/>hotels<br/>reviews<br/>interactions<br/>daily_stats")]
    end

    subgraph Charts["📊 Visualization Components"]
        LINE["AppLineChart<br/>(Monthly bookings & hotels)"]
        CONTRIB["ContributionChart<br/>(GitHub-style calendar)"]
        BAR["AppBarChart / AppAreaChart<br/>(Revenue & Stats)"]
        PIE["AppPieChart<br/>(Distribution)"]
    end

    DASH --> GS
    USERS --> GA
    HOTELS --> HA
    STATS --> GS

    GA --> U
    GS --> U
    HA --> U

    GA --> LINE
    GA --> CONTRIB
    GS --> BAR
    GS --> PIE
```

### Luồng chi tiết: Xem profile người dùng (User Detail Page)

```mermaid
sequenceDiagram
    participant Admin as 👮 Admin
    participant Page as 📄 /users/[id]
    participant Server as ⚙️ Server Actions
    participant DB as 🗄️ PostgreSQL
    participant UI as 🎨 Client Components

    Admin->>Page: Click "View user profile"
    Page->>Page: Await params.id (Next.js 15)
    Page->>UI: Render UserDetailClient(userId)

    par Parallel data fetching
        UI->>Server: getUserDetail(userId)
        Server->>DB: findUnique User<br/>+ _count(bookings, hotels, reviews)<br/>+ aggregate(totalSpending)
        DB-->>Server: User + stats
        Server-->>UI: User profile data
    and
        UI->>Server: getUserBookings(userId, page=1, limit=5)
        Server->>DB: findMany Booking<br/>(skip=0, take=5, orderBy=desc)
        DB-->>Server: Bookings + hotel details
        Server-->>UI: First 5 bookings
    and
        UI->>Server: getUserContribution(userId)
        Server->>DB: findMany Bookings + Hotels<br/>(group by date → count)
        Server-->>UI: Contribution calendar data
    and
        UI->>Server: getUserActivity(userId)
        Server->>DB: count Bookings & Hotels<br/>(group by month)
        Server-->>UI: Monthly activity data
    end

    UI->>UI: Calculate badges based on stats:<br/>Explorer(>10), SuperTraveler(>50)<br/>HotelHost, VerifiedHost<br/>TopReviewer(>100), VIP(>10M)

    UI->>Admin: Render full profile:<br/>Badges + Info + Booked Stays<br/>+ Contribution Chart + Activity Chart

    Note over Admin, UI: Infinite Scroll cho Bookings
    Admin->>UI: Scroll to bottom (IntersectionObserver)
    UI->>Server: getUserBookings(userId, page=2, limit=5)
    Server-->>UI: Next 5 bookings
    UI->>UI: Append to list
```

---

## 5. Luồng User Badges (Huy hiệu người dùng)

Huy hiệu được tính toán realtime dựa trên dữ liệu thống kê của người dùng. Mỗi badge có icon Lucide, màu sắc riêng và mô tả chi tiết.

```mermaid
flowchart LR
    subgraph Stats["📊 User Stats"]
        BC["Bookings Count"]
        HC["Hotels Count"]
        RC["Reviews Count"]
        TS["Total Spending"]
        ROLE["User Role"]
    end

    subgraph Badges["🏆 Badge Rules"]
        B1["🧭 Explorer<br/>bookings > 10<br/>Icon: Compass (Blue)"]
        B2["✈️ Super Traveler<br/>bookings > 50<br/>Icon: Plane (Purple)"]
        B3["🏢 Hotel Host<br/>hotels > 0<br/>Icon: Building2 (Green)"]
        B4["🛡️ Verified Host<br/>role=AUTHOR + hotels>0<br/>Icon: ShieldCheck (Emerald)"]
        B5["📄 Top Reviewer<br/>reviews > 100<br/>Icon: FileText (Orange)"]
        B6["👑 VIP<br/>spending > 10M VND<br/>or role=ADMIN<br/>Icon: Crown (Yellow)"]
        B7["🛡️ Admin<br/>role = ADMIN<br/>Icon: Shield (Red)"]
    end

    subgraph UI["🎨 Badge Display"]
        HOVER["HoverCard<br/>Icon + Title + Description"]
    end

    BC -->|> 10| B1
    BC -->|> 50| B2
    HC -->|> 0| B3
    ROLE -->|= AUTHOR + HC > 0| B4
    RC -->|> 100| B5
    TS -->|> 10M| B6
    ROLE -->|= ADMIN| B6
    ROLE -->|= ADMIN| B7

    B1 --> HOVER
    B2 --> HOVER
    B3 --> HOVER
    B4 --> HOVER
    B5 --> HOVER
    B6 --> HOVER
    B7 --> HOVER
```

---

## 6. Luồng phê duyệt khách sạn (Hotel Approval Workflow)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Author tạo khách sạn

    DRAFT --> PENDING: Author nhấn Submit<br/>(Gửi duyệt)

    PENDING --> APPROVED: Admin phê duyệt
    PENDING --> REJECTED: Admin từ chối

    REJECTED --> DRAFT: Author chỉnh sửa<br/>và gửi lại

    APPROVED --> SUSPENDED: Admin tạm ngưng<br/>(Vi phạm chính sách)
    SUSPENDED --> APPROVED: Admin khôi phục

    DRAFT --> [*]: Author xóa nháp
```

```mermaid
sequenceDiagram
    participant Author as 🏨 Author Portal
    participant Product as ⚙️ Product Service
    participant DB as 🗄️ PostgreSQL
    participant Admin as 👮 Admin Portal
    participant Client as 🖥️ Client App

    Note over Author, Client: AUTHOR TẠO & GỬI DUYỆT

    Author->>Product: POST /hotels (Tạo nháp)
    Product->>DB: INSERT Hotel (status: DRAFT)
    Product-->>Author: ✅ Tạo nháp thành công

    Author->>Product: PATCH /hotels/:id/submit
    Product->>DB: UPDATE status: DRAFT → PENDING
    Product-->>Author: ✅ Đã gửi duyệt

    Note over Author, Client: ADMIN PHÊ DUYỆT / TỪ CHỐI

    Admin->>Product: GET /hotels?status=PENDING
    Product-->>Admin: Danh sách chờ duyệt

    alt Phê duyệt
        Admin->>Product: PATCH /hotels/:id/approve
        Product->>DB: UPDATE status: APPROVED
        Note over Client: Khách sạn xuất hiện<br/>trên Client App
    else Từ chối
        Admin->>Product: PATCH /hotels/:id/reject
        Product->>DB: UPDATE status: REJECTED<br/>(+ rejectionReason)
    end
```

---

## 7. Luồng Content-Based Filtering (Đề xuất mở rộng)

Dựa trên sở thích tường minh (Explicit Preferences) được lưu trong bảng `UserPreference`, hệ thống có thể mở rộng sang Content-Based Filtering.

```mermaid
flowchart LR
    subgraph UserPrefs["👤 User Preferences"]
        CAT["interestedCategories<br/>['beach', 'resort']"]
        AMEN["favoriteAmenities<br/>['pool', 'sea_view']"]
        CITY["favoriteCities<br/>['nha_trang', 'da_nang']"]
        PRICE["avgPriceExpect<br/>(tự tính từ history)"]
    end

    subgraph ItemVector["🏨 Item Vectors (Offline)"]
        META["Hotel Metadata:<br/>category, tags, amenities,<br/>address, price, reviewStar"]
        EMBED["Embedding Vectors:<br/>CLIP image vector (512d)<br/>Text description vector"]
    end

    subgraph Hybrid["🔀 Hybrid Score"]
        direction TB
        CF["CF Score (SVD/User-CF/Item-CF)"]
        CBF["CBF Score (Cosine Similarity)"]
        MERGE["Final = α×CF + β×CBF<br/>(configurable weights)"]
    end

    subgraph Cache["📦 Cache Layer"]
        REDIS["Redis Cache<br/>(user group cache)"]
    end

    CAT --> CBF
    AMEN --> CBF
    CITY --> CBF
    PRICE --> CBF
    META --> CBF
    EMBED --> CBF

    CF --> MERGE
    CBF --> MERGE
    MERGE --> REDIS
    REDIS -->|TTL expire / Preference update| MERGE
```

---

## 8. Tổng kết các luồng hoạt động chính

| STT | Luồng                      | Dịch vụ tham gia                           | Cơ chế giao tiếp         | Mẫu thiết kế                                         |
| --- | -------------------------- | ------------------------------------------ | ------------------------ | ---------------------------------------------------- |
| 1   | Xác thực & Phân quyền      | Client, Gateway, Backend, Clerk            | Synchronous (REST + JWT) | Bearer Token + RBAC                                  |
| 2   | Đặt phòng & Thanh toán     | Client, Booking, Payment, Email, Stripe    | Hybrid (Sync + Async)    | Saga Orchestration + Transactional Outbox            |
| 3   | AI Chat & Tìm kiếm         | Client, AI Service, Groq, PostgreSQL       | Synchronous (REST)       | RAG + Function Calling + Hybrid Search               |
| 4   | Chat hỗ trợ thời gian thực | Client, Admin, Socket Service, PostgreSQL  | Asynchronous (WebSocket) | Room-based Messaging                                 |
| 5   | Phê duyệt khách sạn        | Author, Admin, Product Service, PostgreSQL | Synchronous (REST)       | State Machine (Stateless)                            |
| 6   | Hệ thống gợi ý             | Client, Search Service, PostgreSQL, Redis  | Synchronous (REST)       | Multi-Strategy Hybrid (SVD + CF + Content + Popular) |
| 7   | Huấn luyện mô hình SVD     | train_svd.py, PostgreSQL                   | Batch (Offline)          | GridSearchCV + Cross-Validation                      |
| 8   | Admin Dashboard            | Admin Portal, Server Actions, PostgreSQL   | Synchronous (REST + SSR) | Server Components + React Query                      |
| 9   | Interaction Feedback Loop  | Client, Product Service, Search Service    | Hybrid (Sync + Batch)    | Event Logging → Model Retraining                     |
| 10  | Content-Based Filtering    | Search Service, PostgreSQL, Redis          | Synchronous (REST)       | User Preference → Cosine Similarity                  |

---

## 9. Lộ trình đề xuất mở rộng

- **Bước 1**: Thu thập & chuẩn hóa thuộc tính item (2 tuần) — Chuẩn hóa `amenities`, `tags`, `suitableFor` cho tất cả khách sạn.
- **Bước 2**: Triển khai CBF prototype + offline evaluation (1-2 tuần) — Tính `item_vector` từ metadata, đánh giá Precision@K.
- **Bước 3**: Kết hợp Hybrid experiment, A/B testing (2-4 tuần) — So sánh CTR đặt phòng giữa CF-only và CF+CBF.
- **Bước 4**: Productionization — Feature store (Redis/Milvus), caching, monitoring, auto-retrain.

---

_Tài liệu tham khảo: xem [task/update_report_1.md](task/update_report_1.md) để đối chiếu luồng xác thực và luồng đặt phòng đã thiết kế trước đó._
