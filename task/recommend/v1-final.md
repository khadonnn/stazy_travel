3.X. Kiến trúc Hệ thống Khuyến nghị Lai Thời gian thực (Hybrid Realtime Recommendation Architecture)

Hệ thống khuyến nghị trong nền tảng được thiết kế theo hướng Hybrid Recommendation kết hợp giữa Collaborative Filtering (CF) và Content-Based Filtering nhằm tận dụng đồng thời hành vi lịch sử người dùng và ngữ cảnh tương tác hiện tại.

Khác với các hệ thống gợi ý truyền thống chỉ dựa trên lịch sử dài hạn, hệ thống này áp dụng cơ chế Realtime Personalization để phản ánh đúng “ý định tức thời” (Session Intent) của người dùng trong phiên hoạt động hiện tại.

Kiến trúc được chia thành ba lớp chính:

Layer Vai trò Nguồn dữ liệu
Session Intent Layer Phân tích nhu cầu hiện tại của người dùng PostgreSQL realtime interactions
Hybrid Inference Layer Tính toán Hybrid CF + Content-based scoring SVD model + Hotel metadata
Batch Retraining Layer Huấn luyện lại mô hình SVD định kỳ Historical interactions
3.X.1. Mô hình tín hiệu hành vi người dùng (User Interaction Signals)

Hệ thống sử dụng cả Implicit Feedback và Explicit Feedback để xây dựng hồ sơ sở thích người dùng.

Implicit Feedback

Là các hành vi ngầm phản ánh sự quan tâm của người dùng mà không cần đánh giá trực tiếp.

Ví dụ:

xem khách sạn
bấm “đặt ngay”
thêm vào yêu thích
Explicit Feedback

Là các hành vi thể hiện rõ mức độ hài lòng hoặc ưu tiên của người dùng.

Ví dụ:

đánh giá sao
đặt phòng thành công
Bảng trọng số tín hiệu tương tác
Interaction Loại tín hiệu Ý nghĩa Trọng số
VIEW Implicit Quan tâm sơ bộ 0.5
CLICK_BOOK_NOW Intent Signal Có ý định xem đặt phòng 2.0
ADD_TO_WISHLIST Explicit Preference Yêu thích khách sạn 3.0
BOOK Strong Explicit Preference Xác nhận nhu cầu thực tế 5.0
RATE_POSITIVE Satisfaction Signal Trải nghiệm tích cực 4.5
RATE_NEGATIVE Dissatisfaction Signal Trải nghiệm tiêu cực -3.0

Hệ thống sử dụng các trọng số khác nhau nhằm phản ánh đúng mức độ quan trọng của từng hành vi trong quá trình suy luận sở thích người dùng.

3.X.2. Phân tầng sở thích người dùng (Intent Layering)

Một vấn đề phổ biến của các hệ thống Collaborative Filtering là historical bias — hệ thống chỉ ưu tiên sở thích dài hạn và không phản ánh đúng nhu cầu hiện tại của người dùng.

Để giải quyết vấn đề này, hệ thống áp dụng mô hình Intent Layering gồm hai tầng:

Tầng Đặc điểm Mục tiêu
Short-term Intent Tương tác gần đây Phản ánh nhu cầu hiện tại
Long-term Preference Lịch sử toàn bộ hệ thống Học hành vi ổn định

Ví dụ:

Người dùng từng đặt nhiều khách sạn tại Cần Thơ trong lịch sử.
Tuy nhiên, trong phiên hiện tại, người dùng liên tục thêm khách sạn Vũng Tàu vào danh sách yêu thích.

Lúc này:

Session Intent sẽ ưu tiên Vũng Tàu.
Long-term Profile chỉ đóng vai trò bổ trợ.

Cách tiếp cận này giúp hệ thống tránh hiện tượng “gợi ý bị mắc kẹt” theo lịch sử cũ và tăng khả năng thích ứng theo ngữ cảnh thời gian thực.

3.X.3. Cơ chế Time-Decay cho Session Intent

Để tránh việc sở thích ngắn hạn ảnh hưởng quá lâu đến hệ thống, nền tảng áp dụng cơ chế Time-Decay nhằm giảm dần trọng số của các tương tác cũ theo thời gian.

Thời gian tương tác Mức ảnh hưởng
< 5 phút Rất mạnh
5 – 15 phút Trung bình
15 – 30 phút Yếu

> 30 phút Bỏ qua

Nhờ cơ chế này:

Hệ thống phản ánh đúng nhu cầu hiện tại.
Tránh việc recommendation bị “kẹt” theo các tương tác cũ.
Tăng tính linh hoạt cho trải nghiệm người dùng.
3.X.4. Pipeline khuyến nghị Hybrid

Quá trình sinh gợi ý được thực hiện theo pipeline nhiều giai đoạn nhằm đảm bảo cả độ chính xác và tính đa dạng.

Các bước xử lý
Bước Mô tả
1 Thu thập interactions realtime từ PostgreSQL
2 Phân tích Session Intent
3 Sinh candidate hotels từ mô hình SVD
4 Tính Hybrid Score (CF + Content-based)
5 Áp dụng Session Boost
6 Diversity Reranking
7 Trả về Top 3 khách sạn phù hợp
3.X.5. Diversity Reranking

Nếu chỉ tối ưu điểm số recommendation, hệ thống có xu hướng trả về các khách sạn quá giống nhau.

Do đó, hệ thống bổ sung bước Diversity Reranking nhằm:

tăng sự đa dạng danh mục
tránh lặp lại khách sạn tương đồng
cải thiện trải nghiệm khám phá

Các yếu tố được sử dụng:

loại khách sạn
phân khúc giá
tiện ích
vị trí

Ví dụ:

Resort biển
Villa nghỉ dưỡng
Apartment cao cấp

thay vì hiển thị ba khách sạn gần như giống hệt nhau.

3.X.6. Kiến trúc Realtime Recommendation

Hệ thống recommendation hoạt động theo mô hình realtime personalization.

Flow xử lý
Giai đoạn Mô tả
User Interaction Người dùng tương tác với khách sạn
Tracking Layer Ghi interaction vào PostgreSQL
Session Detection Phân tích intent hiện tại
Recommendation Engine Hybrid inference + reranking
UI Update Cập nhật recommendation realtime

Nhờ đó:

người dùng không cần reload trang
recommendation thay đổi theo hành vi hiện tại
tăng tính “AI-native” cho trải nghiệm nền tảng
3.X.7. Huấn luyện mô hình Collaborative Filtering

Hệ thống sử dụng mô hình Singular Value Decomposition (SVD) để học latent features giữa người dùng và khách sạn.

Dữ liệu huấn luyện được lấy trực tiếp từ PostgreSQL thông qua lịch sử interactions của người dùng.

Quá trình huấn luyện được thực hiện theo batch-processing định kỳ nhằm:

giảm tải realtime inference
tăng độ ổn định mô hình
tối ưu tài nguyên hệ thống
Thành phần Vai trò
PostgreSQL Source of Truth
train_real.py Trích xuất interactions
SVD Training Huấn luyện Collaborative Filtering
recsys_model.pkl Mô hình suy luận
3.X.8. So sánh trước và sau khi cải tiến
Trước cải tiến Sau cải tiến
Recommendation tĩnh Recommendation realtime
Chỉ dựa lịch sử cũ Kết hợp session intent
Dễ bị stale data Realtime personalization
Không có diversity Diversity reranking
Historical bias mạnh Intent layering
Không phản ánh ngữ cảnh Session-aware recommendation
3.X.9. Đánh giá kiến trúc đề xuất

Kiến trúc được xây dựng theo hướng AI-native Recommendation System thay vì chỉ là bộ lọc khách sạn truyền thống.

Ưu điểm:

hỗ trợ realtime personalization
tận dụng implicit và explicit feedback
kết hợp short-term và long-term preference
tăng khả năng thích ứng theo phiên người dùng
cải thiện trải nghiệm khám phá khách sạn

Mô hình này phù hợp cho:

hệ thống booking thông minh
nền tảng du lịch AI-first
recommendation systems quy mô vừa và lớn
kiến trúc microservices ứng dụng Machine Learning Hybrid Inference
