# PHẦN NỘI DUNG BỔ SUNG CHO BÁO CÁO

> File này chứa 2 phần nội dung mẫu. Bạn tự chọn vị trí chèn vào báo cáo chính (`NguyenDinhDongKha.docx`).

---

## PHẦN 1: Phân tích ưu, nhược điểm các hệ thống gợi ý hiện tại

> **Gợi ý vị trí:** Chương 2, thêm mục **2.4.6** (sau 2.4.5 Xử lý dữ liệu phản hồi ngầm định)
> **Hoặc:** Chương 1, mục 1.1 (Lý do chọn đề tài) — bổ sung như phần phân tích bối cảnh

---

### 2.4.6. Phân tích ưu, nhược điểm và điểm cần cải tiến của các hệ thống gợi ý hiện tại

Để xác định khoảng trống mà đề tài có thể khai thác, cần phân tích ưu nhược điểm của các nền tảng đặt phòng lớn hiện nay.

**Bảng X. So sánh ưu nhược điểm các hệ thống đặt phòng hiện tại**

| Tiêu chí                   | Airbnb                              | Booking.com                        | Agoda                                | Giải pháp trong đề tài                                    |
| -------------------------- | ----------------------------------- | ---------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| **Phương pháp gợi ý**      | Content-based + lịch sử tìm kiếm    | Hybrid (CF + Content + Popularity) | Popularity + Collaborative Filtering | Multi-strategy (SVD, User-CF, Item-CF, Content, Popular)  |
| **Xử lý Cold Start**       | Onboarding sở thích, trending       | Popularity baseline, demographic   | Dựa vào popularity toàn cầu          | Onboarding preferences + Popular fallback + Content-based |
| **Phân tích hành vi ngầm** | Có (view, click, search, save)      | Có (view, click, wishlist)         | Có hạn chế                           | Có (CLICK_BOOK_NOW, ADD_TO_WISHLIST, BOOK)                |
| **Cá nhân hóa sâu**        | Cao (dựa trên lịch sử tìm kiếm)     | Cao (profile + behavior)           | Trung bình                           | Trung bình-Cao (5 strategies)                             |
| **Tính minh bạch**         | Thấp (không giải thích lý do gợi ý) | Thấp                               | Thấp                                 | Có hiển thị confidence score                              |
| **Xử lý fairness**         | Có anti-discrimination policy       | Có diversity rules                 | Hạn chế                              | Chưa có (hạn chế cần cải tiến)                            |

**Ưu điểm của các hệ thống hiện tại:**

- Sở hữu dữ liệu thực tế khổng lồ (hàng tỷ tương tác), cho phép CF hoạt động hiệu quả với độ chính xác cao.
- Có đội ngũ kỹ thuật chuyên sâu, liên tục tối ưu thuật toán và xử lý edge cases.
- Cơ chế anti-fraud, review verification và listing verification đã成熟.

**Nhược điểm của các hệ thống hiện tại:**

- Thiếu tính minh bạch: không giải thích lý do gợi ý cho người dùng.
- "Winner-takes-most": item phổ biến được gợi ý quá nhiều, item mới bị lép vế.
- Không cho phép so sánh nhiều chiến lược trên cùng tập dữ liệu (closed-source).

**Điểm cần cải tiến mà đề tài hướng tới:**

- Xây dựng kiến trúc mở, cho phép so sánh nhiều chiến lược (multi-strategy).
- Hiển thị confidence score để tăng tính minh bạch.
- Triển khai dual-feedback (implicit + explicit) phù hợp với thực tế ngành khách sạn.

---

## PHẦN 2: Xác định nguồn dữ liệu và tính khách quan của dữ liệu giả lập

> **Gợi ý vị trí:** Chương 3, thêm mục **3.2.3** (sau 3.2.2 Phân tích yêu cầu phi chức năng)
> **Hoặc:** Chương 2, bổ sung vào mục 2.4.5 (sau phần Implicit Feedback)
> **Hoặc:** Chương 3, thêm mục **3.5** riêng biệt về dữ liệu đánh giá

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

Trong các nghiên cứu về hệ gợi ý (recommender systems), việc sử dụng dữ liệu giả lập (synthetic data) là một phương pháp phổ biến nhằm kiểm tra khả năng học của mô hình trong môi trường có kiểm soát, đặc biệt trong các bài toán chưa có dữ liệu thực tế hoặc cần kiểm soát các yếu tố như sparsity và hành vi người dùng [3][7].

> **Kết luận:** Trong bối cảnh thiếu dữ liệu thực tế, đề tài sử dụng phương pháp sinh dữ liệu giả lập có kiểm soát (controlled synthetic data generation). Phương pháp này nhằm:
>
> - Kiểm tra khả năng học của mô hình trong môi trường có kiểm soát
> - Đánh giá tương đối giữa các phương pháp (so với baseline)
> - Phân tích ảnh hưởng của các yếu tố như sparsity, hành vi người dùng

#### C. Lý do không sử dụng dữ liệu thực tế từ TripAdvisor hoặc tương tự

**Thứ nhất, sự thiếu hụt về dữ liệu "Hành vi ngầm" (Implicit Data).**
Đề tài nhấn mạnh vào phân tích hành vi người dùng. TripAdvisor chủ yếu cung cấp dữ liệu Explicit (Review và Rating). Trong thực tế, dữ liệu Review chỉ chiếm khoảng 1-5% tổng lượng tương tác. 95% còn lại là hành vi ngầm: xem phòng, click chuột, thời gian dừng chân, tìm kiếm nhưng không đặt. Dữ liệu giả lập cho phép mô phỏng toàn bộ phễu hành vi (Conversion Funnel), giúp kiểm chứng được các endpoint của Kafka và Search Service.

**Thứ hai, rào cản kỹ thuật và tính nhất quán (Data Consistency).**
Dữ liệu từ TripAdvisor thường được lấy về thông qua kỹ thuật Crawl. Cấu trúc ID, Category và thuộc tính khách sạn khác hoàn toàn với Database của hệ thống. Việc ép dữ liệu thô vào kiến trúc Microservices sẽ tốn phần lớn thời gian làm sạch và ánh xạ. Hơn nữa, để train được SVD, cần một ma trận User-Item khép kín — dữ liệu cào thường bị rời rạc, dẫn đến ma trận quá thưa thớt.

**Thứ ba, kiểm soát "Độ thưa" (Sparsity) để thử nghiệm giới hạn.**
Với dữ liệu giả lập, có thể chủ động tạo ra các kịch bản: kịch bản dày (ít user - ít item) và kịch bản cực thưa (nhiều user - nhiều item, Sparsity 99%). Việc này giúp đánh giá hiệu năng của AI Service, điều mà dữ liệu tĩnh không làm được.

**Thứ tư, vấn đề bản quyền và đạo đức nghiên cứu (Academic Integrity).**
Việc sử dụng dữ liệu thương mại của TripAdvisor mà không thông qua API chính thức có thể vi phạm điều khoản sử dụng. Dữ liệu giả lập (Synthetic Data) đang là xu hướng nghiên cứu mới trong AI (Data-centric AI). Đề tài đi theo hướng: "Xây dựng hệ thống hoàn chỉnh trước, nạp dữ liệu thật sau".

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

## TÀI LIỆU THAM KHẢO (bổ sung)

- [3] Ricci, F., Rokach, L., & Shapira, B. (2015). _Recommender Systems Handbook_. Springer.
- [7] Patki, N., Wedge, R., & Veeramachaneni, K. (2016). "The Synthetic Data Vault." _IEEE DSAA_.
- Herlocker, J.L., et al. (2004). "Evaluating collaborative filtering recommender systems." _ACM TOIS_, 22(1).
