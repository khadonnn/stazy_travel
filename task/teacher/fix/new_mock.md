### 3.3.1. Tổng quan nguồn dữ liệu mô phỏng

Để phục vụ quá trình huấn luyện và đánh giá mô hình, đề tài sử dụng phương pháp tạo dữ liệu giả lập có kiểm soát (controlled synthetic data generation). Toàn bộ quy trình được tự động hóa bằng các script Python chạy tuần tự và có ràng buộc phụ thuộc dữ liệu đầu vào.

Quy trình chính gồm:

- `generate_data.py`: khởi tạo thực thể, sinh danh sách 200 người dùng và 255 khách sạn.
- `generate_mock_interactions.py`: mô phỏng hành vi người dùng, sinh dữ liệu implicit và explicit synthetic.
- `generate_reviews_from_csv.py`: tạo tập đánh giá tiếng Việt thật từ CSV để bổ sung explicit feedback.
- `generate_recommendations.py`: hợp nhất implicit và explicit, sau đó tạo gợi ý cho toàn bộ người dùng.

Dữ liệu được sinh theo cơ chế phân cụm người dùng (User Clustering) thành 3 phân khúc: bình dân (budget), tầm trung (mid-range) và cao cấp (luxury). Trong bản chạy hiện tại sau khi refactor cơ chế thời gian, script `generate_mock_interactions.py` cho ra:

| Chỉ số                         |        Giá trị |
| ------------------------------ | -------------: |
| Số người dùng                  |            200 |
| Số khách sạn                   |            255 |
| Tổng lượt tương tác (implicit) |          7.875 |
| Tổng đánh giá (explicit)       |            335 |
| Phân bố: CLICK_BOOK_NOW        | 2.035 (25,21%) |
| Phân bố: ADD_TO_WISHLIST       |  2.679 (32,9%) |
| Phân bố: BOOK                  |    579 (6,70%) |
| Phân bố: VIEW                  | 1.228 (14,64%) |
| Phân bố: RATE_POSITIVE         |   800 (10,25%) |
| Phân bố: RATE_NEGATIVE         |    823 (9,73%) |
| Độ thưa ma trận (implicit)     |          91,2% |
| Độ thưa ma trận (explicit)     |          99,6% |

Ngoài dữ liệu synthetic ở trên, bước `generate_recommendations.py` còn merge thêm explicit review tiếng Việt thật từ `__reviews_real_vi.json`. Theo log chạy gần nhất, hệ thống thu được:

| Chỉ số                                    | Giá trị |
| ----------------------------------------- | ------: |
| Tổng cặp `(user, hotel)` unique sau merge |  18.904 |
| Implicit giữ lại                          |   5.544 |
| Explicit override                         |  13.360 |

Độ thưa ma trận được ghi nhận trong báo cáo đánh giá trước đó là:

| Chỉ số                     | Giá trị |
| -------------------------- | ------: |
| Độ thưa ma trận (implicit) |  91,19% |

Bảng 3.7: Giả lập có kiểm soát (controlled synthetic data)

Hình 3.7: Phân bố các tín hiệu tương tác trong tập dữ liệu giả lập

### 3.3.2. Lý do không sử dụng dữ liệu từ các nguồn khác (scraping)

Đề tài quyết định không sử dụng dữ liệu thu thập từ các nền tảng thương mại (như TripAdvisor hoặc các hệ thống tương tự) dựa trên các nguyên nhân chính sau:

1. Thiếu hụt dữ liệu hành vi ngầm định (implicit feedback): Mục tiêu nghiên cứu của đề tài tập trung vào việc phân tích hành vi tương tác người dùng trong hệ gợi ý. Tuy nhiên, các nền tảng công khai thường chủ yếu cung cấp dữ liệu đánh giá tường minh như rating và review thuộc explicit feedback. Theo Ricci et al. (2015), đánh giá tường minh chỉ chiếm một phần nhỏ tổng tương tác; phần lớn còn lại là hành vi ngầm như xem, click và lưu. Việc sử dụng dữ liệu giả lập có kiểm soát cho phép mô phỏng toàn bộ phễu chuyển đổi người dùng (conversion funnel), từ đó hỗ trợ đánh giá chính xác luồng xử lý sự kiện và các endpoint trong hệ thống.

2. Rào cản kiến trúc và tính nhất quán (data consistency): Dữ liệu crawl thường rời rạc và không đồng nhất với schema của hệ thống microservices. Quá trình làm sạch, ánh xạ và chuẩn hóa dữ liệu crawl có thể chiếm phần lớn thời gian triển khai nhưng không trực tiếp phục vụ mục tiêu nghiên cứu. Ngoài ra, dữ liệu crawl thường tạo ra ma trận user-item cực kỳ thưa, gây khó khăn cho việc huấn luyện các mô hình phân rã ma trận như SVD.

3. Khả năng kiểm thử và kiểm soát dữ liệu: Dữ liệu giả lập cho phép chủ động tạo ra các kịch bản thử nghiệm như tập dữ liệu mật độ cao, tập dữ liệu quy mô lớn với độ thưa cao, hoặc các kịch bản stress-test cho AI Service và hệ thống streaming. Những tình huống này rất khó thực hiện nếu phụ thuộc hoàn toàn vào dữ liệu thực tế tĩnh.

### 3.3.3. Cơ chế kiểm soát tính khách quan trong thực nghiệm

Để đảm bảo kết quả đánh giá phản ánh đúng chất lượng của mô hình thay vì phụ thuộc vào may rủi của dữ liệu đầu vào, đề tài sử dụng các cơ chế kiểm soát sau:

| Cơ chế              | Mô tả                                                                               |
| ------------------- | ----------------------------------------------------------------------------------- |
| Temporal split      | Chia dữ liệu theo trục thời gian (60% train, 20% validation, 20% test)              |
| Baseline comparison | So sánh CF với baseline đơn giản (Top Popular cho implicit, User Mean cho explicit) |
| Sparsity kiểm soát  | Độ thưa 90,95% (implicit) và 99,57% (explicit) phản ánh đúng điều kiện thực tế      |
| Dual-feedback       | Implicit CF → Precision@K, Recall@K, NDCG@K; Explicit CF → RMSE, MAE                |

Bảng 3.8: Cơ chế kiểm soát tính khách quan trong thực nghiệm

### 3.3.4. Kết quả đánh giá mô hình gợi ý

Kết quả đánh giá mới nhất được ghi nhận từ hai chế độ đánh giá riêng biệt, tương ứng với implicit feedback và explicit feedback.

#### a) Kết quả đánh giá Implicit CF (Ranking)

| Metric      | CF Model | Baseline (Top Popular) | Cải thiện |
| ----------- | -------: | ---------------------: | --------: |
| Precision@5 |   0,0340 |                 0,0280 |    +21,4% |
| Recall@5    |   0,0258 |                 0,0159 |    +62,2% |
| NDCG@5      |   0,0420 |                 0,0286 |    +46,9% |

Bảng 3.10: Kết quả đánh giá Implicit CF (Ranking)

#### b) Kết quả đánh giá Explicit CF (Rating Prediction)

| Metric | CF Model | Baseline (User Mean) | Cải thiện |
| ------ | -------: | -------------------: | --------: |
| RMSE   |   1,0672 |               1,0672 |      0,0% |
| MAE    |   0,8402 |               0,8402 |      0,0% |

Bảng 3.11: Kết quả đánh giá Explicit CF (Rating Prediction)

Kết quả cho thấy mô hình implicit CF cải thiện rõ rệt so với baseline Top Popular, đặc biệt ở Recall@5 và NDCG@5. Ngược lại, explicit CF trong cấu hình hiện tại đạt mức tương đương với baseline User Mean, cho thấy dữ liệu rating vẫn còn thưa mạnh và khó khai thác thêm tín hiệu dự đoán bằng memory-based CF.

**Giải thích ngắn (Diagnostics & hành động đề xuất)**

- Trong một lần chạy với _synthetic explicit_ (335 ratings), explicit CF cho kết quả bằng baseline (RMSE/MAE không đổi). Nguyên nhân: ma trận rating rất thưa và thuật toán user-based không tìm được neighbor có rating cho hầu hết mục — hệ quả là mô hình thường fallback về `user_mean` (ví dụ: 72/73 lần, ~98.6%).
- Khi sử dụng file đánh giá thực tế lớn hơn `__reviews_real_vi.json` (15.364 ratings), ma trận bớt thưa hơn (sparsity train ≈ 83.5%) nhưng hiện tại CF chưa cải thiện RMSE so với baseline (CF RMSE=1.0948 vs baseline RMSE=0.9175). Chẩn đoán: phân bố rating rất nghiêng (80% là 5⭐), và user-based CF (mean-centered Pearson) có thể chưa phù hợp — cần model có bias/latent factors.

Hành động đề xuất (thứ tự ưu tiên sẽ thực hiện trong báo cáo và thực nghiệm):

1. (Đang thực hiện tiếp theo) Thử mô hình Biased-MF / SVD để nắm xem latent-factors có cải thiện RMSE/MAE không — script thử nghiệm sẽ được chạy trên `__reviews_real_vi.json` và báo kết quả.
2. Nếu SVD không cải thiện, thử augment dữ liệu rating có kiểm soát (tăng overlap user-item) hoặc cân bằng mẫu (downsample 5⭐ hoặc upsample các rating thấp hơn) rồi đánh giá lại.
3. Kết hợp tín hiệu implicit (weights từ interactions) vào mô hình hybrid hoặc như features để hỗ trợ dự đoán rating.

Ghi chú: Các con số trong báo cáo phản ánh kết quả của từng lần chạy cụ thể; vì pipeline có yếu tố ngẫu nhiên (sinh dữ liệu), nếu cần số liệu cố định cho báo cáo chính thức, nên lưu file JSON kết quả kèm checksum và ghi chú "số liệu này được sinh tại thời điểm X".
