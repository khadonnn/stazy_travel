import json
import os
import random
import uuid
import pandas as pd
from faker import Faker
from surprise import Dataset, Reader, SVD
from surprise.model_selection import train_test_split
from surprise import accuracy
from datetime import datetime, timedelta
from collections import Counter, defaultdict

# ---------------------------------------------------------
# 1. CẤU HÌNH
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_DIR = os.path.join(BASE_DIR, "jsons")

# Input files
HOTEL_FILE = os.path.join(JSON_DIR, "__homeStay.json")
USER_FILE = os.path.join(JSON_DIR, "__users.json")

# Output files
OUTPUT_INTERACTIONS_FILE = os.path.join(JSON_DIR, "__interactions.json")
OUTPUT_REVIEWS_FILE = os.path.join(JSON_DIR, "__reviews.json")
OUTPUT_METRICS_FILE = os.path.join(JSON_DIR, "__metrics.json")
OUTPUT_DAILY_STATS_FILE = os.path.join(JSON_DIR, "__daily_stats.json") # File mới

fake = Faker()

POSITIVE_COMMENTS = [
    "Phòng ốc rất sạch sẽ, view đẹp tuyệt vời.",
    "Nhân viên nhiệt tình, địa điểm thuận lợi.",
    "Trải nghiệm tuyệt vời, chắc chắn sẽ quay lại.",
    "Giá cả hợp lý so với chất lượng phục vụ.",
    "Không gian yên tĩnh, thích hợp nghỉ dưỡng.",
    "Bể bơi vô cực rất đẹp, đồ ăn ngon.",
    # Bổ sung thêm 5 bình luận tích cực
    "Check-in nhanh chóng, phòng được upgrade miễn phí, bất ngờ dễ chịu!",
    "Ban công rộng, ngắm hoàng hôn cực chill. Rất đáng tiền!",
    "Đệm êm, ga gối thơm tho, ngủ ngon suốt đêm.",
    "Dịch vụ dọn phòng chuyên nghiệp, thay khăn mỗi ngày.",
    "Gần biển, đi bộ 2 phút là tới. View từ phòng siêu ưng!"
]

NEGATIVE_COMMENTS = [
    "Phòng hơi cũ, cách âm không tốt.",
    "Nhân viên lễ tân thái độ chưa tốt.",
    "Vị trí hơi xa trung tâm, đi lại bất tiện.",
    "Wifi yếu, không làm việc được.",
    "Bữa sáng ít món, không hợp khẩu vị.",
    "Vệ sinh chưa sạch, còn bụi bẩn.",
    # Bổ sung thêm 5 bình luận tiêu cực
    "Mùi ẩm mốc trong phòng, mở cửa cả ngày vẫn không hết.",
    "Gọi lễ tân 3 lần mới có người phản hồi, quá chậm!",
    "Hình ảnh trên web đẹp hơn thực tế nhiều, cảm giác bị lừa.",
    "Điều hòa kêu to, ảnh hưởng giấc ngủ ban đêm.",
    "Không có chỗ để xe an toàn, phải gửi ngoài đường."
]

# ---------------------------------------------------------
# 2. HÀM HỖ TRỢ
# ---------------------------------------------------------
def load_json(filepath):
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

# Hàm sinh Tuning Params giả lập (cho biểu đồ SVD)
def generate_tuning_params(base_rmse):
    # Giả lập: K tăng thì RMSE giảm dần
    data = []
    for k in [10, 20, 30, 40, 50, 60]:
        noise = random.uniform(-0.02, 0.02)
        # RMSE giảm dần theo K
        metric = base_rmse + (60 - k) * 0.002 + noise 
        data.append({"param": k, "metric": round(metric, 4)})
    return data

# ---------------------------------------------------------
# 3. LOGIC CHÍNH
# ---------------------------------------------------------
def generate_data():
    hotels = load_json(HOTEL_FILE)
    if not hotels:
        print(f"❌ Không tìm thấy file hotel.")
        return

    # 1. Load User
    users_data = load_json(USER_FILE)
    users = []
    if users_data:
        for u in users_data:
            users.append({"id": u["id"]})
    else:
        # Fallback tạo user ảo
        for i in range(1, 51):
            users.append({"id": f"user_ai_{i}"})

    interactions = []
    reviews = []
    
    # Dùng dictionary để cộng dồn DailyStat ngay khi sinh Interaction
    daily_agg = defaultdict(lambda: {
        "totalRevenue": 0, "totalBookings": 0, "totalCancels": 0,
        "totalViews": 0, "totalClickBook": 0, "totalLikes": 0, "totalSearch": 0
    })

    print("🤖 Đang sinh dữ liệu mô phỏng Session & DailyStats...")
    
    current_time = datetime.now()

    # Sinh 2000 Sessions (Mỗi session là 1 chuỗi hành động của 1 user)
    for _ in range(2000): 
        user = random.choice(users)
        
        # Tạo Session ID
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        
        # Chọn ngẫu nhiên ngày trong 6 tháng qua
        days_back = random.randint(0, 180)
        base_time = current_time - timedelta(days=days_back)
        date_key = base_time.strftime("%Y-%m-%d") # Key cho DailyStat

        # Mỗi session user xem từ 1-5 khách sạn
        num_viewed = random.randint(1, 5)
        
        for _ in range(num_viewed):
            hotel = random.choice(hotels)
            hotel_id = hotel['id']
            price = hotel.get('price', 1000000)

            # Thời gian hành động diễn ra sau base_time vài giây/phút
            offset_seconds = random.randint(10, 3600)
            timestamp_obj = base_time + timedelta(seconds=offset_seconds)
            timestamp = timestamp_obj.isoformat()

            # 1. VIEW (Luôn có)
            interactions.append({
                "userId": user["id"], "hotelId": hotel_id, "sessionId": session_id,
                "type": "VIEW", "rating": None,
                "timestamp": timestamp, "metadata": {"duration": random.randint(30, 300)}
            })
            daily_agg[date_key]["totalViews"] += 1

            # 2. LIKE (Random 20%)
            if random.random() < 0.2:
                interactions.append({
                    "userId": user["id"], "hotelId": hotel_id, "sessionId": session_id,
                    "type": "LIKE", "rating": None,
                    "timestamp": timestamp, "metadata": {}
                })
                daily_agg[date_key]["totalLikes"] += 1

            # 3. CLICK BOOK (High Intent - Random 15%)
            if random.random() < 0.15:
                interactions.append({
                    "userId": user["id"], "hotelId": hotel_id, "sessionId": session_id,
                    "type": "CLICK_BOOK_NOW", "rating": None,
                    "timestamp": timestamp, "metadata": {}
                })
                daily_agg[date_key]["totalClickBook"] += 1

                # 4. BOOK CONFIRMED (Conversion - 80% của Click Book)
                if random.random() < 0.8:
                    interactions.append({
                        "userId": user["id"], "hotelId": hotel_id, "sessionId": session_id,
                        "type": "BOOK", "rating": None,
                        "timestamp": timestamp,
                        "metadata": {"amount": price}
                    })
                    daily_agg[date_key]["totalBookings"] += 1
                    daily_agg[date_key]["totalRevenue"] += price

                    # 5. CANCEL (Random 5% sau khi Book)
                    if random.random() < 0.05:
                        # Tạo lệnh hủy sau đó vài ngày
                        cancel_time = (timestamp_obj + timedelta(days=random.randint(1, 3))).isoformat()
                        interactions.append({
                            "userId": user["id"], "hotelId": hotel_id, "sessionId": session_id,
                            "type": "CANCEL", "rating": None,
                            "timestamp": cancel_time, "metadata": {}
                        })
                        # Cập nhật thống kê hủy (Lưu ý: Thường trừ doanh thu ở ngày hủy hoặc ngày đặt tùy logic, ở đây trừ ngày đặt cho đơn giản dashboard)
                        daily_agg[date_key]["totalCancels"] += 1
                        daily_agg[date_key]["totalRevenue"] -= price # Hoàn tiền
                    
                    else:
                        # 6. REVIEW (Chỉ review nếu đã book và không hủy)
                        # Tạo rating giả
                        rating = random.choices([5, 4, 3, 2, 1], weights=[50, 30, 10, 5, 5])[0]
                        comment = random.choice(POSITIVE_COMMENTS if rating >=4 else NEGATIVE_COMMENTS)
                        
                        # Lưu vào bảng Review
                        reviews.append({
                            "userId": user["id"], "hotelId": hotel_id, "rating": rating,
                            "comment": comment, "sentiment": "POSITIVE" if rating >=4 else "NEGATIVE",
                            "createdAt": (timestamp_obj + timedelta(days=2)).isoformat()
                        })
                        # Lưu Interaction Rating (để sync data)
                        interactions.append({
                            "userId": user["id"], "hotelId": hotel_id, "sessionId": session_id,
                            "type": "RATING", "rating": rating,
                            "timestamp": (timestamp_obj + timedelta(days=2)).isoformat(),
                            "metadata": {}
                        })

    # --- SAVE FILES ---
    with open(OUTPUT_INTERACTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(interactions, f, ensure_ascii=False, indent=2)
    
    with open(OUTPUT_REVIEWS_FILE, "w", encoding="utf-8") as f:
        json.dump(reviews, f, ensure_ascii=False, indent=2)

    # Xử lý Daily Stats từ dictionary ra list
    daily_stats_list = []
    for date_str, stats in daily_agg.items():
        daily_stats_list.append({
            "date": f"{date_str}T00:00:00.000Z", # Format chuẩn ISO cho Prisma DateTime
            **stats
        })
    
    with open(OUTPUT_DAILY_STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(daily_stats_list, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Đã tạo: {len(daily_stats_list)} ngày thống kê (DailyStat).")

    # -------------------------------------------------
    # C. TRAIN AI MODEL & METRICS (Cập nhật SystemMetric mới)
    # -------------------------------------------------
    print("🧠 Đang giả lập System Metrics & Tuning Params...")
    
    # Giả lập metrics trong 30 ngày gần đây
    historical_metrics = []
    
    for i in range(29, -1, -1):
        date_str = (datetime.now() - timedelta(days=i)).isoformat()
        
        # Giả lập cải thiện dần theo thời gian
        base_rmse = 0.95 - (i * 0.005) # Càng về hiện tại RMSE càng thấp (tốt)
        base_rmse = max(0.80, base_rmse + random.uniform(-0.02, 0.02))

        metric_entry = {
            "rmse": round(base_rmse, 4),
            "precisionAt5": round(70 + random.uniform(-5, 5), 2),
            "recallAt5": round(60 + random.uniform(-5, 5), 2),
            "algorithm": "SVD",
            "datasetSize": 1000 + (30-i)*50,
            "executionTimeMs": random.randint(100, 500), # NEW FIELD
            "createdAt": date_str,
            # NEW FIELD: JSON Tuning Params (Chỉ thêm vào bản ghi mới nhất hoặc tất cả tùy bạn)
            "tuningParams": generate_tuning_params(base_rmse) if i == 0 else None, 
            "trainingHistory": None # SVD không có epoch history, để null
        }
        historical_metrics.append(metric_entry)

    with open(OUTPUT_METRICS_FILE, "w", encoding="utf-8") as f:
        json.dump(historical_metrics, f, indent=2)
            
    print(f"📊 Đã tạo {len(historical_metrics)} bản ghi Metrics.")
    print("🎉 HOÀN TẤT! Copy file JSON vào thư mục seed.")

if __name__ == "__main__":
    os.makedirs(JSON_DIR, exist_ok=True)
    generate_data()