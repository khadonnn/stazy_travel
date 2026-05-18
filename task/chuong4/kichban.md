4. Kịch bản kiểm thử và đánh giá hệ thống

4.1. Kịch bản kiểm thử chức năng tìm kiếm

Kịch bản 1.1: Tìm kiếm khách sạn theo mô tả văn bản

- Đầu vào: Người dùng nhập mô tả "villa ven biển có hồ bơi, giá dưới 3 triệu"
- Quy trình: Hệ thống encode mô tả thành vector bằng CLIP model, thực hiện cosine similarity search trên tập hotel vectors đã được load vào RAM, kết hợp SQL filter theo giá và địa điểm
- Đầu ra: Danh sách khách sạn sắp xếp theo mức độ tương đồng, hiển thị kèm hình ảnh, giá và đánh giá
- Kết quả mong đợi: Trả về tối đa 5 khách sạn phù hợp, thời gian phản hồi dưới 2 giây

Kịch bản 1.2: Tìm kiếm khách sạn bằng hình ảnh

- Đầu vào: Người dùng kéo thả hình ảnh bãi biển lên trang tìm kiếm
- Quy trình: Hệ thống giải mã base64, encode hình ảnh thành vector 512 chiều bằng CLIP model, tính cosine similarity với tất cả hotel vectors
- Đầu ra: Danh sách khách sạn có hình ảnh tương tự nhất
- Kết quả mong đợi: Kết quả trả về có liên quan về phong cách và loại hình nghỉ dưỡng

Kịch bản 1.3: Tìm kiếm ngữ nghĩa qua AI Chatbot

- Đầu vào: Người dùng gửi tin nhắn "Tìm resort ở Đà Lạt cho gia đình, có hồ bơi cho trẻ em"
- Quy trình: Groq LLM phân loại intent là CONSULTATION, trích xuất location="Đà Lạt", semantic_query="resort gia đình hồ bơi trẻ em". Hệ thống thực hiện SQL filter kết hợp vector search
- Đầu ra: Trả lời tự nhiên kèm danh sách khách sạn phù hợp
- Kết quả mong đợi: Intent được phân loại đúng, tham số được trích xuất chính xác, khách sạn trả về phù hợp ngữ cảnh

  4.2. Kịch bản kiểm thử hệ thống gợi ý

Kịch bản 2.1: Gợi ý cho người dùng có nhiều tương tác (warm user)

- Điều kiện: Người dùng có trên 10 tương tác (VIEW, BOOK, WISHLIST)
- Chiến lược: SVD (mặc định)
- Quy trình: Hệ thống tải mô hình SVD đã huấn luyện, dự đoán điểm cho tất cả khách sạn chưa tương tác, kết hợp với Content-Based score theo tỷ lệ 60/40, merge với diverse_recommend để tránh bias vị trí
- Đầu ra: Top 5 khách sạn được gợi ý
- Kết quả mong đợi: Danh sách gợi ý đa dạng về vị trí địa lý, phù hợp với lịch sử xem và đặt phòng của người dùng

Kịch bản 2.2: Gợi ý cho người dùng mới (cold start)

- Điều kiện: Người dùng mới đăng ký, chưa có tương tác, đã chọn sở thích "Khách sạn, Resort" trong onboarding
- Chiến lược: Content-Based (fallback tự động)
- Quy trình: Hệ thống kiểm tra user không tồn tại trong SVD model, chuyển sang Content-Based, lọc khách sạn theo categories người dùng đã chọn
- Đầu ra: Top 5 khách sạn thuộc categories đã chọn, ưu tiên theo rating
- Kết quả mong đợi: Hệ thống không trả về lỗi, luôn có kết quả nhờ cơ chế fallback

Kịch bản 2.3: Gợi ý cho người dùng hoàn toàn mới (không có tương tác lẫn sở thích)

- Điều kiện: Guest user hoặc user chưa onboarding
- Chiến lược: Popular (fallback cuối cùng)
- Quy trình: Sắp xếp tất cả khách sạn theo tích reviewStar và reviewCount
- Đầu ra: Top 5 khách sạn phổ biến nhất
- Kết quả mong đợi: Không có lỗi, trả về khách sạn có rating cao nhất

Kịch bản 2.4: Khách sạn tương tự (trang chi tiết)

- Điều kiện: Người dùng đang xem chi tiết một khách sạn
- Chiến lược: Item-CF similarity
- Quy trình: Hệ thống tìm index của khách sạn hiện tại trong ma trận similarity, lấy 5 khách sạn có cosine similarity cao nhất
- Đầu ra: 5 khách sạn tương tự hiển thị ở cuối trang chi tiết
- Kết quả mong đợi: Khách sạn tương tự có cùng phân khúc giá và loại hình

Kịch bản 2.5: So sánh các chiến lược recommendation

- Điều kiện: Cùng một người dùng có trên 10 tương tác
- Thao tác: Gọi API lần lượt với các tham số strategy=svd, user_cf, item_cf, content, popular
- Đầu ra: 5 danh sách kết quả khác nhau
- Kết quả mong đợi: Mỗi chiến lược trả về kết quả khác nhau, SVD và CF cho kết quả cá nhân hóa tốt hơn Popular

  4.3. Kịch bản kiểm thử luồng đặt phòng

Kịch bản 3.1: Đặt phòng thành công

- Điều kiện: Khách sạn có phòng trống, người dùng đã đăng nhập
- Quy trình: Booking Service acquire Redis lock trên roomId và dateRange, tạo booking trạng thái PENDING, gọi Payment Service, nhận xác nhận thanh toán qua Kafka, cập nhật trạng thái CONFIRMED, gửi email qua BullMQ
- Kết quả mong đợi: Booking được tạo thành công, trạng thái chuyển từ PENDING sang CONFIRMED, email xác nhận được gửi

Kịch bản 3.2: Đặt phòng trùng (overbooking prevention)

- Điều kiện: Hai người dùng cùng đặt một phòng vào cùng thời điểm
- Quy trình: Người dùng thứ nhất acquire Redis lock thành công, người dùng thứ hai không acquire được lock do đã bị giữ
- Kết quả mong đợi: Chỉ có một booking được tạo thành công, người dùng thứ hai nhận thông báo phòng đã được đặt

Kịch bản 3.3: Hủy đặt phòng

- Điều kiện: Booking đang ở trạng thái CONFIRMED
- Quy trình: Booking Service cập nhật trạng thái CANCELLED, tạo sự kiện Kafka để Payment Service xử lý hoàn tiền, ghi nhận interaction TYPE=CANCEL cho hệ thống recommendation
- Kết quả mong đợi: Booking bị hủy, tương tác hủy được ghi nhận vào hệ thống gợi ý

  4.4. Kịch bản kiểm thử AI Chatbot

Kịch bản 4.1: Phân loại intent SEARCH

- Đầu vào: "Tìm khách sạn ở Nha Trang giá dưới 2 triệu"
- Kết quả mong đợi: intent_type=SEARCH, location="Nha Trang", price_max=2000000

Kịch bản 4.2: Phân loại intent BOOK

- Đầu vào: "Đặt phòng ở Muong Thanh cho ngày mai, 2 người lớn"
- Kết quả mong đợi: intent_type=BOOK, target_hotel_name="Muong Thanh", dates và guests_adults được trích xuất

Kịch bản 4.3: Phân loại intent FAQ

- Đầu vào: "Chính sách hủy phòng của khách sạn là gì?"
- Kết quả mong đợi: intent_type=FAQ, hệ thống tìm FAQ context phù hợp và trả lời

Kịch bản 4.4: Phân loại intent CONSULTATION

- Đầu vào: "So sánh resort ở Đà Lạt và Nha Trang"
- Kết quả mong đợi: intent_type=CONSULTATION, location="Đà Lạt" hoặc "Nha Trang", trả lời tư vấn kèm danh sách khách sạn

Kịch bản 4.5: Xử lý câu hỏi nhiều ý (secondary intent)

- Đầu vào: "Tìm khách sạn ở Vũng Tàu và cho tôi biết thời tiết ở đó"
- Kết quả mong đợi: intent_type=SEARCH, secondary_intent=LOCAL_GUIDE, location="Vũng Tàu"

Kịch bản 4.6: Kiểm thử ngữ cảnh hội thoại (conversation memory)

- Bước 1: Gửi "Tìm khách sạn ở Đà Lạt"
- Bước 2: Gửi "Giá dưới 1 triệu thôi"
- Kết quả mong đợi: Ở bước 2, hệ thống hiểu "giá dưới 1 triệu" áp dụng cho tìm kiếm ở Đà Lạt nhờ lịch sử chat được lưu trong Redis

  4.5. Kịch bản kiểm thử BI Agent

Kịch bản 5.1: Thống kê tổng quan

- Đầu vào: "Cho tôi xem thống kê tuần này"
- Kết quả mong đợi: Tổng doanh thu, tổng booking, dự báo 3 ngày tới, tỷ lệ tăng trưởng so với tuần trước

Kịch bản 5.2: Thống kê theo khách sạn

- Đầu vào: "Khách sạn nào có nhiều booking nhất?"
- Kết quả mong đợi: intent_type=BI_INSIGHTS, query_type=hotel, trả về danh sách top khách sạn kèm biểu đồ

Kịch bản 5.3: Thống kê theo người dùng

- Đầu vào: "Có bao nhiêu khách hàng mới tuần này?"
- Kết quả mong đợi: intent_type=BI_INSIGHTS, query_type=user, trả về số liệu người dùng mới và quay lại

Kịch bản 5.4: Phát hiện bất thường

- Điều kiện: Dữ liệu có ngày doanh thu giảm đột biến hơn 50%
- Kết quả mong đợi: Hệ thống phát hiện anomaly, LLM giải thích nguyên nhân có thể và đề xuất hành động

  4.6. Đánh giá hiệu quả mô hình gợi ý

  4.6.1. Đánh giá SVD Model (train_svd.py)

Quy trình đánh giá:

- Dữ liệu đầu vào: Kết hợp implicit signals (VIEW=0.5, CLICK=2.0, WISHLIST=3.0, BOOK=5.0, RATE_NEG=-3.0) với explicit ratings từ reviews. Explicit ghi đè implicit nếu cùng cặp (userId, hotelId)
- Tìm kiếm siêu tham số: GridSearchCV trên không gian 24 tổ hợp (n_factors: [50, 100, 150], n_epochs: [20, 30], lr_all: [0.005, 0.01], reg_all: [0.02, 0.1]) với 3-fold cross-validation
- Huấn luyện: SVD Optimized (best params) và SVD Baseline (default params) trên toàn bộ dữ liệu
- Đánh giá: 5-fold cross-validation cho cả hai mô hình

Chỉ số đánh giá: RMSE và MAE. So sánh Improvement = (Baseline - Optimized) / Baseline x 100%

4.6.2. Đánh giá Implicit CF System (evaluate.py --mode implicit)

Quy trình đánh giá:

- Dữ liệu: Implicit interactions (VIEW, CLICK, WISHLIST, BOOK) với trọng số tương ứng
- Chia dữ liệu: Temporal split 60% train, 20% validation, 20% test (sắp xếp theo thời gian, không ngẫu nhiên)
- Mô hình đánh giá: User-Based CF với Cosine Similarity, K=5 người dùng tương tự nhất
- Baseline: Top Popular Items (khách sạn có tổng trọng số tương tác cao nhất)
- Kịch bản đánh giá: Với mỗi user trong test set, sinh gợi ý top 5 từ CF và từ baseline, so sánh với các item user thực sự tương tác trong test set

Chỉ số đánh giá:

- Precision@5: Tỷ lệ gợi ý đúng trong 5 kết quả
- Recall@5: Tỷ lệ item liên quan được tìm thấy trong 5 kết quả
- NDCG@5: Chất lượng xếp hạng, item liên quan được xếp càng cao càng tốt

  4.6.3. Đánh giá Explicit CF System (evaluate.py --mode explicit)

Quy trình đánh giá:

- Dữ liệu: Explicit ratings (1-5 stars) từ reviews
- Chia dữ liệu: Temporal split 60/20/20
- Mô hình đánh giá: User-Based CF với Pearson Correlation, Mean-Centering, K=10 người dùng tương tự
- Baseline: Giá trị trung bình rating của mỗi người dùng (User Mean)
- Kịch bản đánh giá: Dự đoán rating cho các cặp (user, hotel) trong test set, so sánh với rating thực tế

Chỉ số đánh giá:

- RMSE: Sai số bình phương trung bình (đo khoảng cách giữa dự đoán và thực tế)
- MAE: Sai số tuyệt đối trung bình

  4.6.4. Bảng tổng hợp kết quả đánh giá (dành cho minh họa trong báo cáo)

Bảng 1: Kết quả đánh giá SVD Model

| Mô hình       | RMSE                | MAE        | Cải thiện RMSE | Cải thiện MAE |
| ------------- | ------------------- | ---------- | -------------- | ------------- |
| SVD Baseline  | (điền sau khi chạy) | (điền sau) | -              | -             |
| SVD Optimized | (điền sau)          | (điền sau) | (điền sau)%    | (điền sau)%   |

Bảng 2: Kết quả đánh giá Implicit CF (Ranking)

| Mô hình                | Precision@5 | Recall@5    | NDCG@5      |
| ---------------------- | ----------- | ----------- | ----------- |
| Top Popular (Baseline) | (điền sau)  | (điền sau)  | (điền sau)  |
| User-Based CF          | (điền sau)  | (điền sau)  | (điền sau)  |
| Cải thiện              | (điền sau)% | (điền sau)% | (điền sau)% |

Bảng 3: Kết quả đánh giá Explicit CF (Rating Prediction)

| Mô hình                 | RMSE        | MAE         |
| ----------------------- | ----------- | ----------- |
| User Mean (Baseline)    | (điền sau)  | (điền sau)  |
| User-Based CF (Pearson) | (điền sau)  | (điền sau)  |
| Cải thiện               | (điền sau)% | (điền sau)% |

Cách chạy đánh giá:

- SVD Model: cd apps/search-service && uv run python train_svd.py
- Implicit CF: cd apps/search-service && uv run python evaluate.py --mode implicit
- Explicit CF: cd apps/search-service && uv run python evaluate.py --mode explicit
- Cả hai: cd apps/search-service && uv run python evaluate.py --mode all
