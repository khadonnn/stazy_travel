# 📋 USE CASES - HỆ THỐNG ĐẶT PHÒNG STAZY

> Tài liệu mô tả chi tiết các use case (ca sử dụng) của hệ thống đặt phòng khách sạn STAZY

## 📑 Mục lục

- [User Use Cases](#user-use-cases)
- [Host Use Cases](#host-use-cases)
- [Admin Use Cases](#admin-use-cases)
- [System Use Cases](#system-use-cases)

---

## 👤 USER USE CASES

### UC-01: Đăng ký và Đăng nhập

**Actor**: Guest User

**Mô tả**: Người dùng tạo tài khoản mới hoặc đăng nhập vào hệ thống

**Luồng chính**:

1. User truy cập trang `/sign-up` hoặc `/sign-in`
2. Hệ thống hiển thị form Clerk Authentication
3. User nhập thông tin (email, password, hoặc OAuth)
4. Clerk xác thực thông tin
5. Hệ thống tạo JWT token và session
6. User được chuyển hướng về trang chủ

**Luồng phụ**:

- OAuth Login (Google, GitHub, Microsoft)
- Email verification
- Password reset

**Công nghệ**: Clerk, JWT, Product Service

---

### UC-02: Tìm kiếm khách sạn theo bộ lọc

**Actor**: User

**Mô tả**: Người dùng tìm kiếm khách sạn theo tiêu chí cụ thể

**Luồng chính**:

1. User truy cập `/hotels` hoặc `/search`
2. User nhập tiêu chí tìm kiếm:
   - Địa điểm (location)
   - Ngày check-in, check-out
   - Số khách
   - Khoảng giá
   - Số sao
   - Tiện nghi (amenities)
3. Frontend gọi `GET /hotels?location=...&price_min=...&price_max=...`
4. Product Service query database với filters
5. Hệ thống trả về danh sách khách sạn phù hợp
6. Frontend hiển thị kết quả với pagination

**Công nghệ**: Product Service, PostgreSQL, Prisma

---

### UC-03: Tìm kiếm bằng hình ảnh (AI Search)

**Actor**: User

**Mô tả**: Người dùng upload hoặc kéo thả ảnh để tìm khách sạn tương tự

**Luồng chính**:

1. User truy cập trang tìm kiếm AI
2. User kéo thả hoặc upload file ảnh
3. Frontend convert ảnh sang Base64
4. Frontend gọi `POST /search-by-base64` với payload `{ image: "data:image/..." }`
5. Search Service:
   - Giải mã Base64
   - Trích xuất vector từ ảnh bằng CLIP model
   - So sánh cosine similarity với database vectors
6. Trả về top 10 khách sạn tương đồng nhất
7. Frontend hiển thị kết quả với similarity score

**Công nghệ**: FastAPI, CLIP (Sentence Transformers), Vector Search

---

### UC-04: Tìm kiếm bằng mô tả văn bản (Semantic Search)

**Actor**: User

**Mô tả**: Người dùng nhập mô tả tự nhiên để tìm khách sạn

**Luồng chính**:

1. User nhập mô tả: _"villa ven biển có hồ bơi và spa"_
2. Frontend gọi `POST /search-by-text`
3. Search Service:
   - Convert text thành embedding vector
   - Tìm kiếm semantic similarity
4. Trả về khách sạn phù hợp nhất
5. Hiển thị kết quả có highlight từ khóa

**Công nghệ**: FastAPI, Sentence Transformers, NLP

---

### UC-05: Chat với AI Agent

**Actor**: User

**Mô tả**: Người dùng chat với AI để tìm kiếm và tư vấn khách sạn

**Luồng chính**:

1. User mở chat widget hoặc `/search`
2. User nhập câu hỏi: _"Tìm khách sạn 5 sao ở Đà Nẵng giá dưới 2 triệu"_
3. Frontend gọi `POST /agent/chat`
4. AI Agent:
   - Phân tích intent (tìm kiếm, đặt phòng, hỏi thông tin)
   - Trích xuất entities (location, price, stars)
   - Query database
   - Sinh câu trả lời tự nhiên
5. Trả về kết quả + danh sách khách sạn
6. User có thể hỏi tiếp (context-aware)

**Công nghệ**: FastAPI, NLP, LLM Integration (GPT/Claude)

---

### UC-06: Xem chi tiết khách sạn

**Actor**: User

**Mô tả**: Người dùng xem thông tin chi tiết về khách sạn

**Luồng chính**:

1. User click vào card khách sạn
2. Chuyển hướng đến `/hotels/[slug]` hoặc `/hotels/[id]`
3. Frontend gọi `GET /hotels/:id`
4. Product Service trả về:
   - Thông tin khách sạn đầy đủ
   - Danh sách phòng
   - Thông tin tác giả/host
   - Reviews và ratings
   - Amenities
5. Hiển thị gallery ảnh, bản đồ, mô tả
6. Hiển thị nút "Đặt phòng"

**Công nghệ**: Product Service, Next.js, PostgreSQL

---

### UC-07: Kiểm tra tình trạng còn phòng

**Actor**: User

**Mô tả**: Người dùng kiểm tra xem khách sạn còn phòng trong khoảng thời gian cụ thể

**Luồng chính**:

1. User chọn ngày check-in và check-out trên trang chi tiết
2. User click "Kiểm tra còn phòng"
3. Frontend gọi `GET /check-availability?hotelId=1&checkIn=2026-01-20&checkOut=2026-01-25`
4. Booking Service:
   - Query database tìm booking trùng lịch
   - Logic: `(StartCũ < EndMới) && (EndCũ > StartMới)`
   - Lọc theo status: CONFIRMED, PENDING, PAID
5. Trả về `{ available: true/false, message }`
6. Frontend hiển thị trạng thái và enable/disable nút đặt phòng

**Công nghệ**: Booking Service, MongoDB, Fastify

---

### UC-08: Tạo đơn đặt phòng (Booking)

**Actor**: Authenticated User

**Mô tả**: Người dùng tạo đơn đặt phòng với Redis lock chống race condition

**Luồng chính**:

1. User click "Đặt phòng ngay"
2. Hiển thị form nhập thông tin:
   - Họ tên, email, số điện thoại
   - Yêu cầu đặc biệt (optional)
3. User xác nhận thông tin
4. Frontend gọi `POST /` (Booking Service)
5. Backend logic:
   - **Bước 1**: Lấy thông tin khách sạn từ Product Service
   - **Bước 2**: Tính toán số đêm và tổng giá
   - **Bước 3**: **Khóa Redis** với key `booking:hotel:${hotelId}`
   - **Bước 4**: Kiểm tra availability trong lock
   - **Bước 5**: Nếu available → Tạo booking với status PENDING
   - **Bước 6**: Release lock
6. Trả về booking ID và chuyển hướng đến thanh toán
7. Nếu có conflict → Trả 409 Conflict

**Công nghệ**: Booking Service, Redis (Redlock), MongoDB

---

### UC-09: Thanh toán qua Stripe

**Actor**: Authenticated User

**Mô tả**: Người dùng thanh toán bằng thẻ quốc tế qua Stripe

**Luồng chính**:

1. User ở trang checkout
2. Frontend gọi `POST /sessions/create-checkout-session`
3. Payment Service:
   - Tạo Stripe Session với line_items
   - Embed metadata (bookingId, userId, hotelInfo, dates)
   - Return `clientSecret`
4. Frontend load Stripe Embedded Checkout
5. User nhập thông tin thẻ
6. User confirm payment
7. **Stripe webhook** gọi `POST /webhooks/stripe`
8. Payment Service:
   - Verify signature
   - Gửi event `booking-events` qua Kafka
9. Booking Service consumer:
   - Update booking status → PAID
   - Lưu snapshot khách sạn vào DB
10. Email Service gửi confirmation email
11. Socket Service gửi notification real-time

**Công nghệ**: Stripe, Hono, Kafka, Webhooks, ngrok

---

### UC-10: Thanh toán qua VNPay (QR Code)

**Actor**: User

**Mô tả**: Người dùng thanh toán bằng QR VNPay

**Luồng chính**:

1. User chọn "Thanh toán VNPay"
2. Frontend gọi `POST /vnpay/create-qr`
3. Payment Service tạo URL thanh toán VNPay
4. User được redirect đến trang VNPay
5. User quét mã QR hoặc chọn ngân hàng
6. Thanh toán thành công → VNPay redirect về `vnp_ReturnUrl`
7. Frontend parse query params để verify
8. Update booking status

**Công nghệ**: VNPay SDK, Hono, Webhooks

---

### UC-11: Xem lịch sử đặt phòng

**Actor**: Authenticated User

**Mô tả**: Người dùng xem các booking đã tạo

**Luồng chính**:

1. User truy cập `/my-bookings`
2. Frontend gọi `GET /user-bookings`
3. Booking Service:
   - Filter bookings theo userId
   - Sort theo createdAt descending
4. Trả về danh sách với thông tin:
   - Hotel name, image
   - Check-in, check-out dates
   - Status (PENDING, PAID, CONFIRMED, CANCELLED)
   - Total price
5. Hiển thị từng booking card với actions:
   - Xem chi tiết
   - Hủy booking (nếu chưa check-in)
   - Download invoice

**Công nghệ**: Booking Service, MongoDB

---

### UC-12: Nhận gợi ý khách sạn (AI Recommendation)

**Actor**: Authenticated User

**Mô tả**: Hệ thống gợi ý khách sạn phù hợp dựa trên hành vi người dùng

**Luồng chính**:

1. User truy cập trang chủ
2. Frontend gọi `GET /recommend/:user_id`
3. Search Service:
   - Load lịch sử tương tác từ `mock_interactions.json` hoặc database
   - Phân tích: viewed hotels, booked hotels, search queries
   - Collaborative filtering hoặc Content-based filtering
   - Tính similarity score
4. Trả về top 10 khách sạn phù hợp
5. Hiển thị section "Dành riêng cho bạn"

**Luồng phụ**: Nếu user mới → Trả về trending hotels hoặc popular hotels

**Công nghệ**: FastAPI, Machine Learning (Scikit-learn), Collaborative Filtering

---

### UC-13: Chat real-time với Admin/Host

**Actor**: Authenticated User

**Mô tả**: Người dùng chat với admin hoặc host để hỏi thông tin

**Luồng chính**:

1. User click icon chat ở góc màn hình
2. Frontend kết nối Socket.io: `socket.connect()`
3. User gửi tin nhắn
4. Frontend emit event `send_message`
5. Socket Service:
   - Lưu message vào MongoDB
   - Emit event tới admin đang online
6. Admin nhận tin nhắn real-time
7. Admin reply
8. User nhận reply real-time

**Công nghệ**: Socket.io, Fastify, MongoDB

---

### UC-14: Nhận thông báo real-time

**Actor**: Authenticated User

**Mô tả**: Người dùng nhận thông báo khi có sự kiện quan trọng

**Luồng chính**:

1. Có event xảy ra (booking confirmed, payment success, check-in reminder)
2. Backend service gửi event qua Kafka topic `notification-events`
3. Socket Service consumer nhận event
4. Socket Service emit `notification` tới user's room
5. Frontend hiển thị toast notification
6. Badge số thông báo chưa đọc tăng lên

**Công nghệ**: Socket.io, Kafka, Real-time Notifications

---

## 🏠 HOST USE CASES

### UC-15: Đăng ký làm Host

**Actor**: Authenticated User

**Mô tả**: Người dùng đăng ký để trở thành host và đăng khách sạn

**Luồng chính**:

1. User truy cập `/host`
2. Điền form đăng ký:
   - Thông tin cá nhân/doanh nghiệp
   - Giấy phép kinh doanh
   - Thông tin ngân hàng
3. Submit form
4. Admin review và approve
5. Role user được update thành "host"
6. Host có quyền tạo khách sạn

**Công nghệ**: Product Service, Clerk Roles, Admin Dashboard

---

### UC-16: Tạo khách sạn mới

**Actor**: Host

**Mô tả**: Host đăng khách sạn lên hệ thống

**Luồng chính**:

1. Host truy cập `/host/dashboard`
2. Click "Thêm khách sạn mới"
3. Điền form multi-step:
   - **Step 1**: Thông tin cơ bản (tên, địa chỉ, mô tả)
   - **Step 2**: Danh sách phòng (tên phòng, giá, tiện nghi)
   - **Step 3**: Upload ảnh (Cloudinary)
   - **Step 4**: Chính sách (hủy phòng, check-in/out time)
4. Preview trước khi submit
5. Frontend gọi `POST /hotels`
6. Product Service:
   - Validate data
   - Upload images to Cloudinary
   - Lưu vào PostgreSQL
   - Publish event `hotel.created` qua Kafka
7. Search Service consumer update vector database

**Công nghệ**: Product Service, Cloudinary, PostgreSQL, Kafka

---

### UC-17: Quản lý booking của khách sạn

**Actor**: Host

**Mô tả**: Host xem và quản lý các booking cho khách sạn của mình

**Luồng chính**:

1. Host truy cập `/host/dashboard/bookings`
2. Hiển thị danh sách booking:
   - Filter theo hotel
   - Filter theo status
   - Filter theo date range
3. Host có thể:
   - Xem chi tiết booking
   - Xác nhận booking (PENDING → CONFIRMED)
   - Hủy booking với lý do
4. Hệ thống gửi email notification cho khách

**Công nghệ**: Booking Service, Email Service, Kafka

---

## 👨‍💼 ADMIN USE CASES

### UC-18: Xem dashboard tổng quan

**Actor**: Admin

**Mô tả**: Admin xem dashboard với analytics và metrics

**Luồng chính**:

1. Admin truy cập `/` (Admin app port 3003)
2. Hệ thống hiển thị:
   - **Tổng doanh thu** (theo tháng, năm)
   - **Số lượng booking** (mới, hoàn thành, hủy)
   - **Số lượng user** (mới, active)
   - **Số lượng khách sạn** (active, pending approval)
   - **Charts**: Revenue trend, Booking trend
3. Data được lấy từ:
   - Product Service (hotels, users)
   - Booking Service (bookings)
   - Payment Service (revenue)

**Công nghệ**: Next.js, D3.js Charts, Aggregation Queries

---

### UC-19: Quản lý người dùng

**Actor**: Admin

**Mô tả**: Admin quản lý danh sách người dùng

**Luồng chính**:

1. Admin truy cập `/users`
2. Hiển thị table với columns:
   - Avatar, Name, Email
   - Role (user, host, admin)
   - Status (active, banned)
   - Joined date
3. Admin có thể:
   - Tìm kiếm user
   - Xem chi tiết profile
   - Thay đổi role
   - Ban/Unban user
   - Xóa user
4. Frontend gọi `PATCH /users/:id` hoặc `DELETE /users/:id`

**Công nghệ**: Product Service, Clerk Admin API, PostgreSQL

---

### UC-20: Duyệt khách sạn mới

**Actor**: Admin

**Mô tả**: Admin review và approve khách sạn do host tạo

**Luồng chính**:

1. Admin truy cập `/products?status=pending`
2. Xem danh sách khách sạn chờ duyệt
3. Click vào từng khách sạn để review:
   - Kiểm tra thông tin
   - Kiểm tra hình ảnh
   - Kiểm tra giấy phép
4. Admin approve hoặc reject
5. Frontend gọi `PUT /hotels/:id` với `{ status: 'approved' }`
6. Hệ thống gửi email thông báo cho host
7. Nếu approved → Hotel hiển thị trên Client app

**Công nghệ**: Product Service, Email Service, Admin Dashboard

---

### UC-21: Quản lý tất cả bookings

**Actor**: Admin

**Mô tả**: Admin xem và quản lý tất cả booking trong hệ thống

**Luồng chính**:

1. Admin truy cập `/bookings`
2. Frontend gọi `GET /bookings`
3. Hiển thị table với filters:
   - Status (All, Pending, Paid, Confirmed, Cancelled)
   - Date range
   - Hotel
   - User
4. Admin có thể:
   - Xem chi tiết booking
   - Refund booking
   - Export reports (CSV, PDF)

**Công nghệ**: Booking Service, MongoDB Aggregation, Export Libraries

---

### UC-22: Chat với khách hàng (Support)

**Actor**: Admin

**Mô tả**: Admin chat real-time với khách hàng để hỗ trợ

**Luồng chính**:

1. Admin truy cập `/message`
2. Frontend gọi `GET /conversations`
3. Hiển thị sidebar danh sách cuộc hội thoại:
   - User name/ID
   - Last message
   - Unread count badge
4. Admin click vào conversation
5. Frontend gọi `GET /messages/:userId`
6. Load lịch sử chat
7. Admin gửi tin nhắn
8. Socket.io emit real-time tới user
9. Auto mark as read: `POST /messages/mark-read`

**Công nghệ**: Socket Service, Booking Service, MongoDB, Socket.io

---

### UC-23: Xem badge thông báo tin nhắn chưa đọc

**Actor**: Admin

**Mô tả**: Admin thấy số lượng tin nhắn chưa đọc ở menu sidebar

**Luồng chính**:

1. Admin login vào admin app
2. Sidebar menu hiển thị icon "Messages"
3. Frontend gọi `GET /messages/unread-count`
4. Booking Service aggregate:
   - Đếm messages với `sender: 'user'` và `isRead: false`
5. Trả về `{ count: 5 }`
6. Hiển thị badge đỏ với số 5

**Công nghệ**: Booking Service, MongoDB Aggregation, Real-time Updates

---

### UC-24: Quản lý categories

**Actor**: Admin

**Mô tả**: Admin tạo/sửa/xóa categories cho khách sạn

**Luồng chính**:

1. Admin truy cập `/categories`
2. Hiển thị danh sách categories
3. Admin có thể:
   - Tạo category mới: `POST /categories`
   - Sửa category: `PUT /categories/:id`
   - Xóa category: `DELETE /categories/:id`
4. Categories được dùng để filter khách sạn

**Công nghệ**: Product Service, PostgreSQL, Prisma

---

## ⚙️ SYSTEM USE CASES

### UC-25: Event-Driven Communication qua Kafka

**Actor**: System

**Mô tả**: Các service giao tiếp với nhau thông qua Kafka events

**Luồng chính**:

1. **Khi thanh toán thành công**:
   - Payment Service publish event `booking-events`
   - Booking Service consume và update status
   - Email Service consume và gửi email
   - Socket Service consume và gửi notification

2. **Khi tạo khách sạn mới**:
   - Product Service publish `hotel.created`
   - Search Service consume và update vectors

3. **Khi hủy booking**:
   - Booking Service publish `booking.cancelled`
   - Email Service gửi email refund
   - Payment Service xử lý refund

**Công nghệ**: Apache Kafka (3 brokers), KafkaJS

---

### UC-26: Cron Jobs tự động

**Actor**: System

**Mô tả**: Hệ thống chạy các tác vụ định kỳ tự động

**Luồng chính**:

1. **Check-in reminder** (Chạy mỗi ngày lúc 8AM):
   - Query bookings có checkIn = tomorrow
   - Gửi reminder email
   - Gửi push notification

2. **Auto cancel expired bookings** (Chạy mỗi giờ):
   - Query bookings PENDING quá 30 phút
   - Update status → CANCELLED
   - Release phòng

3. **Generate daily reports** (Chạy lúc 0h):
   - Aggregate dữ liệu ngày hôm qua
   - Lưu vào reports table
   - Gửi email cho admin

**Công nghệ**: node-cron, Booking Service, Fastify

---

### UC-27: Cache với Redis

**Actor**: System

**Mô tả**: Hệ thống cache dữ liệu thường xuyên truy cập

**Luồng chính**:

1. Client request `GET /hotels?location=hanoi`
2. Backend check Redis cache key `hotels:location:hanoi`
3. Nếu **cache hit** → Trả về ngay lập tức
4. Nếu **cache miss**:
   - Query PostgreSQL
   - Lưu vào Redis với TTL 5 phút
   - Trả về kết quả
5. Cache invalidation khi có update

**Công nghệ**: Redis, Booking Service

---

### UC-28: Distributed Lock với Redlock

**Actor**: System

**Mô tả**: Ngăn chặn race condition khi nhiều request đặt phòng cùng lúc

**Luồng chính**:

1. Request 1 và Request 2 cùng đặt phòng hotel ID 123
2. Request 1 acquire lock `booking:hotel:123` thành công
3. Request 2 chờ hoặc fail ngay lập tức
4. Request 1 xử lý booking logic
5. Request 1 release lock
6. Request 2 thử lại → Phát hiện phòng đã hết → Trả 409

**Công nghệ**: Redis, Redlock, Booking Service

---

### UC-29: AI Vector Search với pgvector

**Actor**: System

**Mô tả**: Tìm kiếm semantic dựa trên vector embeddings

**Luồng chính**:

1. Khi upload hotel mới:
   - Extract features từ ảnh bằng CLIP
   - Lưu vector vào `hotel_vectors.json` hoặc PostgreSQL pgvector
2. Khi search:
   - Convert query (text/image) thành vector
   - Tính cosine similarity với tất cả vectors
   - Rank theo score và trả về top K

**Công nghệ**: pgvector, PostgreSQL, CLIP Model

---

### UC-30: Real-time Notifications với Socket.io

**Actor**: System

**Mô tả**: Gửi thông báo real-time cho users

**Luồng chính**:

1. User kết nối Socket.io khi vào trang
2. Backend join user vào room theo userId
3. Khi có event (payment success, booking confirmed):
   - Backend emit `notification` tới room
4. Frontend hiển thị toast notification
5. Lưu vào notification center

**Công nghệ**: Socket.io, Fastify, Redis (Pub/Sub)

---

## 📊 SUMMARY

### Tổng số Use Cases: 30

**Phân loại**:

- **User Use Cases**: 14 (UC-01 đến UC-14)
- **Host Use Cases**: 3 (UC-15 đến UC-17)
- **Admin Use Cases**: 7 (UC-18 đến UC-24)
- **System Use Cases**: 6 (UC-25 đến UC-30)

### Công nghệ sử dụng

| Công nghệ                  | Số Use Cases |
| -------------------------- | ------------ |
| Booking Service (Fastify)  | 12           |
| Product Service (Express)  | 10           |
| Payment Service (Hono)     | 4            |
| Search Service (FastAPI)   | 5            |
| Socket Service (Socket.io) | 4            |
| Kafka                      | 3            |
| Redis                      | 3            |
| AI/ML                      | 4            |
| PostgreSQL                 | 8            |
| MongoDB                    | 6            |

---

**Tài liệu này được tạo tự động từ codebase STAZY - Cập nhật lần cuối: 21/01/2026**
