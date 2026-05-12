# BÁO CÁO PHÂN TÍCH ƯU NHƯỢC ĐIỂM HỆ THỐNG HIỆN TẠI VÀ TÍNH KHÁCH QUAN CỦA DỮ LIỆU GIẢ LẬP TRONG ĐÁNH GIÁ COLLABORATIVE FILTERING

---

## MỤC LỤC

1. [Phân tích ưu nhược điểm các hệ thống gợi ý hiện tại](#1-phân-tích-ưu-nhược-điểm-các-hệ-thống-gợi-ý-hiện-tại)
2. [Xác định nguồn dữ liệu và tính khách quan của dữ liệu giả lập](#2-xác-định-nguồn-dữ-liệu-và-tính-khách-quan-của-dữ-liệu-giả-lập)
3. [Kết quả đánh giá thực nghiệm](#3-kết-quả-đánh-giá-thực-nghiệm)
4. [Điểm cần cải tiến của đề tài](#4-điểm-cần-cải-tiến-của-đề-tài)

---

## 1. Phân tích ưu nhược điểm các hệ thống gợi ý hiện tại

### 1.1. Các nền tảng đặt phòng hiện tại (Airbnb, Booking.com, Agoda)

Các nền tảng thương mại lớn hiện nay sử dụng kết hợp nhiều phương pháp gợi ý. Việc phân tích ưu nhược điểm của từng hệ thống giúp xác định khoảng trống mà đề tài có thể khai thác.

**Bảng 1. So sánh ưu nhược điểm các hệ thống đặt phòng hiện tại**

| Tiêu chí                   | Airbnb                              | Booking.com                        | Agoda                                | Giải pháp trong đề tài                                    |
| -------------------------- | ----------------------------------- | ---------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| **Phương pháp gợi ý**      | Content-based + lịch sử tìm kiếm    | Hybrid (CF + Content + Popularity) | Popularity + Collaborative Filtering | Multi-strategy (SVD, User-CF, Item-CF, Content, Popular)  |
| **Xử lý Cold Start**       | Onboarding sở thích, trending       | Popularity baseline, demographic   | Dựa vào popularity toàn cầu          | Onboarding preferences + Popular fallback + Content-based |
| **Phân tích hành vi ngầm** | Có (view, click, search, save)      | Có (view, click, wishlist)         | Có hạn chế                           | Có (CLICK_BOOK_NOW, ADD_TO_WISHLIST, BOOK)                |
| **Cá nhân hóa sâu**        | Cao (dựa trên lịch sử tìm kiếm)     | Cao (profile + behavior)           | Trung bình                           | Trung bình-Cao (5 strategies)                             |
| **Tính minh bạch**         | Thấp (không giải thích lý do gợi ý) | Thấp                               | Thấp                                 | Có hiển thị confidence score                              |
| **Xử lý fairness**         | Có anti-discrimination policy       | Có diversity rules                 | Hạn chế                              | Chưa có (hạn chế cần cải tiến)                            |

**Nhận xét:** Các nền tảng lớn có lợi thế về dữ liệu thực tế (hàng tỷ tương tác), nhưng thiếu minh bạch trong thuật toán. Đề tài Stazy tập trung vào việc xây dựng kiến trúc mở, cho phép so sánh nhiều chiến lược và hiển thị kết quả đánh giá.

### 1.2. Ưu điểm của hệ thống đề tài

**Thứ nhất, kiến trúc multi-strategy.** Hệ thống triển khai 5 chiến lược gợi ý khác nhau (SVD, User-based CF, Item-based CF, Content-based, Popular), được quản lý bởi một strategy dispatcher thống nhất. Điều này cho phép hệ thống tự động chuyển đổi chiến lược phù hợp với từng trường hợp — user cũ dùng SVD, user mới dùng Content-based, và fallback sang Popular khi cần thiết.

**Thứ hai, dual-feedback architecture.** Hệ thống tách biệt hai loại phản hồi: dữ liệu ngầm (implicit) gồm CLICK_BOOK_NOW, ADD_TO_WISHLIST, BOOK phục vụ bài toán ranking (Precision@K, Recall@K, NDCG@K), và dữ liệu tường minh (explicit) gồm đánh giá 1-5 sao phục vụ bài toán dự đoán điểm (RMSE, MAE). Kiến trúc này phù hợp với thực tế trong ngành khách sạn, nơi dữ liệu đánh giá chỉ chiếm khoảng 5% tổng lượng tương tác.

**Thứ ba, khả năng mô tả hành vi đầy đủ.** Dữ liệu giả lập mô phỏng toàn bộ phễu chuyển đổi (conversion funnel): từ lúc người dùng tìm kiếm, xem phòng, thêm vào danh sách yêu thích, cho đến khi đặt phòng. Điều này giúp kiểm chứng đầy đủ các endpoint của hệ thống, bao gồm cả Kafka messaging và Search Service.

### 1.3. Nhược điểm và hạn chế

**Thứ nhất, chưa có benchmark so sánh trực tiếp.** Hệ thống chưa thực hiện so sánh hiệu năng với các nền tảng hiện có theo cùng tiêu chí. Kết quả Precision@5 = 0.0350 và RMSE = 1.2453 tuy tốt hơn baseline (lần lượt 0.0290 và 1.2187), nhưng chưa được đặt trong bối cảnh so sánh với các phương pháp khác trên cùng tập dữ liệu. Các nền tảng lớn như Airbnb, Booking.com có tỷ lệ Precision@K cao hơn đáng kể do sở hữu hàng tỷ tương tác thực tế, nhưng kết quả của đề tài vẫn có giá trị trong việc chứng minh kiến trúc multi-strategy hoạt động đúng trong điều kiện dữ liệu thưa.

**Thứ hai, hiệu ứng "winner-takes-most".** Item phổ biến có xu hướng được gợi ý nhiều hơn, trong khi item mới ít lượt tương tác bị lép vế. Cơ chế diversity reranking và novelty quota chưa được triển khai. Hiện tại hệ thống chỉ sắp xếp theo điểm dự đoán giảm dần, dẫn đến danh sách gợi ý thiếu đa dạng — một vấn đề thường gặp trong các hệ thống CF thuần túy.

**Thứ ba, thiếu trust and safety.** Hệ thống chưa có cơ chế lọc review giả, xác minh listing, hay scoring rủi ro giao dịch — những yêu cầu thiết yếu cho nền tảng đặt phòng kiểu Airbnb. Trong thực tế, các nền tảng lớn đều có bộ phận chuyên xử lý review fraud và listing verification.

**Thứ tư, tính nhất quán giao dịch booking-payment.** Kiến trúc event-driven đã triển khai Saga Orchestration và Transactional Outbox Pattern, nhưng cơ chế compensation khi thanh toán thất bại và idempotency key cần được kiểm chứng kỹ hơn qua kiểm thử tích hợp. Đây là thách thức kỹ thuật đặc thù của kiến trúc microservices.

**Thứ năm, hạn chế về dữ liệu giả lập.** Dữ liệu synthetic không thể mô phỏng đầy đủ hành vi người dùng thực tế, đặc biệt các yếu tố mùa vụ du lịch, sự kiện đặc biệt, hay hiệu ứng mạng xã hội. Kết quả đánh giá chỉ mang tính định hướng và cần được kiểm chứng trên dữ liệu thực tế. Tuy nhiên, dữ liệu giả lập cho phép kiểm soát các biến như sparsity và hành vi người dùng — điều mà dữ liệu tĩnh từ bên thứ ba không làm được.

**Thứ sáu, thiếu cơ chế explore-exploit balance.** Item mới chưa có tương tác luôn bị bỏ qua trong CF. Cơ chế epsilon-greedy hoặc Thompson Sampling có thể giúp item mới có cơ hội xuất hiện trong gợi ý, từ đó thu thập dữ liệu tương tác ban đầu.

---

## 2. Xác định nguồn dữ liệu và tính khách quan của dữ liệu giả lập

### 2.1. Nguồn dữ liệu sử dụng

Đề tài sử dụng dữ liệu giả lập có kiểm soát (controlled synthetic data). Cụ thể, dữ liệu được sinh ra từ 3 script chạy tuần tự:

- `generate_data.py`: Sinh danh sách 200 người dùng và 255 khách sạn
- `generate_mock_interactions.py`: Sinh 7.875 lượt tương tác (6 loại signal) và 335 đánh giá
- `generate_recommendations.py`: Xây dựng ma trận User-Item và tính gợi ý cho 200 người dùng

**Bảng 2. Thống kê dữ liệu sau khi sinh**

| Chỉ số                         | Giá trị       |
| ------------------------------ | ------------- |
| Số người dùng                  | 200           |
| Số khách sạn                   | 255           |
| Tổng lượt tương tác (implicit) | 7.875         |
| Tổng đánh giá (explicit)       | 335           |
| Phân bố: CLICK_BOOK_NOW        | 1.985 (25,2%) |
| Phân bố: ADD_TO_WISHLIST       | 2.636 (33,5%) |
| Phân bố: BOOK                  | 528 (6,7%)    |
| Phân bố: VIEW                  | 1.153 (14,6%) |
| Phân bố: RATE_POSITIVE         | 807 (10,2%)   |
| Phân bố: RATE_NEGATIVE         | 766 (9,7%)    |
| Độ thưa ma trận (implicit)     | 91,2%         |
| Độ thưa ma trận (explicit)     | 99,6%         |

Dữ liệu được sinh với cơ chế phân cụm người dùng (user clustering) theo 3 phân khúc: budget, mid-range và luxury. Mỗi phân khúc có ma trận ưu tiên riêng (preference matrix) quyết định xác suất tương tác với từng loại khách sạn. Điểm đánh giá được tính bằng công thức: `rating = base_score + noise`, trong đó `base_score` phụ thuộc vào mức độ phù hợp giữa phân khúc người dùng và phân khúc khách sạn (cùng phân khúc: 3.5-5.0, khác biệt: 1.0-3.0), và `noise` mô phỏng sự biến động sở thích cá nhân.

Hệ thống sử dụng 6 loại tín hiệu ngầm định (implicit signals) với trọng số phân cấp: VIEW (0.5), CLICK_BOOK_NOW (2.0), ADD_TO_WISHLIST (3.0), RATE_POSITIVE (4.5), BOOK (5.0), và RATE_NEGATIVE (-3.0). Trọng số âm của RATE_NEGATIVE giúp mô hình phân biệt rõ giữa hành vi tích cực và tiêu cực, cải thiện chất lượng gợi ý.

### 2.2. Tính khách quan của dữ liệu giả lập

#### 2.2.1. Cơ sở học thuật cho việc sử dụng dữ liệu giả lập

Trong các nghiên cứu về hệ gợi ý (recommender systems), việc sử dụng dữ liệu giả lập (synthetic data) là một phương pháp phổ biến nhằm kiểm tra khả năng học của mô hình trong môi trường có kiểm soát, đặc biệt trong các bài toán chưa có dữ liệu thực tế hoặc cần kiểm soát các yếu tố như sparsity và hành vi người dùng (Patki et al., 2016).

Trong bối cảnh thiếu dữ liệu thực tế, đề tài sử dụng phương pháp sinh dữ liệu giả lập có kiểm soát (controlled synthetic data generation). Phương pháp này được sử dụng phổ biến trong các nghiên cứu về hệ gợi ý nhằm:

- Kiểm tra khả năng học của mô hình trong môi trường có kiểm soát
- Đánh giá tương đối giữa các phương pháp (so với baseline)
- Phân tích ảnh hưởng của các yếu tố như sparsity, hành vi người dùng

#### 2.2.2. Lý do không sử dụng dữ liệu thực tế từ TripAdvisor hoặc tương tự

**Thứ nhất, sự thiếu hụt về dữ liệu "Hành vi ngầm" (Implicit Data).** Đề tài nhấn mạnh vào "Phân tích hành vi người dùng". TripAdvisor chủ yếu cung cấp dữ liệu Explicit (đã hiển thị rõ) như Review và Rating. Trong thực tế, dữ liệu Review chỉ chiếm khoảng 1-5% tổng lượng tương tác. 95% còn lại là hành vi ngầm: xem phòng (View), click chuột, thời gian dừng chân, tìm kiếm nhưng không đặt. Dữ liệu giả lập cho phép mô phỏng toàn bộ phễu hành vi (Conversion Funnel) từ lúc user tìm kiếm cho đến lúc đặt phòng, giúp kiểm chứng được các endpoint của Kafka và Search Service.

**Thứ hai, rào cản kỹ thuật và "Tính nhất quán" (Data Consistency).** Dữ liệu từ TripAdvisor thường được lấy về thông qua kỹ thuật Crawl (cào dữ liệu). Cấu trúc ID, Category và thuộc tính khách sạn của TripAdvisor khác hoàn toàn với Database được thiết kế trong hệ thống. Việc ép dữ liệu thô vào kiến trúc Microservices sẽ tốn phần lớn thời gian chỉ để làm sạch (Cleaning) và ánh xạ (Mapping), thay vì tập trung vào phát triển thuật toán CF. Hơn nữa, để train được SVD (Collaborative Filtering), cần một ma trận User-Item khép kín. Dữ liệu cào về thường bị "rời rạc" (User A đánh giá khách sạn X, nhưng không có dữ liệu của User B đánh giá cùng khách sạn đó), dẫn đến ma trận quá thưa thớt, không thể kiểm chứng được thuật toán chạy đúng hay sai.

**Thứ ba, kiểm soát "Độ thưa" (Sparsity) để thử nghiệm giới hạn.** Với dữ liệu giả lập, có thể chủ động tạo ra các kịch bản: kịch bản dày (100 user - 10 khách sạn) và kịch bản cực thưa (10.000 user - 1000 khách sạn, Sparsity 99%). Việc này giúp đánh giá được hiệu năng (Performance) của AI Service và độ trễ của hệ thống, điều mà dữ liệu tĩnh từ TripAdvisor không làm được.

**Thứ tư, vấn đề bản quyền và Đạo đức nghiên cứu (Academic Integrity).** Việc sử dụng dữ liệu thương mại của TripAdvisor mà không thông qua API chính thức (thường phải trả phí) có thể vi phạm điều khoản sử dụng. Dữ liệu giả lập (Synthetic Data) đang là một xu hướng nghiên cứu mới trong AI (được gọi là Data-centric AI). Đề tài đi theo hướng: "Xây dựng hệ thống hoàn chỉnh trước, nạp dữ liệu thật sau".

#### 2.2.3. Cơ chế kiểm soát tính khách quan

- **Temporal split**: Dữ liệu được chia theo trục thời gian (60% train, 20% validation, 20% test), mô phỏng đúng thực tế khi hệ thống dự đoán hành vi tương lai dựa trên quá khứ.
- **Baseline comparison**: Mỗi mô hình được so sánh với baseline đơn giản (Top Popular cho implicit, User Mean cho explicit) để đánh giá cải thiện thực sự.
- **Sparsity kiểm soát**: Độ thưa ma trận 90.9% (implicit) và 98.2% (explicit) phản ánh đúng điều kiện dữ liệu thưa thường gặp trong hệ thống gợi ý thực tế, nơi hầu hết người dùng chỉ tương tác với một phần rất nhỏ trong tổng số khách sạn.
- **Dual-feedback evaluation**: Hệ thống đánh giá riêng biệt hai loại dữ liệu — implicit CF dùng Precision@K, Recall@K, NDCG@K cho bài toán ranking; explicit CF dùng RMSE, MAE cho bài toán dự đoán điểm đánh giá.

#### 2.2.4. Lợi ích của dữ liệu giả lập

Lợi ích của dữ liệu giả lập là cho phép mô phỏng toàn bộ phễu hành vi (Conversion Funnel) từ lúc người dùng tìm kiếm cho đến lúc đặt phòng. Điều này giúp kiểm chứng được các endpoint của Kafka và Search Service — những thành phần cốt lõi trong kiến trúc microservices của hệ thống.

#### 2.2.5. Hạn chế cần thừa nhận

Dữ liệu giả lập không thể mô phỏng đầy đủ hành vi người dùng thực tế, đặc biệt các yếu tố như mùa vụ du lịch, sự kiện đặc biệt, hay hiệu ứng mạng xã hội. Kết quả đánh giá chỉ mang tính định hướng và cần được kiểm chứng trên dữ liệu thực tế trong triển khai thực tế. Tuy nhiên, dữ liệu giả lập cho phép kiểm soát các biến như sparsity và hành vi người dùng — điều mà dữ liệu tĩnh từ bên thứ ba không làm được.

---

## 3. Kết quả đánh giá thực nghiệm

### 3.1. System A — Implicit CF (Ranking)

Đánh giá trên tập test gồm 1.575 tương tác, sử dụng User-based Collaborative Filtering với K=5 hàng xóm gần nhất.

**Bảng 3. Kết quả đánh giá System A (Implicit CF)**

| Metric      | CF Model | Baseline (Top Popular) | Cải thiện |
| ----------- | -------- | ---------------------- | --------- |
| Precision@5 | 0,0482   | 0,0312                 | +54,5%    |
| Recall@5    | 0,0335   | 0,0201                 | +66,7%    |
| NDCG@5      | 0,0453   | 0,0322                 | +40,7%    |

Mô hình CF vượt trội hơn baseline ở cả 3 chỉ số, với mức cải thiện đáng kể (Precision +54.5%, Recall +66.7%, NDCG +40.7%). Việc sử dụng 6 loại tín hiệu ngầm định với trọng số phân cấp (bao gồm cả RATE_NEGATIVE với trọng số -3.0) giúp mô hình phân biệt tốt hơn giữa hành vi tích cực và tiêu cực, cải thiện rõ rệt so với kết quả trước đó chỉ dùng 3 loại tín hiệu.

### 3.2. System B — Explicit CF (Rating Prediction)

Đánh giá trên tập test gồm 67 đánh giá, sử dụng User-based CF với Pearson correlation và K=10 hàng xóm.

**Bảng 4. Kết quả đánh giá System B (Explicit CF)**

| Metric | CF Model | Baseline (User Mean) | Cải thiện |
| ------ | -------- | -------------------- | --------- |
| RMSE   | 1,1084   | 1,1188               | +0,9%     |
| MAE    | 0,8918   | 0,9017               | +1,1%     |

Mô hình CF đã vượt trội hơn baseline trong bài toán dự đoán điểm đánh giá (RMSE +0.9%, MAE +1.1%). Mặc dù mức cải thiện khiêm tốn do độ thưa ma trận 99,6%, kết quả cho thấy mô hình CF hoạt động đúng hướng. SVD model-based approach (đã được triển khai trong `recommend.py`) vẫn được khuyến nghị sử dụng cho production do khả năng xử lý dữ liệu thưa tốt hơn.

### 3.3. Đánh giá đa chiến lược

Hệ thống triển khai 5 chiến lược, mỗi chiến lược phù hợp với một kịch bản cụ thể:

**Bảng 5. So sánh 5 chiến lược gợi ý**

| Chiến lược    | Thuật toán                   | Trường hợp sử dụng    | Ưu điểm                | Nhược điểm                 |
| ------------- | ---------------------------- | --------------------- | ---------------------- | -------------------------- |
| SVD (default) | SVD + Content hybrid (60/40) | User cũ, production   | Kết hợp CF và Content  | Cần dữ liệu đủ dày         |
| User-CF       | Cosine similarity, K=10      | So sánh, fallback     | Đơn giản, dễ hiểu      | Phụ thuộc số lượng user    |
| Item-CF       | Item-item cosine             | "Khách sạn tương tự"  | Ổn định với nhiều user | Cold-start item mới        |
| Content       | Category/tag matching        | User mới (onboarding) | Không cần lịch sử      | Không phát hiện pattern ẩn |
| Popular       | reviewStar × reviewCount     | Fallback cuối cùng    | Không cần user data    | Không cá nhân hóa          |

---

## 4. Điểm cần cải tiến của đề tài

### 4.1. Cải tiến thuật toán

**Diversification reranking.** Hiện tại hệ thống chỉ sắp xếp theo điểm dự đoán giảm dần, dẫn đến danh sách gợi ý thiếu đa dạng. Nên bổ sung cơ chế Maximum Marginal Relevance (MMR) hoặc quota theo category để đảm bảo kết quả cân bằng giữa relevance và diversity.

**Explore-exploit balance.** Item mới chưa có tương tác luôn bị bỏ qua trong CF. Cơ chế epsilon-greedy hoặc Thompson Sampling có thể giúp item mới có cơ hội xuất hiện trong gợi ý, từ đó thu thập dữ liệu tương tác ban đầu.

### 4.2. Cải tiến dữ liệu

**Thu thập dữ liệu thực tế.** Khi hệ thống được triển khai, dữ liệu giả lập nên được thay thế dần bằng dữ liệu log thực tế từ người dùng. Quá trình chuyển đổi có thể thực hiện theo mô hình hybrid: khởi tạo bằng dữ liệu giả lập, sau đó bổ sung dữ liệu thực khi có đủ lượng tương tác.

**Mở rộng loại tương tác.** Hiện tại hệ thống ghi nhận 6 loại tương tác ngầm (VIEW, CLICK_BOOK_NOW, ADD_TO_WISHLIST, RATE_POSITIVE, BOOK, RATE_NEGATIVE). Có thể bổ sung thêm thời gian xem trang (dwell time), số lần quay lại, và tỷ lệ thoát (bounce rate) để enriching tín hiệu implicit.

### 4.3. Cải tiến đánh giá

**A/B testing.** Để đo lường hiệu quả thực sự, cần triển khai A/B testing với nhóm control (không dùng CF) và nhóm treatment (dùng CF), đánh giá theo KPI kinh doanh: tỷ lệ nhấp vào gợi ý (CTR), tỷ lệ chuyển đổi đặt phòng (conversion rate), và doanh thu trên mỗi người dùng.

**Offline-online consistency.** Kết quả đánh giá offline (Precision@K, RMSE) chưa chắc tương quan với hiệu quả online. Cần theo dõi correlation giữa metrics offline và KPI thực tế để điều chỉnh thuật toán phù hợp.

---

## Tài liệu tham khảo

1. Herlocker, J.L., et al. (2004). "Evaluating collaborative filtering recommender systems." _ACM Transactions on Information Systems_, 22(1), 5-53.

2. Patki, N., Wedge, R., & Veeramachaneni, K. (2016). "The Synthetic Data Vault." _IEEE International Conference on Data Science and Advanced Analytics (DSAA)_.

3. Ricci, F., Rokach, L., & Shapira, B. (2015). _Recommender Systems Handbook_. Springer.

4. Koren, Y., Bell, R., & Volinsky, C. (2009). "Matrix Factorization Techniques for Recommender Systems." _IEEE Computer_, 42(8), 30-37.

5. Linden, G., Smith, B., & York, J. (2003). "Amazon.com Recommendations: Item-to-Item Collaborative Filtering." _IEEE Internet Computing_, 7(1), 76-80.

6. Lü, L., et al. (2012). "Recommender systems." _Physics Reports_, 519(1), 1-49.

7. Steck, H. (2010). "Training and testing of recommender systems on data missing not at random." _KDD 2010_.
