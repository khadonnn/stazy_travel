# PHẦN NỘI DUNG BỔ SUNG CHO BÁO CÁO

> File này chứa các phần nội dung mẫu để chèn vào báo cáo chính (`NguyenDinhDongKha.docx`).
> Đánh số tham khảo từ [10] trở đi, nối tiếp danh mục [1]-[9] hiện có trong báo cáo.

---

## PHẦN 1: Phân tích ưu, nhược điểm và điểm cần cải tiến của các hệ thống gợi ý hiện tại

> **Vị trí đề xuất:** Chương 2, mục **2.4.6** (sau 2.4.5 Xử lý dữ liệu phản hồi ngầm định)

---

### 2.4.6. Phân tích ưu, nhược điểm và điểm cần cải tiến của các hệ thống gợi ý hiện tại

Để xác định khoảng trống mà đề tài có thể khai thác, cần phân tích ưu nhược điểm của các nền tảng đặt phòng lớn hiện nay. Theo Ricci et al. (2015), không có hệ thống gợi ý nào hoàn hảo — mỗi nền tảng đều có trade-off giữa độ chính xác, tính minh bạch, và khả năng xử lý dữ liệu thưa [10].

#### 2.4.6.1. Bảng so sánh

**Bảng X. So sánh ưu nhược điểm các hệ thống đặt phòng hiện tại**

| Tiêu chí                   | Airbnb                              | Booking.com                        | Agoda                                | Giải pháp trong đề tài                                                               |
| -------------------------- | ----------------------------------- | ---------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| **Phương pháp gợi ý**      | Content-based + lịch sử tìm kiếm    | Hybrid (CF + Content + Popularity) | Popularity + Collaborative Filtering | Multi-strategy (SVD, User-CF, Item-CF, Content, Popular)                             |
| **Xử lý Cold Start**       | Onboarding sở thích, trending       | Popularity baseline, demographic   | Dựa vào popularity toàn cầu          | Onboarding preferences + Popular fallback + Content-based                            |
| **Phân tích hành vi ngầm** | Có (view, click, search, save)      | Có (view, click, wishlist)         | Có hạn chế                           | Có 6 loại: VIEW, CLICK_BOOK_NOW, ADD_TO_WISHLIST, RATE_POSITIVE, BOOK, RATE_NEGATIVE |
| **Cá nhân hóa sâu**        | Cao (dựa trên lịch sử tìm kiếm)     | Cao (profile + behavior)           | Trung bình                           | Trung bình-Cao (5 strategies + signal weights)                                       |
| **Tính minh bạch**         | Thấp (không giải thích lý do gợi ý) | Thấp                               | Thấp                                 | Có hiển thị confidence score                                                         |
| **Xử lý fairness**         | Có anti-discrimination policy       | Có diversity rules                 | Hạn chế                              | Chưa có (hạn chế cần cải tiến)                                                       |

#### 2.4.6.2. Ưu điểm của các hệ thống hiện tại

- **Dữ liệu thực tế quy mô lớn:** Các nền tảng như Airbnb và Booking.com sở hữu hàng tỷ lượt tương tác thực tế, cho phép Collaborative Filtering hoạt động với độ chính xác cao nhờ ma trận User-Item dày đặc. Theo Linden et al. (2003), Amazon sử dụng item-to-item CF trên hàng triệu sản phẩm với kết quả vượt trội [14].
- **Đội ngũ kỹ thuật chuyên sâu:** Liên tục tối ưu thuật toán, xử lý edge cases (cold-start, spam review, bot detection).
- **Cơ chế bảo mật và chống gian lận:** Review verification, listing verification, anti-discrimination policy đã được triển khai ở quy mô production.

#### 2.4.6.3. Nhược điểm của các hệ thống hiện tại

- **Thiếu tính minh bạch (Transparency):** Không nền tảng nào giải thích lý do gợi ý cho người dùng. Theo Herlocker et al. (2004), tính minh bạch là yếu tố quan trọng ảnh hưởng đến sự tin cậy của hệ thống gợi ý [11].
- **Hiệu ứng "Winner-takes-most":** Item phổ biến có xu hướng được gợi ý quá nhiều, trong khi item mới hoặc niche bị lép vế — dẫn đến giảm đa dạng (diversity) trong kết quả gợi ý.
- **Không cho phép so sánh chiến lược:** Các thuật toán đều là closed-source, không thể benchmark trên cùng tập dữ liệu.

#### 2.4.6.4. Điểm cần cải tiến mà đề tài hướng tới

- Xây dựng **kiến trúc multi-strategy** mở, cho phép so sánh 5 chiến lược trên cùng tập dữ liệu.
- Sử dụng **dual-feedback architecture** (implicit + explicit) phù hợp với thực tế ngành khách sạn, nơi dữ liệu đánh giá tường minh chỉ chiếm 1-5% tổng lượng tương tác [10].
- Triển khai **6 loại tín hiệu ngầm định** với trọng số phân cấp (signal_weights), bao gồm cả trọng số âm (RATE_NEGATIVE = -3.0) để phân biệt hành vi tiêu cực.

---

## PHẦN 2: Xác định nguồn dữ liệu và tính khách quan của dữ liệu giả lập

> **Vị trí đề xuất:** Chương 3, mục **3.2.3** (sau 3.2.2 Phân tích yêu cầu phi chức năng)

---

### 3.2.3. Xác định nguồn dữ liệu và tính khách quan của dữ liệu giả lập trong đánh giá Collaborative Filtering

#### A. Nguồn dữ liệu sử dụng

Đề tài sử dụng dữ liệu giả lập có kiểm soát (controlled synthetic data). Cụ thể, dữ liệu được sinh ra từ 3 script chạy tuần tự:

- `generate_data.py`: Sinh danh sách 200 người dùng và 255 khách sạn
- `generate_mock_interactions.py`: Sinh 7.875 lượt tương tác (6 loại signal) và 335 đánh giá
- `generate_recommendations.py`: Xây dựng ma trận User-Item và tính gợi ý cho 200 người dùng

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

Dữ liệu được sinh với cơ chế phân cụm người dùng (user clustering) theo 3 phân khúc: budget, mid-range và luxury. Điểm đánh giá được tính bằng công thức: `rating = base_score + noise`.

#### B. Cơ sở học thuật cho việc sử dụng dữ liệu giả lập

Trong các nghiên cứu về hệ gợi ý (recommender systems), việc sử dụng dữ liệu giả lập (synthetic data) là một phương pháp phổ biến nhằm kiểm tra khả năng học của mô hình trong môi trường có kiểm soát, đặc biệt trong các bài toán chưa có dữ liệu thực tế hoặc cần kiểm soát các yếu tố như sparsity và hành vi người dùng (Patki et al., 2016; Herlocker et al., 2004) [11][15].

> **Kết luận:** Trong bối cảnh thiếu dữ liệu thực tế, đề tài sử dụng phương pháp sinh dữ liệu giả lập có kiểm soát (controlled synthetic data generation). Phương pháp này nhằm:
>
> - Kiểm tra khả năng học của mô hình trong môi trường có kiểm soát
> - Đánh giá tương đối giữa các phương pháp (so với baseline)
> - Phân tích ảnh hưởng của các yếu tố như sparsity, hành vi người dùng

#### C. Lý do không sử dụng dữ liệu thực tế từ TripAdvisor hoặc tương tự

**Thứ nhất, sự thiếu hụt về dữ liệu "Hành vi ngầm" (Implicit Data).**
Đề tài nhấn mạnh vào phân tích hành vi người dùng. TripAdvisor chủ yếu cung cấp dữ liệu Explicit (Review và Rating). Trong thực tế, dữ liệu Review chỉ chiếm khoảng 1-5% tổng lượng tương tác. 95% còn lại là hành vi ngầm: xem phòng, click chuột, thời gian dừng chân, tìm kiếm nhưng không đặt (Ricci et al., 2015) [10]. Dữ liệu giả lập cho phép mô phỏng toàn bộ phễu hành vi (Conversion Funnel), giúp kiểm chứng được các endpoint của Kafka và Search Service.

**Thứ hai, rào cản kỹ thuật và tính nhất quán (Data Consistency).**
Dữ liệu từ TripAdvisor thường được lấy về thông qua kỹ thuật Crawl. Cấu trúc ID, Category và thuộc tính khách sạn khác hoàn toàn với Database của hệ thống. Việc ép dữ liệu thô vào kiến trúc Microservices sẽ tốn phần lớn thời gian làm sạch và ánh xạ. Hơn nữa, để train được SVD, cần một ma trận User-Item khép kín — dữ liệu cào thường bị rời rạc, dẫn đến ma trận quá thưa thớt.

**Thứ ba, kiểm soát "Độ thưa" (Sparsity) để thử nghiệm giới hạn.**
Với dữ liệu giả lập, có thể chủ động tạo ra các kịch bản: kịch bản dày (ít user - ít item) và kịch bản cực thưa (nhiều user - nhiều item, Sparsity 99%). Việc này giúp đánh giá hiệu năng của AI Service, điều mà dữ liệu tĩnh không làm được.

**Thứ tư, vấn đề bản quyền và đạo đức nghiên cứu (Academic Integrity).**
Việc sử dụng dữ liệu thương mại của TripAdvisor mà không thông qua API chính thức có thể vi phạm điều khoản sử dụng. Dữ liệu giả lập (Synthetic Data) đang là xu hướng nghiên cứu mới trong AI (Data-centric AI). Đề tài đi theo hướng: "Xây dựng hệ thống hoàn chỉnh trước, nạp dữ liệu thật sau" (Patki et al., 2016) [15].

#### D. Cơ chế kiểm soát tính khách quan

| Cơ chế                  | Mô tả                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Temporal split**      | Chia dữ liệu theo trục thời gian (60% train, 20% validation, 20% test)              |
| **Baseline comparison** | So sánh CF với baseline đơn giản (Top Popular cho implicit, User Mean cho explicit) |
| **Sparsity kiểm soát**  | Độ thưa 91.2% (implicit) và 99.6% (explicit) phản ánh đúng điều kiện thực tế        |
| **Dual-feedback**       | Implicit CF → Precision@K, Recall@K, NDCG@K; Explicit CF → RMSE, MAE                |

#### E. Hạn chế cần thừa nhận

Dữ liệu giả lập không thể mô phỏng đầy đủ hành vi người dùng thực tế, đặc biệt các yếu tố mùa vụ du lịch, sự kiện đặc biệt, hay hiệu ứng mạng xã hội. Kết quả đánh giá chỉ mang tính định hướng và cần được kiểm chứng trên dữ liệu thực tế. Tuy nhiên, dữ liệu giả lập cho phép kiểm soát các biến như sparsity và hành vi người dùng — điều mà dữ liệu tĩnh từ bên thứ ba không làm được.

---

## PHẦN 3: Công thức các chỉ số đánh giá mô hình

> **Vị trí đề xuất:** Chương 3 hoặc Chương 5, thêm mục **Đánh giá mô hình** — trình bày công thức, ý nghĩa và nguồn tham khảo cho từng metric.

---

### Hệ thống sử dụng Dual-Feedback Evaluation Framework với 5 chỉ số chia thành 2 nhóm:

**Bảng X. Tổng quan 5 chỉ số đánh giá**

| STT | Chỉ số      | Nhóm                | Mục đích                                 | Giá trị |
| --- | ----------- | ------------------- | ---------------------------------------- | ------- |
| 1   | RMSE        | System B (Explicit) | Đo lỗi dự đoán điểm đánh giá             | 1,1084  |
| 2   | MAE         | System B (Explicit) | Đo lỗi tuyệt đối trung bình              | 0,8918  |
| 3   | Precision@5 | System A (Implicit) | Đo tỷ lệ gợi ý đúng trong Top-5          | 0,0482  |
| 4   | Recall@5    | System A (Implicit) | Đo độ bao phủ items đã tìm thấy          | 0,0335  |
| 5   | NDCG@5      | System A (Implicit) | Đo chất lượng xếp hạng (ranking quality) | 0,0453  |

---

#### 1. RMSE — Root Mean Square Error (System B: Explicit CF)

**Công thức:**

RMSE = √( Σᵢ₌₁ᴺ (ŷᵢ − yᵢ)² / N )

Trong đó: ŷᵢ là điểm dự đoán, yᵢ là điểm thực tế, N là số lượng mẫu đánh giá trong tập test.

**Ý nghĩa:** RMSE đo độ lệch trung bình giữa giá trị dự đoán và giá trị thực tế. Giá trị RMSE càng thấp thì mô hình dự đoán càng chính xác. RMSE phạt mạnh các lỗi lớn hơn do tính chất bình phương [11].

> _(Tham khảo: Herlocker, J.L., et al. (2004). "Evaluating collaborative filtering recommender systems." ACM TOIS, 22(1), 5-53.)_

---

#### 2. MAE — Mean Absolute Error (System B: Explicit CF)

**Công thức:**

MAE = Σᵢ₌₁ᴺ |ŷᵢ − yᵢ| / N

Trong đó: ŷᵢ là điểm dự đoán, yᵢ là điểm thực tế, N là số lượng mẫu.

**Ý nghĩa:** MAE đo lỗi tuyệt đối trung bình, không bị ảnh hưởng bởi outlier nhiều như RMSE. MAE cho thấy mức sai lệch trung bình thực tế trên mỗi dự đoán. Theo Koren et al. (2009), MAE và RMSE bổ sung cho nhau trong đánh giá mô hình dự đoán rating [13].

> _(Tham khảo: Koren, Y., Bell, R., & Volinsky, C. (2009). "Matrix Factorization Techniques for Recommender Systems." IEEE Computer, 42(8), 30-37.)_

---

#### 3. Precision@K — Độ chính xác tại Top-K (System A: Implicit CF)

**Công thức:**

Precision@K = |{items có liên quan} ∩ {K items được gợi ý}| / K

Với K = 5: Precision@5 = Số lượng item đúng trong 5 gợi ý đầu / 5

**Ý nghĩa:** Precision@K đo tỷ lệ phần trăm các item được gợi ý thực sự có liên quan. Giá trị càng cao, hệ thống gợi ý càng chính xác. Theo Herlocker et al. (2004), Precision@K là chỉ số phổ biến nhất để đánh giá hệ thống gợi ý Top-K [11].

> _(Tham khảo: Herlocker, J.L., et al. (2004). "Evaluating collaborative filtering recommender systems." ACM TOIS, 22(1), 5-53.)_

---

#### 4. Recall@K — Độ bao phủ tại Top-K (System A: Implicit CF)

**Công thức:**

Recall@K = |{items có liên quan} ∩ {K items được gợi ý}| / |{tất cả items có liên quan}|

Với K = 5: Recall@5 = Số lượng item đúng trong 5 gợi ý đầu / Tổng số item có liên quan trong tập test

**Ý nghĩa:** Recall@K đo tỷ lệ phần trăm các item có liên quan thực sự được tìm thấy trong K gợi ý đầu. Recall cao nghĩa là hệ thống không bỏ sót nhiều item phù hợp. Precision và Recall thường có trade-off: tăng Precision có thể giảm Recall và ngược lại [11].

> _(Tham khảo: Herlocker, J.L., et al. (2004). "Evaluating collaborative filtering recommender systems." ACM TOIS, 22(1), 5-53.)_

---

#### 5. NDCG@K — Normalized Discounted Cumulative Gain tại Top-K (System A: Implicit CF)

**Công thức:**

DCG@K = Σᵢ₌₁ᴷ relᵢ / log₂(i + 1)

NDCG@K = DCG@K / IDCG@K

Trong đó:

- relᵢ = 1 nếu item thứ i trong danh sách gợi ý có liên quan, 0 nếu không
- IDCG@K là giá trị DCG lý tưởng (khi các item có liên quan được xếp ở vị trí đầu tiên)

**Ý nghĩa:** NDCG@K không chỉ đo item nào được gợi ý đúng, mà còn đo **thứ tự xếp hạng** của chúng. Item có liên quan được xếp càng cao, NDCG càng lớn. Đây là metric phù hợp nhất cho bài toán ranking vì thực tế người dùng chỉ xem top kết quả đầu tiên [10][16].

> _(Tham khảo: [10] Ricci, F., et al. (2015). Recommender Systems Handbook. Springer. / [16] Järvelin, K. & Kekäläinen, J. (2002). "Cumulated gain-based evaluation of IR techniques." ACM TOIS, 20(4), 422-446.)_

---

#### Bảng tổng hợp kết quả đánh giá

**Bảng X. Kết quả đánh giá System A — Implicit CF (Ranking)**

| Metric      | CF Model | Baseline (Top Popular) | Cải thiện |
| ----------- | -------- | ---------------------- | --------- |
| Precision@5 | 0,0482   | 0,0312                 | +54,5%    |
| Recall@5    | 0,0335   | 0,0201                 | +66,7%    |
| NDCG@5      | 0,0453   | 0,0322                 | +40,7%    |

**Bảng X. Kết quả đánh giá System B — Explicit CF (Rating Prediction)**

| Metric | CF Model | Baseline (User Mean) | Cải thiện |
| ------ | -------- | -------------------- | --------- |
| RMSE   | 1,1084   | 1,1188               | +0,9%     |
| MAE    | 0,8918   | 0,9017               | +1,1%     |

---

#### Trọng số tín hiệu ngầm định (Implicit Signal Weights)

Hệ thống sử dụng 6 loại tín hiệu ngầm định với trọng số phân cấp:

| Tín hiệu        | Trọng số | Giải thích                                          |
| --------------- | -------- | --------------------------------------------------- |
| VIEW            | 0.5      | Xem chi tiết — tín hiệu yếu nhất                    |
| CLICK_BOOK_NOW  | 2.0      | Bấm nút đặt nhưng chưa thanh toán — intent cao      |
| ADD_TO_WISHLIST | 3.0      | Thêm vào danh sách yêu thích — quan tâm rõ ràng     |
| RATE_POSITIVE   | 4.5      | Đánh giá tích cực 4-5 sao (không cần booking)       |
| BOOK            | 5.0      | Đặt phòng thành công — tín hiệu mạnh nhất           |
| RATE_NEGATIVE   | -3.0     | Đánh giá tiêu cực 1-2 sao — trọng số âm (phân biệt) |

> Trọng số âm của RATE_NEGATIVE giúp mô hình phân biệt rõ giữa hành vi tích cực và tiêu cực, cải thiện chất lượng gợi ý [10].

---

## TÀI LIỆU THAM KHẢO (References bổ sung — nối tiếp [1]-[9] hiện có)

[10] Ricci, F., Rokach, L., & Shapira, B. (2015). "Recommender Systems Handbook." _Recommender Systems Handbook_, Springer, 1-35. [Online]. Available: https://doi.org/10.1007/978-1-4899-7637-6. [Accessed 14 5 2026].

[11] J.L. Herlocker, J.A. Konstan, L.G. Terveen, and J.T. Riedl, "Evaluating collaborative filtering recommender systems," _ACM Transactions on Information Systems_, vol. 22, no. 1, pp. 5-53, 2004. [Online]. Available: https://doi.org/10.1145/963770.963772. [Accessed 14 5 2026].

[12] H. Steck, "Training and testing of recommender systems on data missing not at random," in _Proc. 16th ACM SIGKDD Int. Conf. Knowledge Discovery and Data Mining (KDD)_, 2010, pp. 713-722. [Online]. Available: https://doi.org/10.1145/1835804.1835895. [Accessed 14 5 2026].

[13] Y. Koren, R. Bell, and C. Volinsky, "Matrix Factorization Techniques for Recommender Systems," _IEEE Computer_, vol. 42, no. 8, pp. 30-37, 2009. [Online]. Available: https://doi.org/10.1109/MC.2009.263. [Accessed 14 5 2026].

[14] G. Linden, B. Smith, and J. York, "Amazon.com Recommendations: Item-to-Item Collaborative Filtering," _IEEE Internet Computing_, vol. 7, no. 1, pp. 76-80, 2003. [Online]. Available: https://doi.org/10.1109/MIC.2003.1167344. [Accessed 14 5 2026].

[15] N. Patki, R. Wedge, and K. Veeramachaneni, "The Synthetic Data Vault," in _IEEE Int. Conf. Data Science and Advanced Analytics (DSAA)_, 2016, pp. 399-410. [Online]. Available: https://doi.org/10.1109/DSAA.2016.49. [Accessed 14 5 2026].

[16] K. Järvelin and J. Kekäläinen, "Cumulated gain-based evaluation of IR techniques," _ACM Transactions on Information Systems_, vol. 20, no. 4, pp. 422-446, 2002. [Online]. Available: https://doi.org/10.1145/582415.582418. [Accessed 14 5 2026]. _(Định nghĩa NDCG)_
