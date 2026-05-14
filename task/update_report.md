# BÁO CÁO CẬP NHẬT - KIẾN TRÚC HỆ THỐNG STAZY HOTEL

---

## 3.4.1. Kiến trúc Microservices

Hệ thống Stazy Hotel được xây dựng theo kiến trúc microservices đa ngôn ngữ (polyglot microservices), giao diện sử dụng Next.js, kết hợp giữa Node.js (TypeScript) cho các dịch vụ nghiệp vụ chính và Python cho các tác vụ AI và xử lý dữ liệu vector phức tạp. Các dịch vụ giao tiếp với nhau thông qua RESTful API (đồng bộ) và message queue (bất đồng bộ — Kafka + BullMQ). Hệ thống sử dụng PostgreSQL làm database chính cho tất cả các service, kết hợp Redis cho caching và distributed lock. API Gateway (Fastify Reverse Proxy) định tuyến request từ client đến các backend service.

### Bảng tổng quan các dịch vụ

| Tên Dịch vụ             | Cổng (Port) | Công nghệ chính                                                                                                                                                                  | Mô tả Chức năng                                                                                                                                                                                                                                                                                                                                                                                                                          | Giao thức                  |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Gateway**             | 3000        | Node.js (Fastify), @fastify/http-proxy, @fastify/cors                                                                                                                            | API Gateway / Reverse Proxy. Định tuyến request từ client đến các backend service theo prefix URL (`/api/products` → Product Service, `/api/bookings` → Booking Service, ...).                                                                                                                                                                                                                                                           | HTTP / REST                |
| **Client App**          | 3002        | Next.js 16, React 19, TailwindCSS 4, Zustand, TanStack Query, Socket.io-client, Framer Motion, Leaflet, Zod                                                                      | Giao diện người dùng (Front-end). Xử lý hiển thị, SEO, tìm kiếm, đặt phòng, thanh toán (Stripe/VNPay), chat real-time, bản đồ (Leaflet). Gọi API thông qua Gateway hoặc trực tiếp đến backend service.                                                                                                                                                                                                                                   | HTTPS / REST, WebSocket    |
| **Admin Portal**        | 3003        | Next.js 16, React 19, TailwindCSS 4, Zustand, TanStack Query, Recharts, D3.js, Swagger UI                                                                                        | Trang quản trị dành cho chủ khách sạn và admin hệ thống. Quản lý phê duyệt khách sạn, quản lý booking, analytics dashboard (biểu đồ doanh thu, hiệu suất AI), quản lý chat hỗ trợ khách hàng, quản lý AI model.                                                                                                                                                                                                                          | HTTPS / REST, WebSocket    |
| **Product Service**     | 8000        | Node.js (Express 5), PostgreSQL (Prisma ORM), Clerk Auth, Kafka                                                                                                                  | Quản lý thông tin lõi: Khách sạn, Phòng, Danh mục, Tiện ích. Cung cấp API cho Client hiển thị danh sách. Hỗ trợ phê duyệt khách sạn (Hotel Approval Workflow). Gửi/nhận sự kiện qua Kafka.                                                                                                                                                                                                                                               | HTTP / REST, Kafka         |
| **Booking Service**     | 8001        | Node.js (Fastify 5), PostgreSQL (Prisma ORM), Redis (ioredis + Redlock), Clerk Auth, Kafka, BullMQ                                                                               | Xử lý nghiệp vụ đặt phòng: Kiểm tra trống (Availability), Tạo đơn, Giữ chỗ (distributed lock với Redlock), Quản lý trạng thái đơn hàng. Triển khai Saga Orchestration Pattern + Transactional Outbox Pattern để đảm bảo tính nhất quán giữa Booking ↔ Payment. Cron job analytics và AI training.                                                                                                                                       | HTTP / REST, Kafka, BullMQ |
| **Payment Service**     | 8002        | Node.js (Hono), Stripe SDK, VNPay SDK, Clerk Auth, Kafka, BullMQ                                                                                                                 | Xử lý thanh toán online. Tích hợp cổng thanh toán Stripe (quốc tế) và VNPay (trong nước). Xử lý webhook từ Stripe. Phát sinh sự kiện thanh toán thành công qua Kafka. BullMQ xử lý async payment tasks.                                                                                                                                                                                                                                  | HTTP / REST, Kafka, BullMQ |
| **Email Service**       | 8003        | Node.js (HTTP server native), Nodemailer, Kafka, BullMQ                                                                                                                          | Service nền (Worker). Lắng nghe sự kiện từ Kafka (`user.created`, `booking-events`, `payment-events`) để gửi email xác nhận, vé điện tử cho khách hàng. Có endpoint HTTP `/send-confirmation` để trigger gửi mail trực tiếp.                                                                                                                                                                                                             | Kafka Consumer, HTTP       |
| **Socket Service**      | 3005        | Node.js (Fastify 5), Socket.io 4, PostgreSQL (Prisma ORM)                                                                                                                        | Xử lý kết nối thời gian thực: Chat giữa khách hàng và admin hỗ trợ (customer support), thông báo đẩy (Real-time Notification). Lưu tin nhắn vào PostgreSQL qua Prisma (ChatMessage model).                                                                                                                                                                                                                                               | WebSocket, HTTP            |
| **Search & AI Service** | 8008        | Python, FastAPI, PyTorch 2.9, Sentence Transformers (CLIP-ViT-B-32), Groq (LLM API), scikit-learn, scikit-surprise (SVD), Redis, PostgreSQL (SQLAlchemy + psycopg2), APScheduler | Dịch vụ tìm kiếm thông minh và AI Agent. Bao gồm: (1) Tìm kiếm bằng hình ảnh — Vector Search với CLIP model, (2) Tìm kiếm bằng văn bản — Semantic Search, (3) Gợi ý khách sạn — Multi-strategy Recommendation (SVD, User-CF, Item-CF, Content-based, Popular), (4) AI Chatbot tư vấn du lịch (Groq LLM), (5) BI Agent cho admin dashboard (phân tích doanh thu, hiệu suất), (6) Auto-retrain SVD model hàng ngày (APScheduler cron job). | HTTP / REST                |

### Bảng tổng quan các package dùng chung (Shared Packages)

| Tên Package                 | Công nghệ chính                   | Mô tả                                                                                                                                                                                                                                                      |
| --------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **@repo/product-db**        | Prisma ORM, PostgreSQL (pgvector) | Schema database chung: User, Hotel, Category, Booking, Interaction, Review, ChatMessage, Favorite, DailyStat, SystemMetric, OutboxMessage, ProcessedEvent. Dùng chung cho Product, Booking, Socket services. Hỗ trợ vector embedding (pgvector extension). |
| **@repo/kafka**             | KafkaJS                           | Client library Kafka dùng chung. Cung cấp `createKafkaClient`, `createProducer`, `createConsumer` cho tất cả service.                                                                                                                                      |
| **@repo/bullmq**            | BullMQ, Redis (ioredis)           | Background job queue library dùng chung. Quản lý async tasks: email sending, payment processing, saga timeout, booking events.                                                                                                                             |
| **@repo/types**             | TypeScript                        | Shared type definitions giữa các service.                                                                                                                                                                                                                  |
| **@repo/eslint-config**     | ESLint                            | Cấu hình linting thống nhất cho toàn bộ monorepo.                                                                                                                                                                                                          |
| **@repo/typescript-config** | TypeScript                        | Cấu hình TypeScript base cho toàn bộ monorepo.                                                                                                                                                                                                             |

---

## 3.4.2. Thiết kế cơ chế giao tiếp giữa các dịch vụ

Để đảm bảo hiệu năng cao cho trải nghiệm người dùng (Frontend) đồng thời duy trì tính ổn định và toàn vẹn dữ liệu cho các nghiệp vụ hậu đằng (Backend), hệ thống Stazy Hotel áp dụng kết hợp hai cơ chế giao tiếp: Giao tiếp đồng bộ (Synchronous) qua RESTful API và Giao tiếp bất đồng bộ (Asynchronous) qua Event-Driven Architecture với Apache Kafka.

### Giao tiếp Đồng bộ (Synchronous Communication) — RESTful API

Đây là phương thức giao tiếp chính giữa Client Application (Frontend) và các Microservices. Trong mô hình này, Client gửi yêu cầu (Request) và phải đợi cho đến khi nhận được phản hồi (Response) từ Server.

**Phạm vi áp dụng:**

- Các thao tác cần phản hồi tức thì cho người dùng cuối (User/Admin).
- Giao tiếp giữa Next.js Frontend và các Backend Services (thông qua Gateway hoặc trực tiếp).
- Giao tiếp với các dịch vụ bên ngoài (External APIs) như Clerk Auth, Stripe, VNPay, Groq LLM.

**Chi tiết triển khai:**

- **Giao thức:** HTTP/1.1 hoặc HTTP/2 qua lớp bảo mật HTTPS.
- **Định dạng dữ liệu:** JSON (JavaScript Object Notation).
- **Cổng kết nối (Ports):** Hệ thống định tuyến rõ ràng dựa trên cổng dịch vụ:
  - Gateway (Fastify Reverse Proxy) lắng nghe tại port 3000, định tuyến request đến các backend service:
    - `/api/products/*` → Product Service (port 8000): Tìm kiếm, xem chi tiết phòng.
    - `/api/bookings/*` → Booking Service (port 8001): Kiểm tra phòng trống, tạo đơn.
    - `/api/payments/*` → Payment Service (port 8002): Xử lý thanh toán (Stripe/VNPay).
    - `/api/search/*` → Search & AI Service (port 8008): Chatbot tư vấn, tìm kiếm hình ảnh/văn bản, gợi ý.
- **Framework đa dạng:** Mỗi service sử dụng framework phù hợp với đặc thù nghiệp vụ:
  - Product Service: Express 5
  - Booking Service: Fastify 5 (hiệu năng cao, phù hợp tác vụ I/O nặng)
  - Payment Service: Hono (lightweight,高性能)
  - Search & AI Service: FastAPI (Python, async native)

**Ưu điểm:** Đơn giản, dễ triển khai, phù hợp với các thao tác đọc dữ liệu (Read-heavy operations). Frontend nhận phản hồi trực tiếp, đảm bảo trải nghiệm người dùng mượt mà.

### Giao tiếp Bất đồng bộ (Asynchronous Communication) — Event-Driven với Apache Kafka

Để giải quyết bài toán phụ thuộc chặt chẽ (Coupling) giữa các dịch vụ và xử lý các tác vụ tốn thời gian, hệ thống sử dụng Apache Kafka làm trung gian truyền tải thông điệp (Message Broker).

**Cơ chế hoạt động (Producer — Consumer):**

- Một dịch vụ khi hoàn thành tác vụ sẽ phát ra một sự kiện (Event) vào Kafka Topic (đóng vai trò là Producer).
- Các dịch vụ khác quan tâm đến sự kiện đó sẽ đăng ký lắng nghe (Subscribe) và tự động xử lý khi có tin nhắn mới (đóng vai trò là Consumer).

**Các luồng nghiệp vụ áp dụng (Dựa trên cấu trúc dự án):**

- **Xử lý Đặt phòng & Thanh toán:**
  - Khi người dùng thanh toán thành công, Payment Service publish sự kiện `payment-events` vào Kafka.
  - Booking Service consume sự kiện này để cập nhật trạng thái đơn hàng từ `PENDING` sang `CONFIRMED` mà không cần Payment Service phải gọi API trực tiếp (tránh lỗi dây chuyền nếu Booking Service bị quá tải).

- **Hệ thống Thông báo (Notification):**
  - Email Service lắng nghe các sự kiện `booking-events` hoặc `payment-events` từ Kafka để gửi email xác nhận hoặc vé điện tử cho khách hàng ở chế độ nền (Background Job), giúp giảm độ trễ phản hồi cho người dùng.

- **Đăng ký người dùng:**
  - Khi user đăng ký mới (qua Clerk), sự kiện `user.created` được publish vào Kafka.
  - Email Service consume sự kiện này để gửi email chào mừng (WELCOME).

- **Đồng bộ sản phẩm:**
  - Product Service publish sự kiện `product-events` khi khách sạn được tạo/cập nhật.
  - Payment Service consume để đồng bộ thông tin sản phẩm lên Stripe.

**Kafka Topics trong hệ thống:**

| Topic            | Producer                   | Consumer                       | Mô tả                                           |
| ---------------- | -------------------------- | ------------------------------ | ----------------------------------------------- |
| `user.created`   | Client App (Clerk webhook) | Email Service                  | Sự kiện user đăng ký → Gửi email chào mừng      |
| `booking-events` | Booking Service            | Payment Service, Email Service | Sự kiện booking (created, confirmed, cancelled) |
| `payment-events` | Payment Service            | Booking Service, Email Service | Sự kiện thanh toán (success, failed)            |
| `product-events` | Product Service            | Payment Service                | Sự kiện sản phẩm (hotel created/updated)        |

**Bổ sung: BullMQ (Redis-backed Job Queue) cho tác vụ nền:**

Ngoài Kafka, hệ thống sử dụng BullMQ (dựa trên Redis) cho các tác vụ nền cần đảm bảo xử lý và có retry mechanism:

| Queue            | Service         | Mô tả                                                                                  |
| ---------------- | --------------- | -------------------------------------------------------------------------------------- |
| `saga-timeout`   | Booking Service | Timeout cho Saga orchestration (nếu payment không hoàn thành trong thời gian quy định) |
| `booking-events` | Booking Service | Xử lý async booking events                                                             |
| `payment`        | Payment Service | Xử lý async payment tasks                                                              |
| `stripe-product` | Payment Service | Sync sản phẩm lên Stripe                                                               |
| `email`          | Email Service   | Gửi email qua Nodemailer                                                               |
| `email-events`   | Email Service   | Xử lý email events từ Kafka                                                            |

**Hạ tầng:**

- Apache Kafka chạy trên port 9092, đóng vai trò là xương sống liên kết các Microservices độc lập.
- Redis chạy trên port 6379, đóng vai trò backend cho BullMQ job queues và distributed locking.

**Tóm lại,** sự kết hợp này tạo ra một kiến trúc linh hoạt: Frontend giao tiếp trực tiếp với Backend để lấy dữ liệu hiển thị nhanh nhất. Backend giao tiếp với nhau qua Kafka để đảm bảo tính nhất quán cuối cùng (eventual consistency) và khả năng mở rộng. BullMQ xử lý các tác vụ nền cần retry và timeout.

---

## 3.4.3. Kiến trúc dữ liệu

Hệ thống Stazy Hotel áp dụng mô hình **Shared Database** kết hợp với các lớp lưu trữ chuyên biệt cho từng bài toán cụ thể. Tất cả các microservices nghiệp vụ (Product, Booking, Socket) đều truy cập chung một cơ sở dữ liệu PostgreSQL thông qua Prisma ORM (`@repo/product-db`), đảm bảo tính toàn vẹn dữ liệu và đơn giản hóa triển khai. Bên cạnh đó, hệ thống sử dụng Redis cho caching và distributed locking, cùng cơ chế lưu trữ in-memory cho dữ liệu vector AI.

### Bảng tổng quan Database

| Loại lưu trữ            | Công nghệ                            | Service sử dụng                                                            | Vai trò                                                                                                          |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL**          | Prisma ORM (v7) + pgvector extension | Product Service, Booking Service, Socket Service, Client App, Admin Portal | Database chính. Lưu trữ toàn bộ dữ liệu quan hệ, giao dịch, và vector embedding.                                 |
| **Redis**               | ioredis 5                            | Booking Service, Search & AI Service                                       | Distributed lock (Redlock - chống overbooking), cache recommendation results. Backend cho BullMQ job queues.     |
| **In-memory JSON**      | Python dict (RAM)                    | Search & AI Service                                                        | Load vector embeddings của khách sạn vào RAM để thực hiện Cosine Similarity realtime cho visual/semantic search. |
| **PostgreSQL pgvector** | pgvector extension                   | Product Service (Hotel model)                                              | Lưu trữ vector embedding (512 chiều) trực tiếp trong PostgreSQL cho image search và policy search.               |

### 3.4.3.1. PostgreSQL — Database chính (Shared Database)

Tất cả các microservices nghiệp vụ đều truy cập chung một database PostgreSQL thông qua package `@repo/product-db` với Prisma ORM.

**Chiến lược truy cập:**

Thay vì mỗi service sở hữu database riêng (Database-per-Service), hệ thống sử dụng mô hình Shared Database — tất cả service đọc/ghi cùng một PostgreSQL instance thông qua Prisma schema tập trung (`packages/product-db/prisma/schema.prisma`). Quyết định này dựa trên các lý do:

- **Đơn giản hóa triển khai:** Với quy mô dự án tốt nghiệp, mô hình shared database giúp giảm complexity trong quản lý migration, backup, và monitoring.
- **Tính toàn vẹn dữ liệu:** Prisma đảm bảo referential integrity giữa các bảng (Hotel ↔ Booking ↔ User ↔ Review) mà không cần xử lý distributed transactions phức tạp.
- **Truy vấn cross-service:** Admin Portal cần truy vấn dữ liệu từ nhiều service (booking stats, revenue analytics, AI metrics) — shared database cho phép join trực tiếp mà không cần API aggregation.

**Các Prisma Models chính:**

| Nhóm          | Models                                                            | Mô tả                                                                                |
| ------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **User**      | User, AuthorRequest, UserPreference                               | Thông tin người dùng, phân quyền (USER/AUTHOR/ADMIN), sở thích cho AI recommendation |
| **Product**   | Hotel, Category                                                   | Thông tin khách sạn (pricing, amenities, tags, location, AI vectors), danh mục       |
| **Booking**   | Booking, OutboxMessage, ProcessedEvent                            | Đặt phòng, payment details (Stripe/VNPay), Saga orchestration, idempotency tracking  |
| **AI**        | Interaction, Review, Recommendation, SearchQueryLog, SystemMetric | Tương tác người dùng (11 loại), đánh giá, gợi ý, metrics AI model                    |
| **Social**    | Favorite, ChatMessage                                             | Danh sách yêu thích, tin nhắn chat hỗ trợ (USER/ADMIN/AI)                            |
| **Analytics** | DailyStat                                                         | Thống kê hàng ngày (revenue, bookings, cancels, views, clicks)                       |

**Enums:** Role, HotelStatus, BookingStatus, PaymentMethod, PaymentStatus, InteractionType, TripType, SenderRole, ReviewSentiment, AuthorRequestStatus, OutboxStatus

**Đặc điểm dữ liệu:**

- Dữ liệu có cấu trúc chặt chẽ với mối quan hệ ràng buộc cao (Hotel có nhiều Booking, User có nhiều Interaction).
- Hỗ trợ truy vấn lọc phức tạp (theo giá, sao, vị trí, amenities) với tốc độ cao nhờ PostgreSQL indexing.
- Hỗ trợ vector embedding (pgvector extension) cho AI search — lưu trữ imageVector (512 chiều) và policiesVector (512 chiều) trực tiếp trong bảng Hotel.
- Snapshot pattern: Booking lưu bản sao thông tin khách sạn (`bookingSnapshot` JSON) tại thời điểm đặt, đảm bảo lịch sử đơn hàng không bị ảnh hưởng khi khách sạn thay đổi giá/tên.

### 3.4.3.2. Redis — Caching & Distributed Locking

Hệ thống sử dụng Redis (In-Memory Key-Value Store) như một lớp đệm trung gian để tăng tốc độ phản hồi và điều phối các tiến trình song song.

**Đặc điểm dữ liệu:** Dữ liệu dạng khóa-giá trị (Key-Value), được lưu trữ trên RAM cho tốc độ truy xuất cực nhanh (sub-millisecond), nhưng có tính chất tạm thời.

**Vai trò chính:**

- **Distributed Locking (Booking Service):** Giải quyết bài toán "Overbooking" (Đặt trùng phòng). Khi người dùng bắt đầu thanh toán, Redis tạo một khóa phân tán (Lock) cho phòng đó thông qua thư viện Redlock. Nếu người dùng khác cố gắng đặt cùng lúc, hệ thống sẽ kiểm tra Redis và từ chối ngay lập tức.
- **Recommendation Cache (Search & AI Service):** Lưu trữ tạm thời kết quả gợi ý để tránh tính toán lại mỗi khi user request.
- **BullMQ Backend:** Redis đóng vai trò backend cho toàn bộ hệ thống job queue (BullMQ), quản lý các tác vụ nền: email sending, payment processing, saga timeout.

### 3.4.3.3. Vector Storage — Search & AI Service (Dữ liệu phi cấu trúc)

Dịch vụ Tìm kiếm thông minh (Search & AI Service) sử dụng cơ chế lưu trữ Vector để phục vụ các tác vụ Trí tuệ nhân tạo.

**Đặc điểm dữ liệu:** Các vector embedding (mảng số 512 chiều) được trích xuất từ hình ảnh và mô tả văn bản của khách sạn thông qua model AI (CLIP-ViT-B-32).

**Cơ chế lưu trữ kép:**

- **In-memory JSON (`__hotel_vectors.json`):** Load toàn bộ vector embeddings của khách sạn vào RAM khi service khởi động. Thực hiện phép tính Cosine Similarity realtime cho visual/semantic search — tốc độ cực nhanh, phù hợp với yêu cầu phản hồi tức thì.
- **PostgreSQL pgvector:** Lưu trữ vector embedding trực tiếp trong cột `vector(512)` của bảng Hotel (imageVector, policiesVector). Cho phép truy vấn vector từ Product Service hoặc Admin Portal mà không cần gọi Search Service.

**Vai trò:**

- Thực hiện phép tính Cosine Similarity để tìm kiếm các khách sạn có "độ tương đồng" về mặt ngữ nghĩa (ví dụ: tìm các khách sạn có "không gian lãng mạn" hoặc tìm khách sạn có hình ảnh giống với ảnh người dùng tải lên).
- Đây là tác vụ mà các CSDL truyền thống (SQL LIKE query) không thể thực hiện được.

### 3.4.3.4. Tổng kết kiến trúc dữ liệu

| Thành phần     | Loại dữ liệu                     | Tốc độ  | Độ bền (Durability)           | Service sử dụng         |
| -------------- | -------------------------------- | ------- | ----------------------------- | ----------------------- |
| **PostgreSQL** | Quan hệ, JSON, Vector (pgvector) | Cao     | Bền vững (Persistent)         | Toàn bộ services        |
| **Redis**      | Key-Value (RAM)                  | Rất cao | Tạm thời (Ephemeral)          | Booking, Search, BullMQ |
| **In-memory**  | Vector array (Python dict)       | Cực cao | Tạm thời (Reload khi restart) | Search & AI Service     |

**Lưu ý về chiến lược Database:** Hệ thống hiện tại sử dụng mô hình Shared Database (tất cả service chia sẻ cùng PostgreSQL) thay vì Database-per-Service. Điều này phù hợp với quy mô dự án tốt nghiệp, nơi ưu tiên tính đơn giản và toàn vẹn dữ liệu. Trong môi trường production quy mô lớn, có thể tách database theo service để tăng tính độc lập và khả năng mở rộng ngang (horizontal scaling).

---

## 3.4.4. Kiến trúc tổng thể (System Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                      │
│  ┌──────────────┐    ┌──────────────┐                               │
│  │  Client App   │    │  Admin Portal │                               │
│  │  (Next.js)    │    │  (Next.js)   │                               │
│  │  Port: 3002   │    │  Port: 3003  │                               │
│  └──────┬───────┘    └──────┬───────┘                               │
└─────────┼───────────────────┼───────────────────────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GATEWAY (Fastify) - Port 3000                    │
│  /api/products/* → Product Service (8000)                           │
│  /api/bookings/* → Booking Service (8001)                           │
│  /api/payments/* → Payment Service (8002)                           │
│  /api/search/*   → Search & AI Service (8008)                       │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Product Service  │ │ Booking Service  │ │ Payment Service  │
│ Express/Node.js  │ │ Fastify/Node.js  │ │ Hono/Node.js     │
│ Port: 8000       │ │ Port: 8001       │ │ Port: 8002       │
│ PostgreSQL(Prisma)│ │ PostgreSQL(Prisma)│ │ Stripe + VNPay  │
│                  │ │ Redis (Redlock)  │ │                  │
│                  │ │ BullMQ           │ │ BullMQ           │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          ┌─────────────────┐  ┌─────────────────┐
          │     KAFKA       │  │   BULLMQ + REDIS│
          │  (Message Queue)│  │  (Job Queue)    │
          └────────┬────────┘  └────────┬────────┘
                   │                    │
         ┌─────────┴─────────┐         │
         ▼                   ▼         ▼
┌──────────────────┐ ┌──────────────────┐
│  Email Service   │ │ Socket Service   │
│  Node.js Worker  │ │ Fastify/Node.js  │
│  Port: 8003      │ │ Port: 3005       │
│  Nodemailer      │ │ Socket.io        │
│  Kafka Consumer  │ │ PostgreSQL(Prisma)│
└──────────────────┘ └──────────────────┘

┌──────────────────────────────────────────────────┐
│          Search & AI Service (Python)            │
│          FastAPI - Port: 8008                    │
│  ┌────────────┐ ┌──────────┐ ┌────────────────┐ │
│  │CLIP Model  │ │SVD Model │ │Groq LLM Agent  │ │
│  │(Visual     │ │(scikit-  │ │(Chatbot + BI)  │ │
│  │ Search)    │ │surprise) │ │                │ │
│  └────────────┘ └──────────┘ └────────────────┘ │
│  ┌────────────┐ ┌──────────┐ ┌────────────────┐ │
│  │Redis Cache │ │PostgreSQL│ │APScheduler     │ │
│  │            │ │(SQLAlch.)│ │(Cron retrain)  │ │
│  └────────────┘ └──────────┘ └────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 3.4.5. Công nghệ chi tiết từng dịch vụ

### 3.4.5.1. Gateway (Port 3000)

- **Framework:** Fastify 5
- **Chức năng:** API Gateway / Reverse Proxy
- **Thư viện chính:** `@fastify/http-proxy`, `@fastify/cors`
- **Routing:**
  - `/api/products/*` → Product Service (port 8000)
  - `/api/bookings/*` → Booking Service (port 8001)
  - `/api/payments/*` → Payment Service (port 8002)
  - `/api/search/*` → Search & AI Service (port 8008)
- **CORS:** Cho phép origin từ `localhost:3002` (Client) và `localhost:3003` (Admin)

### 3.4.5.2. Client App (Port 3002)

- **Framework:** Next.js 16 (App Router + Pages Router hybrid) với Turbopack
- **UI Library:** React 19, Radix UI (Dialog, Dropdown, Select, Tabs, Tooltip, ...), Lucide React icons
- **Styling:** TailwindCSS 4, tailwind-merge, class-variance-authority, Framer Motion, GSAP
- **State Management:** Zustand, TanStack React Query
- **Forms:** React Hook Form + Zod validation
- **Authentication:** Clerk (`@clerk/nextjs`)
- **Payment:** Stripe (`@stripe/react-stripe-js`, `@stripe/stripe-js`)
- **Real-time:** Socket.io-client
- **Maps:** Leaflet + react-leaflet
- **3D/Particles:** Three.js, tsparticles, OGL

### 3.4.5.3. Admin Portal (Port 3003)

- **Framework:** Next.js 16 với Turbopack
- **UI Library:** React 19, Radix UI (AlertDialog, Checkbox, Switch, Collapsible, ...), Lucide React
- **Styling:** TailwindCSS 4
- **State Management:** Zustand, TanStack React Query + React Table
- **Visualization:** Recharts, D3.js, d3-cloud (word cloud), react-activity-calendar (GitHub-style heatmap)
- **Authentication:** Clerk (`@clerk/nextjs`)
- **API Docs:** next-swagger-doc, swagger-ui-react
- **Database access:** Prisma client (truy cập trực tiếp PostgreSQL cho admin queries)

### 3.4.5.4. Product Service (Port 8000)

- **Runtime:** Node.js với TypeScript
- **Framework:** Express 5
- **Database:** PostgreSQL qua Prisma ORM (`@prisma/client`)
- **Authentication:** Clerk (`@clerk/express`)
- **Message Queue:** Kafka (Producer + Consumer) — Gửi sự kiện khi hotel được tạo/cập nhật
- **API Routes:**
  - `/hotels` — CRUD khách sạn, phê duyệt (approval workflow)
  - `/categories` — Quản lý danh mục
  - `/users` — Quản lý người dùng

### 3.4.5.5. Booking Service (Port 8001)

- **Runtime:** Node.js với TypeScript
- **Framework:** Fastify 5
- **Database:** PostgreSQL qua Prisma ORM (`@repo/product-db`) — Booking, OutboxMessage, ProcessedEvent models
- **Cache & Lock:** Redis (ioredis) + Redlock (distributed lock để chống overbooking)
- **Authentication:** Clerk (`@clerk/fastify`)
- **Message Queue:**
  - Kafka (Producer) — Gửi sự kiện `booking-events` khi booking được tạo/xác nhận/hủy
  - BullMQ — Saga timeout queue, booking events queue
- **Patterns:**
  - Saga Orchestration Pattern (kiểm soát luồng Booking → Payment → Confirm)
  - Transactional Outbox Pattern (đảm bảo message delivery)
- **Cron Jobs:**
  - Analytics aggregation (node-cron)
  - AI Training trigger (hàng ngày)
- **API Routes:**
  - `/bookings` — CRUD booking, kiểm tra availability
  - `/messages` — Chat messages
  - `/admin` — Admin booking management
  - `/availability` — Kiểm tra phòng trống

### 3.4.5.6. Payment Service (Port 8002)

- **Runtime:** Node.js với TypeScript
- **Framework:** Hono (lightweight,高性能)
- **Payment Gateways:**
  - Stripe SDK (`stripe` v20) — Thanh toán quốc tế
  - VNPay SDK (`vnpay` v2.4) — Thanh toán trong nước
- **Authentication:** Clerk (`@hono/clerk-auth`)
- **Message Queue:**
  - Kafka (Producer + Consumer) — Gửi `payment-events`, nhận `product-events`
  - BullMQ — Payment queue, Stripe product queue
- **API Routes:**
  - `/sessions` — Tạo Stripe checkout session
  - `/vnpay` — Xử lý thanh toán VNPay
  - `/webhooks` — Stripe webhook handler (public, không cần auth)

### 3.4.5.7. Email Service (Port 8003)

- **Runtime:** Node.js với TypeScript
- **Framework:** HTTP server native (Node.js built-in `http` module)
- **Email:** Nodemailer
- **Message Queue:**
  - Kafka Consumer — Lắng nghe 3 topics:
    - `user.created` → Gửi email chào mừng (WELCOME)
    - `booking-events` → Xác nhận đặt phòng (BOOKING_CREATED)
    - `payment-events` → Xác nhận thanh toán (PAYMENT_SUCCESS)
  - BullMQ — Email queue, Email events queue (idempotent processing)
- **HTTP Endpoint:** `POST /send-confirmation` — Trigger gửi email trực tiếp (fallback khi Kafka unavailable)

### 3.4.5.8. Socket Service (Port 3005)

- **Runtime:** Node.js với TypeScript
- **Framework:** Fastify 5
- **WebSocket:** Socket.io 4 (via fastify-socket.io)
- **Database:** PostgreSQL qua Prisma ORM (`@repo/product-db`)
- **Message Queue:** Kafka (Consumer), BullMQ
- **Chức năng:**
  - Real-time chat giữa khách hàng (User) và admin hỗ trợ
  - Lưu tin nhắn vào PostgreSQL (ChatMessage model: USER | ADMIN | AI)
  - Thông báo đẩy real-time
  - Room-based messaging: `user-{userId}`, `admin-support-room`, `admin-channel`

### 3.4.5.9. Search & AI Service (Port 8008)

- **Runtime:** Python
- **Framework:** FastAPI 0.124 + Uvicorn
- **AI Models:**
  - **CLIP-ViT-B-32** (sentence-transformers) — Trích xuất vector hình ảnh/text cho tìm kiếm semantic
  - **SVD** (scikit-surprise) — Collaborative Filtering cho recommendation
  - **Groq LLM** — AI Chatbot tư vấn du lịch + BI Agent phân tích dữ liệu
- **ML Libraries:** PyTorch 2.9, scikit-learn, scipy, numpy, pandas
- **NLP:** pyvi (Vietnamese NLP), transformers
- **Database:**
  - PostgreSQL (SQLAlchemy + psycopg2) — Truy cập data từ Product DB để training
  - Redis — Cache cho recommendation results
- **Scheduler:** APScheduler — Auto-retrain SVD model hàng ngày lúc 3:00 AM
- **API Endpoints:**
  - `POST /search-by-base64` — Tìm kiếm bằng hình ảnh (drag & drop)
  - `POST /search-by-text` — Tìm kiếm bằng mô tả văn bản
  - `POST /search-by-image-url` — Tìm kiếm bằng URL ảnh
  - `GET /recommend/{user_id}` — Gợi ý khách sạn (strategy: svd | user_cf | item_cf | content | popular)
  - `GET /similar/{hotel_id}` — Khách sạn tương tự
  - `POST /agent/chat` — AI Chatbot tư vấn
  - `POST /api/admin/chat` — BI Agent cho admin
  - `GET /api/admin/ai/status` — Trạng thái AI model
  - `POST /api/admin/ai/force-retrain` — Kích hoạt retrain thủ công

---

## 3.4.6. Authentication & Authorization

- **Identity Provider:** Clerk (`@clerk/nextjs` cho Next.js apps, `@clerk/express` cho Express, `@clerk/fastify` cho Fastify, `@clerk/hono` cho Hono)
- **Auth Flow:** OAuth 2.0 / JWT
- **Roles:** USER, AUTHOR (chủ khách sạn), ADMIN
- **Middleware:** Mỗi service có middleware `shouldBeUser` kiểm tra Clerk JWT token
- **Role Sync:** Client App có script `sync-roles.ts` đồng bộ role giữa Clerk và PostgreSQL

---

## 3.4.7. AI & Machine Learning

### Tìm kiếm hình ảnh (Visual Search)

- **Model:** CLIP-ViT-B-32 (sentence-transformers)
- **Vector Database:** In-memory JSON (`__hotel_vectors.json`) + PostgreSQL pgvector
- **Flow:** Upload ảnh → CLIP encode → Cosine similarity → Top-K results

### Hệ gợi ý (Recommendation System)

- **Multi-strategy dispatcher** với 5 chiến lược:
  1. **SVD** (scikit-surprise) — Matrix factorization cho explicit ratings
  2. **User-based CF** — Collaborative filtering theo user similarity
  3. **Item-based CF** — Collaborative filtering theo item similarity
  4. **Content-based** — Dựa trên đặc điểm khách sạn (amenities, tags, location)
  5. **Popular** — Fallback cho cold-start users
- **Implicit signals:** 6 loại tín hiệu với trọng số phân cấp (VIEW: 0.5, CLICK_BOOK_NOW: 2.0, ADD_TO_WISHLIST: 3.0, RATE_POSITIVE: 4.5, BOOK: 5.0, RATE_NEGATIVE: -3.0)
- **Auto-retrain:** APScheduler cron job hàng ngày lúc 3:00 AM

### AI Chatbot

- **LLM:** Groq API (cloud-hosted LLM inference)
- **Agent:** Tool-calling agent với search capabilities
- **BI Agent:** Phân tích doanh thu, hiệu suất cho admin dashboard

---

## 3.4.8. Monorepo Structure

Hệ thống sử dụng **pnpm workspace** kết hợp **Turborepo** để quản lý monorepo:

```
stazy/
├── apps/
│   ├── gateway/           # API Gateway (Fastify)
│   ├── client/            # Client App (Next.js)
│   ├── admin/             # Admin Portal (Next.js)
│   ├── product-service/   # Product Service (Express)
│   ├── booking-service/   # Booking Service (Fastify)
│   ├── payment-service/   # Payment Service (Hono)
│   ├── email-service/     # Email Service (Worker)
│   ├── socket-service/    # Socket Service (Fastify + Socket.io)
│   └── search-service/    # Search & AI Service (Python + FastAPI)
├── packages/
│   ├── product-db/        # Prisma schema + PostgreSQL client (dùng chung cho Product, Booking, Socket services)
│   ├── kafka/             # Kafka client library
│   ├── bullmq/            # BullMQ queue library
│   ├── types/             # Shared TypeScript types
│   ├── eslint-config/     # Shared ESLint config
│   └── typescript-config/ # Shared TypeScript config
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 3.4.9. Deployment & Infrastructure

- **Containerization:** Docker (mỗi service có Dockerfile)
- **Orchestration:** Docker Compose cho development, Kubernetes (kubectl) cho production
- **Package Manager:** pnpm (workspace mode)
- **Build System:** Turborepo (parallel builds, caching)
- **Runtime:** Node.js (TypeScript) cho 6 services, Python cho 1 service
- **Environment Variables:** `.env` file per service, `--env-file` flag khi chạy dev

---

## 3.4.10. Bảng tổng hợp Port

| Port | Service             | Ghi chú                        |
| ---- | ------------------- | ------------------------------ |
| 3000 | Gateway             | API Gateway / Reverse Proxy    |
| 3002 | Client App          | Frontend chính                 |
| 3003 | Admin Portal        | Trang quản trị                 |
| 3005 | Socket Service      | WebSocket server               |
| 8000 | Product Service     | API khách sạn                  |
| 8001 | Booking Service     | API đặt phòng                  |
| 8002 | Payment Service     | API thanh toán                 |
| 8003 | Email Service       | HTTP endpoint + Kafka consumer |
| 8008 | Search & AI Service | API tìm kiếm + AI              |

---

## 4.1. Môi trường và cài đặt

### 4.1.1. Danh sách công nghệ và thư viện sử dụng

#### Môi trường phát triển

| Lớp / Tầng Hệ thống   | Công nghệ / Thư viện                  | Mô tả & Vai trò trong hệ thống                                                                                                                                      |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**          | Next.js 16 (App Router)               | Framework chính, hỗ trợ Server-Side Rendering (SSR) giúp tối ưu SEO và hiệu năng tải trang. Sử dụng Turbopack cho tốc độ build nhanh.                               |
|                       | TypeScript                            | Ngôn ngữ lập trình chính, đảm bảo tính chặt chẽ của dữ liệu (Type Safety).                                                                                          |
|                       | Tailwind CSS 4                        | Framework CSS utility-first giúp xây dựng giao diện nhanh chóng và nhất quán.                                                                                       |
|                       | Shadcn/UI & Radix UI                  | Bộ thư viện UI Components chất lượng cao, dễ tùy biến và tiếp cận (Accessibility).                                                                                  |
|                       | TanStack Query                        | Quản lý việc gọi API, caching và đồng bộ dữ liệu phía Client.                                                                                                       |
|                       | Zustand                               | Quản lý trạng thái toàn cục (Global State) nhẹ nhàng cho ứng dụng.                                                                                                  |
|                       | Framer Motion / GSAP                  | Thư viện animation cho trải nghiệm người dùng mượt mà.                                                                                                              |
|                       | Socket.io-client                      | Giao thức WebSocket client để kết nối thời gian thực (chat, notification).                                                                                          |
|                       | Leaflet & react-leaflet               | Hiển thị bản đồ tương tác cho vị trí khách sạn.                                                                                                                     |
|                       | Stripe (@stripe/react-stripe-js)      | Tích hợp thanh toán Stripe phía frontend.                                                                                                                           |
| **Backend API**       | Node.js                               | Runtime môi trường chạy JavaScript cho các Microservices chính.                                                                                                     |
|                       | Express 5                             | Web Framework cho Product Service — quản lý khách sạn, danh mục, người dùng.                                                                                        |
|                       | Fastify 5                             | Web Framework hiệu năng cao, độ trễ thấp dùng cho Booking Service, Socket Service và Gateway.                                                                       |
|                       | Hono                                  | Web Framework lightweight,高性能 dùng cho Payment Service.                                                                                                          |
|                       | Python (FastAPI)                      | Framework chuyên dụng cho AI Service, xử lý các tác vụ Machine Learning.                                                                                            |
|                       | Socket.IO                             | Giao thức WebSocket để gửi thông báo thời gian thực (Real-time) tới người dùng. Kết hợp Fastify (fastify-socket.io).                                                |
|                       | Nodemailer                            | Thư viện gửi email cho Email Service (xác nhận đặt phòng, welcome email).                                                                                           |
|                       | node-cron                             | Lên lịch chạy cron job cho Booking Service (analytics aggregation, AI training trigger).                                                                            |
| **Cơ sở dữ liệu**     | PostgreSQL                            | CSDL Quan hệ chính: Lưu trữ toàn bộ dữ liệu người dùng, khách sạn, đặt phòng, tương tác, đánh giá, chat. Hỗ trợ pgvector extension cho AI vector search.            |
|                       | Prisma ORM (v7)                       | Công cụ giao tiếp với PostgreSQL, quản lý Schema và Migration dữ liệu. Dùng chung cho Product, Booking, Socket services.                                            |
|                       | Redis (ioredis)                       | In-Memory Store: Dùng cho Distributed Lock (Redlock — chống đặt trùng phòng), Cache recommendation results, và Backend cho BullMQ job queues.                       |
|                       | BullMQ                                | Background job queue dựa trên Redis: Xử lý async tasks (email, payment, saga timeout).                                                                              |
| **Hạ tầng & DevOps**  | Docker & Docker Compose               | Đóng gói ứng dụng (Containerization) và quản lý môi trường triển khai cục bộ.                                                                                       |
|                       | Apache Kafka                          | Message Broker: Điều phối sự kiện bất đồng bộ giữa các service (Event-Driven Architecture). 4 topics: user.created, booking-events, payment-events, product-events. |
|                       | pnpm (Workspace)                      | Package Manager cho monorepo, quản lý dependencies giữa các packages.                                                                                               |
|                       | Turborepo                             | Build system cho monorepo: parallel builds, caching, incremental builds.                                                                                            |
| **Dịch vụ bên thứ 3** | Clerk Auth                            | Quản lý định danh, xác thực người dùng (Login, Register, Social Auth). Hỗ trợ cho Next.js, Express, Fastify, Hono.                                                  |
|                       | Stripe                                | Cổng thanh toán quốc tế, xử lý giao dịch thẻ an toàn (Sandbox mode).                                                                                                |
|                       | VNPay                                 | Cổng thanh toán trong nước, tích hợp alongside Stripe cho Payment Service.                                                                                          |
|                       | Groq (LLM API)                        | Cung cấp mô hình ngôn ngữ lớn (LLM) cho AI Chatbot tư vấn du lịch và BI Agent phân tích dữ liệu.                                                                    |
|                       | Cloudinary                            | Lưu trữ và tối ưu hóa hình ảnh, video của khách sạn.                                                                                                                |
| **AI / ML**           | PyTorch 2.9                           | Deep learning framework cho Search & AI Service.                                                                                                                    |
|                       | Sentence Transformers (CLIP-ViT-B-32) | Trích xuất vector embedding từ hình ảnh và văn bản cho Visual/Semantic Search.                                                                                      |
|                       | scikit-surprise (SVD)                 | Collaborative Filtering cho Recommendation System.                                                                                                                  |
|                       | scikit-learn                          | Machine learning utilities cho AI pipeline.                                                                                                                         |
|                       | APScheduler                           | Lên lịch auto-retrain SVD model hàng ngày lúc 3:00 AM.                                                                                                              |
|                       | Redis (Python)                        | Cache cho recommendation results trong Search & AI Service.                                                                                                         |
|                       | SQLAlchemy + psycopg2                 | Truy cập PostgreSQL từ Python cho AI training data.                                                                                                                 |
|                       | pyvi                                  | Vietnamese NLP processing cho text analysis.                                                                                                                        |
