# Sơ đồ Use Case — Hệ thống Stazy Hotel

## Sơ đồ Use Case tổng quát (PlantUML)

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam actorFontSize 14
skinparam usecaseFontSize 12
skinparam rectangleFontSize 14
skinparam packageFontSize 13
skinparam shadowing false
skinparam roundcorner 10
skinparam backgroundColor #FFFFFF

' ===== ACTORS với icon người =====
actor "👤\nKhách hàng\n(User/Guest)" as User #FFD54F
actor "🏨\nChủ khách sạn\n(Author)" as Author #FFCC80
actor "👮\nQuản trị viên\n(Admin)" as Admin #BBDEFB
actor "🤖\nHệ thống AI\n(AI Service)" as AISystem #E1BEE7
actor "💳\nCổng thanh toán\n(Stripe/VNPAY)" as PaymentGateway #C8E6C9

rectangle "Hệ thống Stazy Hotel" {

    ' ===== NHÓM KHÁCH HÀNG =====
    package "Nhóm Khách Hàng" #FFF9C4 {
        usecase "UC-01\nĐăng ký / Đăng nhập\n(Clerk)" as UC01
        usecase "UC-02\nCập nhật hồ sơ" as UC02
        usecase "UC-03\nTìm kiếm khách sạn" as UC03
        usecase "UC-04\nTìm kiếm ngữ nghĩa (AI)\n(NLU + Vector)" as UC04
        usecase "UC-05\nXem chi tiết phòng" as UC05
        usecase "UC-06\nTìm kiếm bằng hình ảnh\n(CLIP + pgvector)" as UC06
        usecase "UC-07\nXem gợi ý cá nhân hóa\n(5 Strategies)" as UC07
        usecase "UC-08\nĐặt phòng (Booking)\n(Redis Lock)" as UC08
        usecase "UC-09\nThanh toán trực tuyến\n(Stripe)" as UC09
        usecase "UC-10\nQuản lý lịch sử đặt" as UC10
        usecase "UC-11\nĐánh giá & Bình luận\n(Sentiment AI)" as UC11
        usecase "UC-12\nChat với AI Bot\n(RAG Agent)" as UC12
        usecase "UC-13\nChat hỗ trợ Admin\n(Socket.io)" as UC13
        usecase "UC-14\nQuản lý yêu thích\n(Favorites)" as UC14
        usecase "UC-15\nXem hồ sơ cá nhân\n(Badges + Charts)" as UC15
    }

    ' ===== NHÓM CHỦ KHÁCH SẠN =====
    package "Nhóm Chủ Khách Sạn (Author)" #FFE0B2 {
        usecase "UC-16\nĐăng ký đối tác\n(AuthorRequest)" as UC16
        usecase "UC-17\nĐăng tin khách sạn\n(DRAFT)" as UC17
        usecase "UC-18\nGửi duyệt khách sạn\n(DRAFT→PENDING)" as UC18
        usecase "UC-19\nQuản lý phòng & Giá" as UC19
        usecase "UC-20\nQuản lý đơn đặt phòng" as UC20
        usecase "UC-21\nPhản hồi đánh giá" as UC21
    }

    ' ===== NHÓM QUẢN TRỊ =====
    package "Nhóm Quản Trị (Admin)" #E3F2FD {
        usecase "UC-22\nPhê duyệt khách sạn\n(State Machine)" as UC22
        usecase "UC-23\nPhê duyệt tác giả\n(AuthorRequest)" as UC23
        usecase "UC-24\nQuản lý người dùng\n(Role: USER/AUTHOR/ADMIN)" as UC24
        usecase "UC-25\nXem hồ sơ User Detail\n(Badges + Contribution)" as UC25
        usecase "UC-26\nQuản lý danh mục\n(Category)" as UC26
        usecase "UC-27\nGiám sát hiệu năng AI\n(RMSE, P@5, NDCG@5)" as UC27
        usecase "UC-28\nPhân tích kinh doanh\n(BI Agent - Groq LLM)" as UC28
        usecase "UC-29\nDashboard thống kê\n(Revenue, Bookings)" as UC29
        usecase "UC-30\nBáo cáo toàn sàn\n(DailyStat)" as UC30
        usecase "UC-31\nHỗ trợ khách hàng\n(Socket.io)" as UC31
    }

    ' ===== NHÓM HỆ THỐNG =====
    package "Nhóm Hệ Thống (Background)" #F3E5F5 {
        usecase "UC-32\nĐồng bộ Vector\n(CLIP → pgvector)" as UC32
        usecase "UC-33\nHuấn luyện SVD\n(GridSearchCV)" as UC33
        usecase "UC-34\nĐánh giá Dual-Feedback\n(Implicit + Explicit)" as UC34
        usecase "UC-35\nTổ hợp thống kê ngày\n(Cron 00:00)" as UC35
        usecase "UC-36\nPhân tích cảm xúc\n(Sentiment)" as UC36
        usecase "UC-37\nGợi ý khách sạn tương tự\n(Item-CF)" as UC37
        usecase "UC-38\nCache Recommendations\n(Redis TTL=1h)" as UC38
        usecase "UC-39\nXử lý thanh toán Webhook\n(Stripe → Kafka)" as UC39
        usecase "UC-40\nSaga Timeout\n(BullMQ 15min)" as UC40
        usecase "UC-41\nGhi nhận Interaction\n(VIEW, BOOK, RATE...)" as UC41
    }
}

' ===== KHÁCH HÀNG CONNECTIONS =====
User --> UC01
User --> UC02
User --> UC03
User --> UC04
User --> UC05
User --> UC06
User --> UC07
User --> UC08
User --> UC10
User --> UC11
User --> UC12
User --> UC13
User --> UC14
User --> UC15

' ===== AUTHOR CONNECTIONS =====
Author --> UC16
Author --> UC17
Author --> UC18
Author --> UC19
Author --> UC20
Author --> UC21

' ===== ADMIN CONNECTIONS =====
Admin --> UC22
Admin --> UC23
Admin --> UC24
Admin --> UC25
Admin --> UC26
Admin --> UC27
Admin --> UC28
Admin --> UC29
Admin --> UC30
Admin --> UC31

' ===== SYSTEM CONNECTIONS =====
AISystem --> UC32 : "Khi có hotel mới"
AISystem --> UC33 : "Offline batch"
AISystem --> UC34 : "Offline batch"
AISystem --> UC35 : "Cronjob 00:00"
AISystem --> UC36 : "Khi có review mới"
AISystem --> UC37 : "Realtime"
AISystem --> UC38 : "Cache management"
AISystem --> UC41 : "Auto log"

' ===== PAYMENT GATEWAY =====
PaymentGateway --> UC39 : "Webhook callback"

' ===== DEPENDENCIES (<<include>> & <<extend>>) =====
UC08 ..> UC09 : <<include>>\n(Booking → Payment)
UC08 ..> UC40 : <<extend>>\n(Timeout → Cancel)
UC09 --> PaymentGateway : "Gọi API thanh toán"
UC17 ..> UC18 : <<include>>\n(DRAFT → Submit)
UC07 ..> UC38 : <<include>>\n(Cache check)
UC04 ..> UC32 : <<extend>>\n(Need vectors)
UC06 ..> UC32 : <<extend>>\n(Need vectors)
UC11 ..> UC36 : <<include>>\n(Auto sentiment)
UC39 ..> UC08 : <<extend>>\n(Webhook → Confirm)
UC13 ..> UC31 : <<include>>\n(User ↔ Admin chat)

' ===== NOTES =====
note right of UC04
  **AI Semantic Search:**
  Groq LLM Function Calling
  + CLIP Vector Search
  + SQL Hybrid Filter
end note

note right of UC06
  **Visual Search:**
  CLIP ViT-B/32 encode
  → pgvector Cosine Similarity
end note

note right of UC12
  **RAG Agent:**
  Groq LLM + Hybrid Search
  + Structured JSON Output
end note

note right of UC28
  **BI Agent:**
  Groq LLM (Llama 3.3)
  → SQL → Anomaly Detection
  → Narrative Generation
end note

note right of UC33
  **SVD Training:**
  Implicit + Explicit Merge
  → GridSearchCV (24 combos)
  → 5-Fold CV → Save model
end note

note bottom of UC08
  **Redis Distributed Lock:**
  SETNX booking:{roomId}
  TTL = 15 phút
  + Transactional Outbox
end note

@enduml
```

---

## Sơ đồ Use Case nhóm Khách hàng (Chi tiết)

```plantuml
@startuml
left to right direction
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam shadowing false
skinparam roundcorner 10
skinparam backgroundColor #FFFFFF

actor "👤 Khách hàng\n(User/Guest)" as User #FFD54F
actor "🤖 AI Service" as AI #E1BEE7
actor "💳 Cổng thanh toán" as PG #C8E6C9

rectangle "Hệ thống Stazy Hotel" {
    package "Xác thực" {
        usecase "Đăng ký / Đăng nhập\n(Clerk SDK)" as UC01
        usecase "Cập nhật hồ sơ\n(name, phone, avatar, desc)" as UC02
        usecase "Cập nhật sở thích\n(categories, amenities, cities)" as UC03
    }

    package "Tìm kiếm & Gợi ý" {
        usecase "Tìm kiếm theo từ khóa\n(location, dates, price)" as UC04
        usecase "Tìm kiếm ngữ nghĩa AI\n(NLU + Vector Search)" as UC05
        usecase "Tìm kiếm bằng hình ảnh\n(CLIP + pgvector)" as UC06
        usecase "Xem gợi ý cá nhân hóa\n(SVD + CF + CBF + Popular)" as UC07
        usecase "Xem chi tiết phòng\n(gallery, amenities, map)" as UC08
        usecase "Xem khách sạn tương tự\n(Item-CF)" as UC09
    }

    package "Giao dịch" {
        usecase "Đặt phòng\n(Redis Lock + Outbox)" as UC10
        usecase "Thanh toán Stripe\n(Checkout Session)" as UC11
        usecase "Quản lý lịch sử đặt\n(infinite scroll)" as UC12
        usecase "Đánh giá & Bình luận\n(Sentiment Analysis)" as UC13
        usecase "Quản lý yêu thích\n(Favorites)" as UC14
    }

    package "Tương tác" {
        usecase "Chat với AI Bot\n(RAG Agent)" as UC15
        usecase "Chat với Admin\n(Socket.io)" as UC16
        usecase "Xem hồ sơ cá nhân\n(Badges + Contribution)" as UC17
    }
}

User --> UC01
User --> UC02
User --> UC03
User --> UC04
User --> UC05
User --> UC06
User --> UC07
User --> UC08
User --> UC10
User --> UC12
User --> UC13
User --> UC14
User --> UC15
User --> UC16
User --> UC17

UC10 ..> UC11 : <<include>>
UC10 ..> UC12 : <<include>>
UC13 ..> UC08 : <<extend>>\n(Phải đã đặt)
UC05 ..> AI : "Gọi API"
UC06 ..> AI : "Gọi API"
UC07 ..> AI : "Gọi API"
UC15 ..> AI : "Gọi API"
UC09 ..> AI : "Gọi API"
UC11 --> PG : "Redirect"

note right of UC05
  Groq LLM → BookingIntent
  CLIP encode → Vector
  SQL + Cosine Similarity
end note

note right of UC07
  5 Strategies:
  SVD | User-CF | Item-CF
  Content | Popular
  Redis Cache (TTL=1h)
end note

@enduml
```

---

## Sơ đồ Use Case nhóm Quản trị (Chi tiết)

```plantuml
@startuml
left to right direction
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam shadowing false
skinparam roundcorner 10
skinparam backgroundColor #FFFFFF

actor "👮 Admin" as Admin #BBDEFB
actor "🤖 AI / BI Agent" as AI #E1BEE7

rectangle "Hệ thống Stazy Hotel" {
    package "Quản lý nội dung" {
        usecase "Phê duyệt khách sạn\n(DRAFT→PENDING→APPROVED)" as UC22
        usecase "Phê duyệt tác giả\n(AuthorRequest)" as UC23
        usecase "Quản lý danh mục\n(Category CRUD)" as UC24
    }

    package "Quản lý người dùng" {
        usecase "Quản lý User\n(list, search, role, delete)" as UC25
        usecase "Xem User Detail\n(Badges, Bookings,\nContribution, Activity)" as UC26
    }

    package "Giám sát & Phân tích" {
        usecase "Giám sát hiệu năng AI\n(RMSE, MAE, P@5, NDCG)" as UC27
        usecase "Phân tích BI\n(Ask questions → LLM)" as UC28
        usecase "Dashboard thống kê\n(Revenue, Bookings, Users)" as UC29
        usecase "Báo cáo toàn sàn\n(DailyStat)" as UC30
    }

    package "Hỗ trợ" {
        usecase "Chat với khách hàng\n(Socket.io)" as UC31
    }
}

Admin --> UC22
Admin --> UC23
Admin --> UC24
Admin --> UC25
Admin --> UC26
Admin --> UC27
Admin --> UC28
Admin --> UC29
Admin --> UC30
Admin --> UC31

UC28 ..> AI : "Groq LLM\nParse intent → SQL\n→ Narrative"
UC27 ..> AI : "system_metrics\nDB"

note right of UC22
  **State Machine:**
  DRAFT → PENDING
  PENDING → APPROVED
  PENDING → REJECTED
  APPROVED → SUSPENDED
end note

note right of UC28
  **BI Agent:**
  "Doanh thu tháng này?"
  → Intent: REVENUE_ANALYSIS
  → SQL → Anomaly Detection
  → insights + root_cause
  + actionable_suggestion
end note

@enduml
```

---

## Sơ đồ Use Case nhóm Hệ thống (Background Jobs)

```plantuml
@startuml
left to right direction
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam shadowing false
skinparam roundcorner 10
skinparam backgroundColor #FFFFFF

actor "🤖 AI Service\n(FastAPI :8008)" as AI #E1BEE7
actor "⏰ Cron Scheduler" as Cron #FFCC80
actor "💳 Stripe\nWebhook" as Stripe #C8E6C9
actor "📨 Kafka\nBroker" as Kafka #FFCDD2

database "PostgreSQL\n(Prisma + pgvector)" as DB #C8E6C9
database "Redis\n(Cache + Lock)" as Redis #FFCDD2

rectangle "Hệ thống Stazy Hotel" {
    package "AI Processing" {
        usecase "Đồng bộ Vector\n(CLIP → imageVector 512d)" as UC32
        usecase "Huấn luyện SVD\n(GridSearchCV → model.pkl)" as UC33
        usecase "Đánh giá Dual-Feedback\n(Implicit: P@K, NDCG\nExplicit: RMSE, MAE)" as UC34
        usecase "Phân tích cảm xúc\n(POSITIVE/NEGATIVE/NEUTRAL)" as UC36
        usecase "Gợi ý tương tự\n(Item-CF Similarity)" as UC37
    }

    package "Data Pipeline" {
        usecase "Tổ hợp thống kê ngày\n(totalRevenue, totalBookings...)" as UC35
        usecase "Ghi nhận Interaction\n(VIEW, BOOK, WISHLIST...)" as UC41
    }

    package "Cache & Lock" {
        usecase "Cache Recommendations\n(Redis, TTL=1 giờ)" as UC38
        usecase "Saga Timeout\n(BullMQ, 15 phút)" as UC40
    }

    package "Payment" {
        usecase "Xử lý Webhook\n(Stripe → Kafka → Booking)" as UC39
    }
}

AI --> UC32 : "Khi hotel mới"
AI --> UC33 : "Offline batch"
AI --> UC34 : "Offline batch"
AI --> UC36 : "Khi review mới"
AI --> UC37 : "Realtime"
AI --> UC41 : "Auto log"
AI --> UC38 : "Cache management"

Cron --> UC35 : "00:00 hàng ngày"
Cron --> UC33 : "Định kỳ"

Stripe --> UC39 : "Payment callback"
Kafka --> UC39 : "Event delivery"
Kafka --> UC40 : "Timeout check"

UC32 --> DB : "UPDATE imageVector"
UC33 --> DB : "INSERT system_metrics"
UC35 --> DB : "INSERT daily_stats"
UC38 --> Redis : "SET/GET/DEL"
UC40 --> Redis : "DEL lock"

note right of UC33
  **SVD Training Pipeline:**
  1. Merge implicit + explicit
  2. GridSearchCV (24 combos)
  3. Train SVD Optimized
  4. 5-Fold CV (RMSE, MAE)
  5. Save model.pkl + report
end note

note right of UC39
  **Payment Webhook Flow:**
  Stripe POST /webhooks
  → Verify signature
  → Publish Kafka event
  → Booking: PENDING→CONFIRMED
  → Email: Gửi xác nhận
  → Redis: DEL lock
end note

note right of UC41
  **Implicit Signals:**
  VIEW=0.5, CLICK=2.0
  WISHLIST=3.0, BOOK=5.0
  RATE_POS=4.5, RATE_NEG=-3.0
end note

@enduml
```
