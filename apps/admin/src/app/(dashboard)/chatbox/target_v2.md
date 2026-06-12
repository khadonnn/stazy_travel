# ADDITIONAL REVIEW REQUEST

Sau khi hoàn thành thiết kế trước đó, hãy thực hiện thêm một vòng review với góc nhìn:

- Senior BI Product Designer
- Enterprise Analytics Architect
- AI Copilot UX Specialist

Mục tiêu:

Không redesign lại toàn bộ.

Chỉ xác định các điểm còn thiếu hoặc chưa tối ưu cho một BI Agent thực tế.

---

# CONTEXT

Hiện hệ thống đã có:

Analytics:

- daily_metrics
- growth_rate
- predictions
- anomalies
- hourly_activity

Hotels:

- hotel_stats

Customers:

- customer_segments
- user_access_stats

Operations:

- admin_action

Chatbox có khả năng:

- Hiển thị chart
- Hiển thị KPI
- Hiển thị follow-up chips
- Hiển thị action cards
- Context-aware suggestions

---

# REVIEW FOCUS

## 1. KPI CARDS STRATEGY

Đánh giá:

- Có nên có KPI cards riêng không?
- KPI cards nên xuất hiện ở đâu?
- KPI cards nào là quan trọng nhất cho Admin Hotel?

Ví dụ:

Revenue
Bookings
Occupancy Rate
Active Hotels
Returning Customers

Đề xuất layout tối ưu.

---

## 2. INSIGHT-FIRST EXPERIENCE

Hiện thiết kế vẫn thiên về Dashboard + Charts.

Hãy đề xuất cách biến hệ thống thành AI Analyst thực thụ.

Ví dụ:

Thay vì:

"Doanh thu hôm nay là 28 triệu"

AI nên trả lời:

"Doanh thu tăng 12%.
Nguyên nhân chính đến từ lượng booking cuối tuần tăng."

Hãy đề xuất:

- Insight cards
- Recommendation cards
- Opportunity cards
- Anomaly cards

---

## 3. PIE CHART OPPORTUNITIES

Xác định các dữ liệu nào phù hợp để render Pie / Donut Chart.

Ví dụ:

Customer Segments:

- New
- Returning

Hotel Categories:

- Hotel
- Resort
- Villa
- Homestay

Revenue Distribution:

- Theo loại khách sạn

Cho mỗi trường hợp hãy giải thích:

- Pie Chart
- Bar Chart
- Table

loại nào phù hợp nhất.

---

## 4. TABLE RENDERING

Admin thường cần bảng dữ liệu hơn biểu đồ.

Đề xuất:

Các trường hợp nên hiển thị Table thay vì Chart.

Ví dụ:

Top Hotels
Top Customers
Anomaly List
Revenue Ranking

Đề xuất một TableCard component tổng quát.

---

## 5. FOLLOW-UP CHIP IMPROVEMENTS

Hiện follow-up chips được sinh từ dataKeys.

Đánh giá:

Có nên chuyển sang:

- intent-based
- query-type based
- conversation-context based

hay không?

Cho ví dụ cụ thể.

---

## 6. INSIGHTS CAPABILITY

Đề xuất một capability mới:

💡 Insights

Ví dụ:

- Có gì bất thường hôm nay?
- Điều gì đang làm doanh thu giảm?
- Khách sạn nào cần chú ý?
- Tôi nên làm gì tiếp theo?
- Cơ hội tăng trưởng nào đang bị bỏ lỡ?

Hãy đánh giá:

- Có nên thêm capability này không?
- Nó mang lại giá trị gì so với dashboard truyền thống?

---

## 7. OVER-ENGINEERING CHECK

Review toàn bộ kiến trúc đã đề xuất.

Chỉ ra:

- Component nào đang quá phức tạp
- Component nào có thể gộp lại
- Những gì không cần thiết cho đồ án tốt nghiệp
- Những gì nên ưu tiên trước

Mục tiêu:

Giữ hệ thống đơn giản nhưng vẫn thể hiện rõ giá trị của AI Agent.

---

# OUTPUT

Trả lời theo cấu trúc:

1. Missing Opportunities
2. KPI Improvements
3. Pie Chart Opportunities
4. Table Opportunities
5. Insight Capability Design
6. Simplification Recommendations
7. Top 5 Improvements To Prioritize

Không viết code.

Tập trung vào BI Product Design và AI Assistant Experience.
