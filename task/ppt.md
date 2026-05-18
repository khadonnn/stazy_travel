# 📊 KỊCH BẢN THUYẾT TRÌNH POWERPOINT - STAZY

---

## SLIDE 1: TRANG BÌA

- **Tên đề tài:** Xây dựng hệ thống đặt phòng khách sạn trực tuyến STAZY
- **Sinh viên:** Nguyễn Đình Đông Kha - 24210137
- **Giảng viên hướng dẫn:** ...
- **Năm:** 2026

---

## SLIDE 2: MỤC LỤC

1. Lý do chọn đề tài & Mục tiêu
2. Tổng quan công nghệ & Use Case
3. Demo hệ thống
4. Kết luận & Kết quả đạt được
5. Hướng phát triển

---

## PHẦN 1: LÝ DO CHỌN ĐỀ TÀI

### SLIDE 3: Lý do chọn đề tài

- **Thực tế:** Ngành du lịch Việt Nam tăng trưởng mạnh → Nhu cầu đặt phòng trực tuyến tăng cao
- **Vấn đề:** Các hệ thống hiện tại (Booking.com, Agoda) là nước ngoài → Thiếu tối ưu cho thị trường Việt
- **Khoảng trống công nghệ:** Hầu hết hệ thống booking VN chỉ là CRUD đơn giản → Thiếu AI tìm kiếm thông minh, gợi ý cá nhân hóa
- **Mục tiêu học tập:** Áp dụng kiến thức thực tế về Microservices, Event-Driven, AI/ML vào đồ án

> **Ví dụ:** Người dùng muốn tìm "khách sạn ven biển Đà Nẵng có hồ bơi" → Hệ thống truyền thống chỉ filter theo keyword, STAZY dùng **Semantic Search** (AI) để hiểu ngữ nghĩa

---

### SLIDE 3.1: Mục tiêu & Phạm vi

**Mục tiêu:**

- Xây dựng hệ thống đặt phòng khách sạn **microservices** với kiến trúc hiện đại
- Tích hợp **AI tìm kiếm** (text, hình ảnh) và **gợi ý cá nhân hóa** (Collaborative Filtering)
- Hỗ trợ thanh toán đa phương thức (Stripe, VNPay)
- Dashboard quản trị với **BI Analytics** nâng cao

**Phạm vi:**

- **Client App** (Next.js): Người dùng đặt phòng, tìm kiếm, nhận gợi ý
- **Admin App** (Next.js): Quản trị viên giám sát, phê duyệt, phân tích
- **6 Microservices:** Product, Booking, Payment, Email, Socket, AI/Search
- **Database:** PostgreSQL (shared) + Redis (cache/lock/queue)
- **Message Broker:** Kafka cho giao tiếp liên service

---

## PHẦN 2: TỔNG QUAN CÔNG NGHỆ & USE CASE

### SLIDE 4: Tổng quan kiến trúc hệ thống (Architecture Diagram)

**Hiển thị sơ đồ kiến trúc microservices:**

| Layer                | Công nghệ                                                              | Vai trò                               |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| **Frontend**         | Next.js 16 + TypeScript + Tailwind CSS                                 | Client App (:3002), Admin App (:3003) |
| **API Gateway**      | Fastify + http-proxy                                                   | Proxy, CORS, routing (:3000)          |
| **Backend Services** | Express (Product :8000), Fastify (Booking :8001), Hono (Payment :8002) | Business logic                        |
| **AI Service**       | FastAPI + Python (:8008)                                               | Search, Recommend, Chat AI            |
| **Database**         | PostgreSQL + Prisma ORM                                                | Shared DB (:5432)                     |
| **Cache/Queue**      | Redis (ioredis + Redlock + BullMQ)                                     | Lock, cache, async jobs (:6379)       |
| **Message Broker**   | Apache Kafka (3 brokers)                                               | Event-driven (:9094-9096)             |
| **Realtime**         | Socket.io (Fastify)                                                    | Chat, notifications (:3005)           |
| **Auth**             | Clerk (JWT + OAuth)                                                    | Xác thực & phân quyền                 |
| **Payment**          | Stripe + VNPay                                                         | Thanh toán quốc tế & nội địa          |

---

### SLIDE 5: Frontend & UI Framework

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **UI Library:** shadcn/ui + Tailwind CSS + Framer Motion
- **State Management:** React Query (TanStack Query) cho server state
- **Auth:** Clerk SDK (`@clerk/nextjs`) - OAuth Google, GitHub, Microsoft

> **Ví dụ:** Trang `/hotels/[slug]` dùng Server Component để SSR → SEO tốt, React Query prefetch → UX mượt

---

### SLIDE 6: Backend & Microservices

| Service           | Framework           | Ngôn ngữ   | Port | Trách nhiệm chính              |
| ----------------- | ------------------- | ---------- | ---- | ------------------------------ |
| Gateway           | Fastify             | TypeScript | 3000 | Proxy + CORS                   |
| Product Service   | Express 5           | TypeScript | 8000 | CRUD Hotels, Categories        |
| Booking Service   | Fastify 5           | TypeScript | 8001 | Đặt phòng, Redis Lock          |
| Payment Service   | Hono                | TypeScript | 8002 | Stripe, VNPay, Webhooks        |
| Email Service     | HTTP native         | TypeScript | 8003 | Gửi email (Nodemailer)         |
| Socket Service    | Fastify + Socket.io | TypeScript | 3005 | Chat, Realtime notify          |
| AI/Search Service | FastAPI             | Python     | 8008 | Vector Search, Recommend, Chat |

---

### SLIDE 7: Database & Infrastructure

**PostgreSQL (Shared Database):**

- Tables: Hotel, Category, User, Booking, Payment, Review, Favorite, Interaction, ChatMessage, Badge
- ORM: Prisma với @prisma/adapter-pg

**Redis (3用途):**

- **Distributed Lock (Redlock):** Chống race condition khi đặt phòng cùng lúc
- **Room Hold:** Giữ chỗ tạm thời khi user đang checkout
- **BullMQ:** Async job queue cho email, payment, socket

**Kafka (Event-Driven):**

- Topics: `hotel.created`, `hotel.deleted`, `booking-events`, `payment-events`, `booking.confirmed`, `user.created`
- Flow: Service A publish → Kafka → Service B consume → Xử lý bất đồng bộ

> **Ví dụ luồng đặt phòng:**
> `POST /bookings` → Redis Lock → Prisma INSERT → Outbox → Kafka → Payment Service → Stripe → Webhook → Kafka → Booking CONFIRMED → Socket notify + Email

---

### SLIDE 8: Use Case - Hotel Booking (Quan trọng)

**UC-08: Tạo đơn đặt phòng (Booking Happy Path)**

1. User click "Đặt phòng ngay" → Nhập thông tin
2. Frontend gọi `POST /bookings`
3. Backend:
   - **Redis Lock** (Redlock) → Chống 2 người cùng đặt 1 phòng
   - Kiểm tra availability → `(StartCũ < EndMới) && (EndCũ > StartMới)`
   - Tạo booking status `PENDING`
   - Publish Kafka `booking-events`
4. Payment Service consume → Tạo **Stripe Checkout Session**
5. User thanh toán → Stripe Webhook → `POST /webhooks/stripe`
6. Kafka `PAYMENT_PROCESSED` → Booking Service update → `CONFIRMED`
7. Socket Service notify realtime + Email Service gửi confirmation

**UC-09: Thanh toán Stripe** - Checkout embedded, webhook verify signature

**UC-07: Kiểm tra còn phòng** - `GET /check-availability` → Query DB + Redis getHold

---

### SLIDE 9: Use Case - Collaborative Filtering & AI

**UC-12: AI Recommendation (Collaborative Filtering)**

- **Content-based Filtering:** Gợi ý theo sở thích user chọn (categories)
  - Hiển thị: Section "Dành riêng cho bạn" ⭐
  - Logic: Match hotel categories ↔ user preferences
- **Collaborative Filtering (SVD):** Gợi ý dựa trên hành vi user tương tự
  - Hiển thị: Section "AI khuyến nghị cho bạn" 🧠
  - Data: Interactions (VIEW, LIKE, BOOK, RATING)
  - Model: SVD matrix factorization → Train hàng ngày
  - Cache: 1 giờ trong bảng `Recommendation`
  - Condition: User có ≥ 10 interactions

**UC-03: Tìm kiếm bằng hình ảnh (AI Search)**

- Upload ảnh → CLIP model extract vector → Cosine similarity → Top 10 kết quả

**UC-04: Semantic Search** - Text → Embedding → Vector search

**UC-05: Chat với AI Agent** - GPT-4 phân tích intent → Query DB → Trả lời tự nhiên

---

## PHẦN 3: DEMO HỆ THỐNG

### SLIDE 10: Demo - Client Routes (Chọn để demo)

**Routes nên demo trên Client App:**

| #   | Route                   | Demo gì                                                          | Lý do chọn                                     |
| --- | ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| 1   | `/` (Homepage)          | HeroSection + PersonalizedSection + AI Recommendations           | Thể hiện 2 hệ thống gợi ý (Content-based + CF) |
| 2   | `/hotels`               | Danh sách khách sạn + Filter (location, price, stars, amenities) | Thể hiện UC-02: Tìm kiếm theo bộ lọc           |
| 3   | `/hotels/[slug]`        | Chi tiết KS + Check availability + Nút đặt phòng                 | Thể hiện UC-06, UC-07                          |
| 4   | `/search-service`       | AI Search (text + image upload) + Chat AI Agent                  | Thể hiện UC-03, UC-04, UC-05 - Điểm nhấn AI    |
| 5   | `/checkout` → `/return` | Flow thanh toán Stripe/VNPay                                     | Thể hiện UC-09, UC-10                          |
| 6   | `/my-bookings`          | Lịch sử đặt phòng với status badges                              | Thể hiện UC-11                                 |

**Thứ tự demo gợi ý:**

1. **Homepage** → Onboarding modal chọn sở thích → Personalized + AI section
2. **Search Service** → Demo tìm kiếm bằng ảnh + Chat AI
3. **Hotels** → Filter → Chi tiết → Check availability → Đặt phòng
4. **Checkout** → Thanh toán Stripe → Return page
5. **My Bookings** → Xem kết quả booking

---

### SLIDE 11: Demo - Admin Charts (Analytics Dashboard)

**Dashboard Home (`/`):**
| Chart | Loại | Dữ liệu | Ý nghĩa |
|-------|------|----------|----------|
| **Revenue Stats** | Bar Chart (Recharts) | Doanh thu theo tháng (total + successful) | Theo dõi doanh thu |
| **Booking Trend** | Area Chart | Bookings + Cancellations theo thời gian | Xu hướng đặt phòng |
| **Browser Stats** | Pie Chart | Phân bố trình duyệt người dùng | Phân tích user |

**Analytics Page (`/analytics`):**
| Chart | Loại | Dữ liệu | Ý nghĩa |
|-------|------|----------|----------|
| **Interaction Type Stats** | Bar Chart | VIEW, LIKE, BOOK, RATING distribution | Hành vi người dùng |
| **Rating Distribution** | Pie Chart | Phân bố đánh giá (1-5 sao) | Chất lượng dịch vụ |
| **User Group Comparison** | Bar Chart | So sánh Guest vs Active users | Phân khúc user |
| **Evaluation History** | Line Chart | RMSE, Precision@5, Recall@5 qua các lần train | Hiệu suất AI model |
| **Algorithm Comparison** | Bar Chart | So sánh các thuật toán recommend | Đánh giá AI |
| **Funnel Chart** | Funnel | View → Like → Book conversion | Tỷ lệ chuyển đổi |
| **Histogram** | Histogram | Phân bố số lượng interactions/user | Mức độ engagement |
| **Bubble Chart** | Scatter | Views vs Bookings per hotel (size = rating) | Phân tích khách sạn |
| **Word Cloud** | Word Cloud | Tần suất từ khóa trong reviews | Sentiment analysis |
| **Top N Hotels** | Bar Chart | Top khách sạn theo bookings | Best performers |

**BI Chat Agent (`/message`):**

- Chat với AI để phân tích business intelligence
- Hiển thị charts inline (Line, Bar) trong chat response
- Metrics: Growth rate, Revenue forecast, Daily active users

---

## PHẦN 4: KẾT LUẬN & KẾT QUẢ

### SLIDE 12: Kết quả đạt được

**Về mặt kỹ thuật:**

- ✅ Hệ thống **microservices** hoàn chỉnh với 6 services
- ✅ **Event-Driven Architecture** qua Kafka (6 topics, 4 worker types)
- ✅ **Distributed Lock** với Redis Redlock → Chống overbooking
- ✅ **AI Integration:**
  - Semantic Search (text + image) với CLIP model
  - Collaborative Filtering (SVD) cho gợi ý cá nhân hóa
  - AI Chat Agent với GPT-4
- ✅ **Thanh toán đa phương thức:** Stripe (quốc tế) + VNPay (nội địa)
- ✅ **Realtime:** Socket.io cho chat + notifications
- ✅ **Admin Dashboard:** 10+ loại chart phân tích, BI Agent

**Về mặt kiến trúc:**

- ✅ Monorepo với Turborepo + pnpm workspace
- ✅ Shared packages: `@repo/product-db`, `@repo/booking-db`, `@repo/kafka`, `@repo/bullmq`, `@repo/types`
- ✅ API Gateway (Fastify) làm reverse proxy + CORS
- ✅ Async processing với BullMQ (8 queue types)

---

### SLIDE 13: Kinh nghiệm rút ra

- **Microservices** giúp tách biệt logic nhưng tăng complexity → Cần Kafka/RabbitMQ để giao tiếp
- **Redis** đa năng: cache, lock, queue (BullMQ) → Giảm số lượng infrastructure
- **Event-Driven** giúp decouple services nhưng cần xử lý eventual consistency
- **AI/ML integration** vào web app khả thi với FastAPI + Python riêng biệt
- **Monorepo** giúp share code giữa services nhưng cần quản lý dependency cẩn thận

---

## PHẦN 5: HƯỚNG PHÁT TRIỂN

### SLIDE 14: Hướng phát triển tương lai

**Ngắn hạn (1-3 tháng):**

- 🔧 Triển khai Kubernetes (K8s) cho container orchestration
- 🔧 Thêm CI/CD pipeline (GitHub Actions)
- 🔧 Implement rate limiting + API key management
- 🔧 Thêm unit test + integration test (Jest, Playwright)

**Trung hạn (3-6 tháng):**

- 🚀 Multi-language support (i18n) - tiếng Việt, Anh, Trung
- 🚀 Mobile app (React Native) chung codebase
- 🚀 Thêm VNPay callback + refund flow hoàn chỉnh
- 🚀 Implement CDN cho images (CloudFront)

**Dài hạn (6-12 tháng):**

- 🌟 **AI nâng cao:** Fine-tune model cho thị trường VN, dynamic pricing
- 🌟 **Multi-tenant:** Cho phép nhiều chuỗi khách sạn quản lý riêng
- 🌟 **Analytics nâng cao:** Predictive analytics, churn prediction
- 🌟 **Blockchain:** Smart contract cho booking confirmation

---

### SLIDE 15: Cảm ơn & Hỏi đáp

- **Cảm ơn giảng viên** đã hướng dẫn
- **Cảm ơn hội đồng** đã lắng nghe
- **Q&A**

---

## 📌 GHI CHÚ CHO NGƯỜI TRÌNH BÀY

### Thời gian dự kiến (15-20 phút):

| Phần                         | Thời gian | Slide        |
| ---------------------------- | --------- | ------------ |
| Phần 1: Lý do + Mục tiêu     | 2-3 phút  | Slide 3, 3.1 |
| Phần 2: Công nghệ + Use Case | 5-6 phút  | Slide 4-9    |
| Phần 3: Demo                 | 5-7 phút  | Slide 10-11  |
| Phần 4: Kết luận             | 2-3 phút  | Slide 12-13  |
| Phần 5: Hướng phát triển     | 1-2 phút  | Slide 14     |
| Q&A                          | 2-3 phút  | Slide 15     |

### Tips khi demo:

- **Client:** Chuẩn bị sẵn tài khoản Clerk test + Stripe test mode
- **Admin:** Chuẩn bị data mẫu cho charts (seed database trước)
- **AI Search:** Chuẩn bị ảnh mẫu để test image search
- **Backup:** Quay video demo phòng trường hợp mạng lỗi
