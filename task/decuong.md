ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH
TRƯỜNG ĐẠI HỌC
CÔNG NGHỆ THÔNG TIN CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc Lập - Tự Do - Hạnh Phúc

ĐỀ CƯƠNG CHI TIẾT

TÊN ĐỀ TÀI TIẾNG VIỆT: Nghiên cứu và phát triển nền tảng đặt phòng khách sạn thông minh và phân tích hành vi người dùng
TÊN ĐỀ TÀI TIẾNG ANH: Research and development of a smart hotel booking platform and user behavior analysis

Nội dung đề tài:(Mô tả chi tiết mục tiêu, phạm vi, đối tượng, phương pháp thực hiện, kết quả mong đợi của đề tài)

1. MỤC TIÊU CỦA ĐỀ TÀI
   1.1. Mục tiêu nghiên cứu
   • Nghiên cứu và đánh giá hiệu quả của Hệ thống gợi ý lai (Hybrid Recommender System), bao gồm phương pháp lọc dựa trên nội dung (Content-based Filtering) để giải quyết bài toán cold-start và phương pháp lọc cộng tác (Collaborative Filtering: Memory-based, Model-based) nhằm nâng cao độ chính xác và khả năng cá nhân hóa gợi ý.
   • Nghiên cứu xu hướng hành vi người dùng từ dữ liệu phản hồi ngầm định (Implicit feedback: **CLICK_BOOK_NOW, ADD_TO_WISHLIST, BOOK**) và phản hồi tường minh (Explicit feedback: RATING, REVIEW/COMMENT) để cải thiện chất lượng đề xuất.
   • Kiểm chứng tính khả thi và hiệu quả thông qua các chỉ số đánh giá như Precision@K, Recall@K, RMSE, trên một tập dữ liệu giả lập phù hợp với ngữ cảnh du lịch và khách sạn.
   1.2. Mục tiêu thực tiễn
   • Xây dựng được prototype hệ thống đặt phòng khách sạn thông minh, theo kiến trúc microservices, tích hợp: hệ thống quản lý khách sạn, chatbox AI giúp đặt phòng, thanh toán, gửi email, tìm kiếm theo ảnh tương đồng dùng vector AI, gợi ý cá nhân hóa và dashboard phân tích hành vi người dùng, trực quan hoá bằng biểu đồ.
   • Chứng minh rằng việc kết hợp đa dạng nguồn phản hồi người dùng (explicit + implicit feedback) vào mô hình gợi ý lai (Hybrid) mang lại hiệu quả cao hơn trong bối cảnh ứng dụng đặt phòng khách sạn hiện nay.
   • Triển khai semantic/vector search bằng Prisma + PostgreSQL pgvector thay vì vector DB tách rời.
2. KIẾN TRÚC ỨNG DỤNG TỔNG THỂ
   o Hệ thống đặt phòng khách sạn thông minh được thiết kế theo kiến trúc Microservices và vận hành theo hướng sự kiện qua Kafka (Event-Driven Architecture).

Mô tả các khối chính:
2.1. Lớp cổng giao tiếp (Gateway Layer)
• API Gateway: Là điểm truy cập duy nhất từ client (web/app), đảm nhiệm định tuyến, xác thực (JWT), kiểm soát truy cập và ghi log.
2.2. Lớp dịch vụ nghiệp vụ (Domain Services)
• Product Service: quản lý khách sạn, danh mục, thông tin người dùng liên quan nghiệp vụ listing.
• Booking Service: quản lý vòng đời đặt phòng, đồng bộ dữ liệu booking, xử lý analytics cron, trigger train AI.
• Payment Service: xử lý phiên thanh toán (Stripe/VNPAY), nhận webhook và phát sự kiện thanh toán.
• Search Service (SmartSearch + Recommendation): dịch vụ AI bằng FastAPI/Python, gồm semantic search, image search, chatbot agent và recommendation.
2.3. Lớp dịch vụ hỗ trợ (Supporting Services):
• Email Service: dùng Docker tích hợp với consume Kafka event và gửi email chào mừng/xác nhận đặt phòng.
• Socket Service: hỗ trợ kênh realtime notification/chat theo sự kiện.
• Auth: dùng Clerk/JWT middleware ở các service Node.js/Fastify/Hono.
2.4. Lớp lõi gợi ý và phân tích hành vi (Recommendation & Analytics Core):
• Recommendation: Triển khai cold-start để khởi tạo gợi ý base-content, khi người dùng chọn vào những khác sạn khác thì triển khai CF + SVD, có phân tách user cũ/user mới, có bảng database nhằm lưu lại cache recommendation cho từng user.
• Behavior Analytics: Tổng hợp và thu thập Interaction, tổng hợp DailyStat, lưu SystemMetric và hiển thị dashboard RMSE/Precision/Recal. Phân tích và trực quan hóa hành vi người dùng (qua dashboard), đồng thời cung cấp dữ liệu để huấn luyện/cập nhật mô hình gợi ý.
2.5. Lớp hạ tầng (Infrastructure Layer)
• Message Broker (Kafka):
o Đóng vai trò trung gian truyền tải sự kiện giữa các dịch vụ (event bus).
• Database Layer:
o CSDL quan hệ (PostgreSQL + Prisma + Pgvector): Lưu trữ dữ liệu nghiệp vụ (khách sạn, người dùng, đơn đặt phòng).
o CSDL phi quan hệ (MongoDB/Redis): Mongodb dùng lưu booking theo luồng hiện tại. Redis cache kết quả gợi ý hoặc lịch sử tương tác thông qua chatbox.
• Identity Provider:
o Cung cấp cơ chế xác thực và phân quyền người dùng (OAuth2, JWT). 3. ĐỐI TƯỢNG VÀ PHẠM VI NGHIÊN CỨU
• Đối tượng nghiên cứu: Kiến trúc Microservices, Event-Driven, Hệ thống gợi ý Lai (Content-based và Collaborative Filtering), hành vi người dùng (User Behavior Analysis), và các chỉ số đánh giá mô hình gợi ý (Precision, Recall, RMSE)
• Phạm vi nghiên cứu:
o Hệ thống: Xây dựng prototype để kiểm chứng các chức năng, tính khả thi của hệ thống gợi ý.
o Back-end: Triển khai đầy đủ các microservice chính (Product Service, Booking Service, Payment Service, Search Service, Email Service, Socket Service).
o Front-end: Giao diện web dùng nextjs cho client app và admin dashboard. Xây dựng đơn giản cho các chức năng: tìm kiếm, xem, đặt, hủy, gợi ý khách sạn.
o Dữ liệu: Sử dụng dữ liệu giả lập (mock data).
o Thuật toán: Tập trung vào hệ thống gợi ý lai. 4. PHƯƠNG PHÁP NGHIÊN CỨU
• Nghiên cứu lý thuyết: Tổng hợp kiến thức từ sách, báo khoa học, các bài viết kỹ thuật về các đối tượng nghiên cứu.
• Phân tích và thiết kế hệ thống:
o Phân tích nghiệp vụ: Sử dụng sơ đồ BPMN (Business Process Model and Notation) để mô hình hóa các luồng nghiệp vụ chính như tìm kiếm, đặt chỗ và thanh toán.
o Phân tích chức năng: Sử dụng sơ đồ Use Case để mô tả vai trò người dùng (User) và các chức năng chính: Tìm kiếm, chatbox AI, xem chi tiết khách sạn, đặt phòng, thanh toán, gợi ý, đánh giá.
o Thiết kế cơ sở dữ liệu: Áp dụng mẫu thiết kế Database per Service, mỗi microservice sẽ quản lý CSDL riêng để đảm bảo tính độc lập và khả năng mở rộng. Riêng SmartSearchService sẽ sử dụng một CSDL vector (ví dụ: pgvector) với hai mục đích chính:
 Lưu trữ embedding của truy vấn ngôn ngữ hoặc hình ảnh, phục vụ chức năng tìm kiếm ngữ nghĩa (semantic search) và phân tích xu hướng tìm kiếm của người dùng.
 Thực hiện kỹ thuật Semantic và Vector Search, giúp hệ thống truy xuất và tìm kiếm kết quả tương đồng dựa trên mức độ phù hợp của vector, nâng cao trải nghiệm người dùng.
o Thiết kế xử lý giao dịch:
 Để đảm bảo tính nhất quán dữ liệu trong các giao dịch phân tán giữa nhiều dịch vụ (ví dụ: đặt phòng và thanh toán), hệ thống áp dụng Saga Orchestration Pattern để điều phối và phục hồi khi có lỗi.
 Đồng thời, sử dụng Transactional Outbox Pattern để đảm bảo sự kiện (BOOKING_CREATED, PAYMENT_FAILED) được gửi đi đáng tin cậy, kể cả khi có sự cố.
 PaymentService trong mô hình chỉ là dịch vụ mô phỏng, hoạt động như webhook giả lập nhằm kiểm thử luồng đặt – thanh toán – huỷ trong môi trường prototype.
• Nghiên cứu thực nghiệm: Triển khai hệ thống dựa vào kế hoạch thiết kế, xây dựng giao diện đơn giản, tiến hành lập trình.
• Kiểm thử và đánh giá: Để đảm bảo chất lượng của hệ thống, phương pháp kiểm thử sẽ tập trung vào:
o Unit Test: Kiểm tra từng microservice độc lập.
o Integration Test: Kiểm tra luồng dữ liệu giữa BookingService, UserService, BehaviorAnalyticsService và RecommendationService. 5. DỰ KIẾN KẾT QUẢ ĐẠT ĐƯỢC
• Về kỹ thuật:
o Hệ thống prototype hoàn chỉnh, có thể mô phỏng nền tảng đặt phòng khách sạn thông minh, hoạt động theo kiến trúc microservices.
o Tích hợp mô hình gợi ý Lai (Hybrid Recommender System), giải quyết được bài toán người dùng mới (Cold-start) và nâng cao trải nghiệm người dùng.
• Về ứng dụng thực tiễn:
o Nâng cao hiệu quả của việc kết hợp hệ thống gợi ý với phân tích hành vi người dùng trong hệ thống đặt phòng trực tuyến hiện nay.
• Về học thuật:
o Hoàn thành báo cáo đồ án tốt nghiệp, trình bày chi tiết quá trình nghiên cứu hệ thống gợi ý, các thuật toán liên quan và kết quả đạt được.
