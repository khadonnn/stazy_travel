có thể đổi từ hàm rating random hiện tại sang NHPP và Gaussian Mixture hoặc (rating=base_score\ +\ noise
Trong đó:
`base_score` được xác định dựa trên cluster của user (budget: 3.0, mid-range: 4.0, luxury: 4.5)
`noise ~ N(0, 0.5)` (nhiễu Gaussian)
) nhưng vẫn giữ được tối thiểu Số người dùng 200
Số khách sạn 255
Tổng lượt tương tác (implicit) 7.875
Tổng đánh giá (explicit) 335
hiện tại bài của tôi đang viết là:
3.3.1. Tổng quan nguồn dữ liệu mô phỏng
Để phục vụ quá trình huấn luyện và đánh giá mô hình, đề tài sử dụng phương pháp tạo dữ liệu giả lập có kiểm soát (controlled synthetic data generation). Toàn bộ quy trình sinh dữ liệu được tự động hóa thông qua 3 tập lệnh (scripts python) chạy tuần tự, bao gồm:
• generate_data.py: Khởi tạo thực thể, sinh danh sách 200 người dùng và 255 khách sạn
• generate_mock_interactions.py: Mô phỏng tương tác, sinh lượt tương tác (6 loại signal) và tạo ra các đánh giá
• generate_reviews_from_csv.py: tạo tập đánh giá tiếng Việt thật từ CSV để bổ sung explicit feedback.
• generate_recommendations.py: Xây dựng ma trận User-Item và tính gợi ý cho 200 người dùng
Dữ liệu được tạo ra tuân theo cơ chế phân cụm người dùng (User Clustering) thành 3 phân khúc: bình dân (budget), tầm trung (mid-range) và cao cấp (luxury). Điểm đánh giá được mô phỏng theo công thức cộng gộp yếu tố nhiễu (noise) để sát với thực tế :
rating = base_score + noise.

Chỉ số Giá trị
Số người dùng 200
Số khách sạn 255
Tổng lượt tương tác (implicit) 7.875
Tổng đánh giá (explicit) 335
Phân bố: CLICK_BOOK_NOW 1.985 (25,21%)
Phân bố: ADD_TO_WISHLIST 2.636 (33,47%)
Phân bố: BOOK 528 (6,70%)
Phân bố: VIEW 1.153 (14,64%)
Phân bố: RATE_POSITIVE 807 (10,25%)
Phân bố: RATE_NEGATIVE 766 (9,73%)
Độ thưa ma trận (implicit) 91,2%
Bảng 3.7: Giả lập có kiểm soát (controlled synthetic data)

Cơ chế kiểm soát tính khách quan:
Để đảm bảo kết quả thực nghiệm phản ánh đúng hiệu năng mô hình và hạn chế hiện tượng overfitting hoặc thiên lệch do dữ liệu giả lập, nghiên cứu áp dụng nhiều cơ chế kiểm soát tính khách quan trong quá trình huấn luyện và đánh giá. Các cơ chế này được tổng hợp trong bảng sau:
Dùng cơ chế 60/20/20, vì:
Tránh rò rỉ dữ liệu thời gian: train luôn là dữ liệu quá khứ, test là dữ liệu tương lai.
Đủ dữ liệu để học trong bối cảnh ma trận thưa: 60% cho train giữ mật độ quan sát tối thiểu.
Đảm bảo độ tin cậy đánh giá: 20% validation để kiểm tra trung gian, 20% test để báo cáo cuối.
Dễ so sánh giữa các mô hình vì cùng một quy tắc chia dữ liệu cho implicit và explicit.
Cơ chế Mô tả
Temporal split Chia dữ liệu theo trục thời gian (60% train, 20% validation, 20% test)
Baseline comparison So sánh CF với baseline đơn giản (Top Popular cho implicit, User Mean cho explicit)
Sparsity kiểm soát Độ thưa 91,2% (implicit) và 99,6% (explicit) phản ánh đúng điều kiện thực tế
Dual-feedback Implicit CF → Precision@K, Recall@K, NDCG@K;  
Explicit CF → RMSE, MAE
Bảng 3.8: Cơ chế kiểm soát tính khách quan trong thực nghiệm
Việc sử dụng dữ liệu giả lập giúp đảm bảo khả năng kiểm soát biến số, điều mà các bộ dữ liệu tĩnh từ bên thứ ba thường không đáp ứng được
Cấu trúc trọng số phản hồi ngầm định
Để mô hình hóa chính xác ý định của người dùng, các hành vi được gán trọng số dựa trên mức độ cam kết:
Hệ thống sử dụng 6 loại tín hiệu ngầm định với trọng số phân cấp
Hành vi Trọng số Ý nghĩa học thuật
VIEW 0.5 Xem chi tiết — tín hiệu yếu nhất
CLICK_BOOK_NOW 2 Bấm nút đặt nhưng chưa thanh toán — intent cao
ADD_TO_WISHLIST 3 Thêm vào danh sách yêu thích — quan tâm rõ ràng
RATE_POSITIVE 4.5 Sự hài lòng cao (Tương đương 4-5 sao).
BOOK 5 Hành vi đặt phòng thành công (Tín hiệu mạnh nhất).
RATE_NEGATIVE -3 Phản hồi tiêu cực, giúp cải thiện chất lượng gợi ý.
Bảng 3.9: Trọng số tín hiệu ngầm định (Implicit Signal Weights)
Kết quả đánh giá hệ thống khi khởi tạo seed gồm Implicit và Explicit:
Công thức tính phần trăm cải thiện:
Improvement = (Baseline − Optimized) / Baseline × 100%
Hệ thống đánh giá Implicit:
Metric CF Model Baseline (Top Popular) Cải thiện
Precision@5 0,0340 0,0280 +21,4%
Recall@5 0,0258 0,0159 +62,2%
NDCG@5 0,0420 0,0286 +46,9%
Bảng 3.10: Kết quả đánh giá Implicit CF (Ranking)
Hệ thống đánh giá Explicit:
Metric CF Model Baseline (User Mean) Cải thiện
RMSE 1,1084 1,1188 +0,9%
MAE 0,8918 0,9017 +1,1%
Bảng 3.11: Kết quả đánh giá Explicit CF (Rating Prediction)
3.3.4 Những hạn chế về dữ liệu trong đồ án:
Mặc dù dữ liệu giả lập giúp kiểm soát tốt các yếu tố như độ thưa dữ liệu (data sparsity), phân bố hành vi và tín hiệu phản hồi người dùng, phương pháp này vẫn tồn tại một số hạn chế nhất định, bao gồm:
Chưa phản ánh đầy đủ hành vi người dùng thực tế.
Chưa mô phỏng rõ các yếu tố động theo thời gian.
Dữ liệu có mức độ nhiễu thấp hơn môi trường thực tế.
Chưa đánh giá trực tiếp với người dùng thật hoặc môi trường production.
Một số bài toán như cold-start và thay đổi sở thích người dùng theo thời gian chưa được mô phỏng đầy đủ.
Cụ thể, dữ liệu mô phỏng chưa thể tái hiện hoàn toàn các yếu tố thực tế như mùa vụ du lịch, xu hướng xã hội, chương trình khuyến mãi, sự kiện đặc biệt hoặc hiệu ứng lan truyền trên mạng xã hội. Ngoài ra, dữ liệu giả lập thường có tính ổn định cao và ít nhiễu hơn dữ liệu thực tế, dẫn đến khả năng mô hình đạt kết quả tốt trong môi trường thử nghiệm nhưng chưa đảm bảo hiệu quả tương đương khi triển khai thực tế. Bên cạnh đó, hệ thống hiện chủ yếu được đánh giá thông qua dữ liệu offline và chưa triển khai kiểm thử trực tiếp với người dùng thật.
Do đó, các kết quả thực nghiệm trong nghiên cứu mang tính định hướng học thuật và cần được kiểm chứng thêm trên dữ liệu thực tế trong các nghiên cứu tiếp theo.
3.3.4. Quy trình sinh dữ liệu chi tiết:
Quy trình tả đúng theo logic trong code hiện tại, gồm hai phần: sinh dữ liệu mô phỏng (generate_mock_interactions.py) và đánh giá mô hình (evaluate.py), dùng cơ chế lấy mẫu có trọng số theo chu kỳ tuần và hai đỉnh hoạt động trong ngày
a) Quy trình
apps/search-service/generate_mock_interactions.py
Luồng xử lý:
Đọc danh sách người dùng từ **users.json và danh sách khách sạn từ **homeStay.json.
Chia người dùng thành ba phân khúc: budget, mid, luxury.
Chia khách sạn thành ba phân khúc tương ứng theo giá.
Dùng preference_matrix để mô phỏng xác suất phù hợp giữa từng cặp user-hotel.
Sinh loại tương tác theo rand và mức độ phù hợp match_strength.
Với tương tác BOOK, hệ thống sinh rating bằng compute_rating().
Nếu có booking, hệ thống có thể sinh review với xác suất phụ thuộc vào rating.
Xuất kết quả ra **interactions.json, **reviews.json, **daily_stats.json, và **metrics.json.
b) Phân bố hành vi người dùng:
Loại hành vi Cơ chế trong code Trọng số dùng khi evaluate/recommend
BOOK rand < 0.15 x match_strength (biến thiên theo độ khớp phân khúc) 5.0
ADD_TO_WISHLIST rand < 0.40 sau khi loại BOOK 3.0
CLICK_BOOK_NOW rand < 0.65 sau khi loại các nhánh trước 2.0
VIEW rand < 0.80 sau khi loại các nhánh trước 0.5
RATE_POSITIVE rand < 0.90 sau khi loại các nhánh trước 4.5
RATE_NEGATIVE nhánh còn lại (else) -3.0
Bảng 3.12: Phân bố hành vi người dùng
Ghi chú:
match_strength lấy từ preference_matrix giữa user segment và hotel segment.
Vì BOOK là ngưỡng động, tỉ lệ cuối cùng của các hành vi là tỉ lệ thực nghiệm sau khi chạy script, không phải một phân bố tĩnh cố định.
c) Sinh chuỗi tương tác theo thời gian bằng NHPP và Gaussian Mixture:
Phần sinh timestamp được mô phỏng theo hai thành phần:
Công thức mô phỏng theo chu kỳ tuần:
f\left(h\right)=w_1\cdot\mathcal{N}\left(h\mid\mu_1=12,\sigma_1^2=1.5\right)+w_2\cdot\mathcal{N}\left(h\mid\mu_2=20,\sigma_2^2=2.0\right)
Cường độ theo ngày trong tuần (NHPP giả lập):
Thứ 2 đến Thứ 4: trọng số thấp, lambda_low = 1.0
Thứ 5 và Chủ Nhật: trọng số trung bình, lambda_mid = 1.5
Thứ 6 và Thứ 7: trọng số cao, lambda_peak = 3.0
Cơ chế này được triển khai bằng cách tạo mảng trọng số cho 365 ngày trong năm, rồi lấy mẫu có trọng số bằng numpy.random.choice.
Cường độ theo giờ trong ngày (Gaussian Mixture):
Đỉnh trưa: mu = 12, sigma = 1.5, trọng số w1 = 0.35
Đỉnh tối: mu = 20, sigma = 2.0, trọng số w2 = 0.65
Nhờ đó, timestamp không còn phân bố đều, mà tập trung vào các khung giờ có tính thực tế cao hơn, phản ánh hành vi lướt ứng dụng vào giờ nghỉ trưa và buổi tối.
d) Công thức sinh rating
Công thức:
rating=base_score\ +\ noise
Trong đó:
`base_score` được xác định dựa trên cluster của user (budget: 3.0, mid-range: 4.0, luxury: 4.5)
`noise ~ N(0, 0.5)` (nhiễu Gaussian)
