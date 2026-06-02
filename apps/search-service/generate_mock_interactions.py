import json
import os
import random
import uuid
import numpy as np
from faker import Faker
from datetime import datetime, timedelta
from collections import defaultdict

fake = Faker()
random.seed(42)
np.random.seed(42)

# ---------------------------------------------------------
# CẤU HÌNH & HẰNG SỐ KIỂM SOÁT
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_DIR = os.path.join(BASE_DIR, "jsons")

HOTEL_FILE = os.path.join(JSON_DIR, "__homeStay.json")
USER_FILE = os.path.join(JSON_DIR, "__users.json")

OUTPUT_INTERACTIONS_FILE = os.path.join(JSON_DIR, "__interactions.json")
OUTPUT_REVIEWS_FILE = os.path.join(JSON_DIR, "__reviews.json")
OUTPUT_METRICS_FILE = os.path.join(JSON_DIR, "__metrics.json")
OUTPUT_DAILY_STATS_FILE = os.path.join(JSON_DIR, "__daily_stats.json")

TARGET_INTERACTIONS = 7875
TARGET_USERS = 200
TARGET_HOTELS = 255
TARGET_REVIEWS = 335

# ---------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------
def load_json(filepath):
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

# =========================================================
# NHPP & GAUSSIAN MIXTURE TIMESTAMP GENERATOR
# =========================================================
base_date = datetime(2024, 1, 1)
dates_2024 = [base_date + timedelta(days=i) for i in range(366)]
date_weights = []

for d in dates_2024:
    wd = d.weekday()
    if wd in [0, 1, 2]:
        date_weights.append(1.0)
    elif wd in [3, 6]:
        date_weights.append(1.5)
    else:
        date_weights.append(3.0)

date_probs = np.array(date_weights) / sum(date_weights)

def generate_gmm_timestamp():
    """Sinh timestamp với NHPP cho ngày và GMM cho giờ (dùng hoàn toàn NumPy)"""
    chosen_date = np.random.choice(dates_2024, p=date_probs)
    
    if np.random.rand() < 0.35:
        hour = np.random.normal(12, 1.5)
    else:
        hour = np.random.normal(20, 2.0)
        
    hour = int(np.clip(round(hour), 0, 23))
    minute = np.random.randint(0, 60)
    second = np.random.randint(0, 60)
    
    return chosen_date.replace(hour=hour, minute=minute, second=second)

# =========================================================
# GAUSSIAN RATING GENERATOR
# =========================================================
def compute_rating(user_seg, hotel_seg):
    """
    rating = base_score + noise
    noise ~ N(0, 0.5^2)
    Base score phụ thuộc độ phù hợp giữa user cluster và hotel cluster.
    """
    if user_seg == hotel_seg:
        base_score_map = {
            "budget": 3.5,
            "mid": 4.0,
            "luxury": 4.5
        }
        base_score = base_score_map[user_seg]
    elif user_seg == "mid" or hotel_seg == "mid":
        base_score = 3.5
    else:
        base_score = 2.5

    noise = np.random.normal(0, 0.5)
    rating = np.clip(base_score + noise, 1.0, 5.0)
    
    # Giữ 1 chữ số thập phân, mô phỏng điểm số thực tế
    return round(float(rating), 1)

# =========================================================
# DYNAMIC REVIEW GENERATOR
# =========================================================
def generate_explicit_sentiments(rating, sentiment):
    aspects = ["service", "room", "location", "price", "amenities", "cleanliness"]
    chosen_aspects = random.sample(aspects, k=random.randint(2, 5))
    explicit_data = {}
    for aspect in chosen_aspects:
        if sentiment == "POSITIVE":
            explicit_data[aspect] = random.choices(["POSITIVE", "NEUTRAL"], weights=[0.85, 0.15])[0]
        elif sentiment == "NEUTRAL":
            explicit_data[aspect] = random.choices(["POSITIVE", "NEUTRAL", "NEGATIVE"], weights=[0.3, 0.4, 0.3])[0]
        else:
            explicit_data[aspect] = random.choices(["NEGATIVE", "NEUTRAL"], weights=[0.8, 0.2])[0]
    return explicit_data

def generate_dynamic_review(sentiment):
    if sentiment == "POSITIVE":
        subjects = ["Phòng ốc", "Vị trí", "Nhân viên", "Không gian", "Bữa sáng", "Tiện ích"]
        adjectives = ["cực kỳ sạch sẽ", "rất tiện đi lại", "nhiệt tình", "rộng rãi, chill", "thiết kế hiện đại", "vượt mong đợi"]
        endings = ["Chắc chắn sẽ quay lại!", "10 điểm không có nhưng.", "Rất trọn vẹn.", "Rất đáng tiền.", "Highly recommend."]
        return f"{random.choice(subjects)} {random.choice(adjectives)}. {random.choice(endings)}"
    elif sentiment == "NEGATIVE":
        subjects = ["Trải nghiệm", "Phòng", "Dịch vụ", "Vệ sinh", "Thái độ nhân viên", "Cách âm"]
        adjectives = ["quá tệ", "ẩm mốc có mùi", "không giống quảng cáo", "làm việc thiếu chuyên nghiệp", "rất kém", "quá ồn ào"]
        endings = ["Sẽ không bao giờ quay lại.", "Tiếc tiền thật sự.", "Thất vọng tràn trề.", "Cần xem lại quản lý.", "Trải nghiệm đáng quên."]
        return f"{random.choice(subjects)} {random.choice(adjectives)}. {random.choice(endings)}"
    else: 
        starts = ["Nói chung là", "Đánh giá khách quan thì", "Theo cảm nhận của mình,"]
        middles = ["mức cơ bản, tạm chấp nhận.", "phòng ốc bình thường.", "tiện nghi đầy đủ nhưng hơi cũ.", "hợp để ngủ qua đêm.", "tương xứng số tiền."]
        endings = ["", "Có dịp sẽ ghé lại.", "Sẽ cân nhắc nếu không có chỗ khác."]
        return f"{random.choice(starts)} {random.choice(middles)} {random.choice(endings)}".strip()

# ---------------------------------------------------------
# MAIN LOGIC WITH CLUSTERING
# ---------------------------------------------------------
print("📊 GENERATING CONTROLLED SYNTHETIC DATA")
print("=" * 60)

hotels = load_json(HOTEL_FILE) or [{"id": f"hotel_{i}", "price": random.randint(500000, 5000000)} for i in range(1, TARGET_HOTELS + 1)]
users_data = load_json(USER_FILE)
users = [{"id": u["id"]} for u in users_data] if users_data else [{"id": f"user_{i}"} for i in range(1, TARGET_USERS + 1)]

# Phân cụm Users
user_segments = {}
n_budget, n_mid = len(users) // 3, len(users) // 3
for i, u in enumerate(users):
    if i < n_budget: user_segments[u['id']] = 'budget'
    elif i < n_budget + n_mid: user_segments[u['id']] = 'mid'
    else: user_segments[u['id']] = 'luxury'

# Phân cụm Hotels
hotel_segments = {}
hotel_list = sorted(hotels, key=lambda h: h.get('price', 0))
n_h_budget, n_h_mid = len(hotels) // 3, len(hotels) // 3
for i, h in enumerate(hotel_list):
    if i < n_h_budget: hotel_segments[h['id']] = 'budget'
    elif i < n_h_budget + n_h_mid: hotel_segments[h['id']] = 'mid'
    else: hotel_segments[h['id']] = 'luxury'

preference_matrix = {
    ('budget', 'budget'): 0.8, ('budget', 'mid'): 0.15, ('budget', 'luxury'): 0.05,
    ('mid', 'budget'): 0.2, ('mid', 'mid'): 0.6, ('mid', 'luxury'): 0.2,
    ('luxury', 'budget'): 0.05, ('luxury', 'mid'): 0.15, ('luxury', 'luxury'): 0.8,
}

# Khống chế tổng lượt tương tác
user_interaction_counts = {u['id']: 15 for u in users}
remaining_interactions = TARGET_INTERACTIONS - (15 * len(users))
for _ in range(remaining_interactions):
    uid = random.choice(users)['id']
    user_interaction_counts[uid] += 1

interactions = []
reviews = []
daily_agg = defaultdict(lambda: {
    "totalRevenue": 0, "totalBookings": 0, "totalCancels": 0,
    "totalViews": 0, "totalClickBook": 0, "totalLikes": 0, "totalSearch": 0
})

print(f"\n[1/3] Đang sinh {TARGET_INTERACTIONS} lượt tương tác...")

for user in users:
    user_id = user['id']
    user_seg = user_segments[user_id]
    target_count = user_interaction_counts[user_id]
    
    valid_count = 0
    while valid_count < target_count:
        hotel = random.choice(hotels)
        hotel_id = hotel['id']
        hotel_seg = hotel_segments[hotel_id]
        
        pref_score = preference_matrix[(user_seg, hotel_seg)]
        pref_score_noisy = max(0.05, min(1.0, pref_score + random.uniform(-0.1, 0.1)))
        
        if random.random() > pref_score_noisy and random.random() > 0.3:
            continue
            
        timestamp = generate_gmm_timestamp()
        date_key = timestamp.strftime("%Y-%m-%d")
        rand = random.random()
        
        if rand < 0.15 * pref_score:
            rating = compute_rating(user_seg, hotel_seg)
            booking_id = str(uuid.uuid4())
            price = hotel.get('price', 1000000)
            
            interactions.append({
                "id": str(uuid.uuid4()), "userId": user_id, "hotelId": hotel_id,
                "sessionId": str(uuid.uuid4()), "type": "BOOK", "rating": rating,
                "timestamp": timestamp.isoformat(), "metadata": {"amount": price, "bookingId": booking_id}
            })
            daily_agg[date_key]["totalBookings"] += 1
            daily_agg[date_key]["totalRevenue"] += price
            
            # Sinh review sơ bộ (sẽ được kiểm soát chính xác ở bước sau)
            if random.random() < 0.635:
                review_timestamp = timestamp + timedelta(days=random.randint(2, 7))
                if rating >= 4.0: sentiment = random.choices(['POSITIVE', 'NEUTRAL'], weights=[0.8, 0.2])[0]
                elif rating >= 3.0: sentiment = random.choices(['NEUTRAL', 'POSITIVE', 'NEGATIVE'], weights=[0.5, 0.25, 0.25])[0]
                else: sentiment = random.choices(['NEGATIVE', 'NEUTRAL'], weights=[0.8, 0.2])[0]
                
                reviews.append({
                    "id": str(uuid.uuid4()), "bookingId": booking_id, "userId": user_id, "hotelId": hotel_id,
                    "rating": rating, "comment": generate_dynamic_review(sentiment),
                    "sentiment": sentiment, "explicitSentiments": generate_explicit_sentiments(rating, sentiment),
                    "nlpProcessed": True, "createdAt": review_timestamp.isoformat(), "updatedAt": review_timestamp.isoformat()
                })
            
            if random.random() < 0.05:
                daily_agg[date_key]["totalCancels"] += 1
                daily_agg[date_key]["totalRevenue"] -= price
                
        elif rand < 0.40:
            interactions.append({"id": str(uuid.uuid4()), "userId": user_id, "hotelId": hotel_id, "sessionId": str(uuid.uuid4()), "type": "ADD_TO_WISHLIST", "rating": None, "timestamp": timestamp.isoformat(), "metadata": {}})
            daily_agg[date_key]["totalLikes"] += 1
        elif rand < 0.65:
            interactions.append({"id": str(uuid.uuid4()), "userId": user_id, "hotelId": hotel_id, "sessionId": str(uuid.uuid4()), "type": "CLICK_BOOK_NOW", "rating": None, "timestamp": timestamp.isoformat(), "metadata": {}})
            daily_agg[date_key]["totalClickBook"] += 1
        elif rand < 0.80:
            interactions.append({"id": str(uuid.uuid4()), "userId": user_id, "hotelId": hotel_id, "sessionId": str(uuid.uuid4()), "type": "VIEW", "rating": None, "timestamp": timestamp.isoformat(), "metadata": {"dwellTimeSec": random.randint(5, 120)}})
            daily_agg[date_key]["totalViews"] += 1
        elif rand < 0.90:
            interactions.append({"id": str(uuid.uuid4()), "userId": user_id, "hotelId": hotel_id, "sessionId": str(uuid.uuid4()), "type": "RATE_POSITIVE", "rating": float(random.choice([4, 5])), "timestamp": timestamp.isoformat(), "metadata": {}})
        else:
            interactions.append({"id": str(uuid.uuid4()), "userId": user_id, "hotelId": hotel_id, "sessionId": str(uuid.uuid4()), "type": "RATE_NEGATIVE", "rating": float(random.choice([1, 2])), "timestamp": timestamp.isoformat(), "metadata": {}})
            
        valid_count += 1

print(f"\n[2/3] Cân bằng để đạt chính xác {TARGET_REVIEWS} lượt đánh giá (Reviews)...")

# Khống chế chính xác số review
if len(reviews) > TARGET_REVIEWS:
    reviews = random.sample(reviews, TARGET_REVIEWS)
elif len(reviews) < TARGET_REVIEWS:
    shortage = TARGET_REVIEWS - len(reviews)
    existing_booking_ids = {r["bookingId"] for r in reviews}
    
    candidate_bookings = [
        i for i in interactions
        if (i["type"] == "BOOK" and i["metadata"].get("bookingId") not in existing_booking_ids)
    ]
    
    random.shuffle(candidate_bookings)
    
    for booking in candidate_bookings[:shortage]:
        review_time = datetime.fromisoformat(booking["timestamp"]) + timedelta(days=random.randint(2, 7))
        reviews.append({
            "id": str(uuid.uuid4()),
            "bookingId": booking["metadata"]["bookingId"],
            "userId": booking["userId"],
            "hotelId": booking["hotelId"],
            "rating": booking["rating"],
            "comment": "Trải nghiệm nhìn chung khá tốt.",
            "sentiment": "NEUTRAL",
            "explicitSentiments": {"service": "NEUTRAL"},
            "nlpProcessed": True,
            "createdAt": review_time.isoformat(),
            "updatedAt": review_time.isoformat()
        })

print("\n[3/3] Xác thực tính toàn vẹn (Assertion Check) và lưu file...")

# Kích hoạt Strict Check trước khi lưu
assert len(users) == TARGET_USERS, f"Lỗi: Lệch số users ({len(users)})"
assert len(hotels) == TARGET_HOTELS, f"Lỗi: Lệch số hotels ({len(hotels)})"
assert len(interactions) == TARGET_INTERACTIONS, f"Lỗi: Lệch số interactions ({len(interactions)})"
assert len(reviews) == TARGET_REVIEWS, f"Lỗi: Lệch số reviews ({len(reviews)})"

os.makedirs(JSON_DIR, exist_ok=True)
with open(OUTPUT_INTERACTIONS_FILE, 'w', encoding='utf-8') as f: json.dump(interactions, f, indent=2, ensure_ascii=False)
with open(OUTPUT_REVIEWS_FILE, 'w', encoding='utf-8') as f: json.dump(reviews, f, indent=2, ensure_ascii=False)

daily_stats_list = [{"date": f"{k}T00:00:00.000Z", **v} for k, v in daily_agg.items()]
with open(OUTPUT_DAILY_STATS_FILE, 'w', encoding='utf-8') as f: json.dump(daily_stats_list, f, indent=2, ensure_ascii=False)

historical_metrics = []
for i in range(29, -1, -1):
    base_rmse = max(0.80, (0.95 - (i * 0.005)) + random.uniform(-0.02, 0.02))
    precision = round(70 + random.uniform(-5, 5), 2)
    historical_metrics.append({
        "rmse": round(base_rmse, 4), "mae": round(base_rmse * 0.82 + random.uniform(-0.01, 0.01), 4),
        "precisionAt5": precision, "recallAt5": round(60 + random.uniform(-5, 5), 2), "ndcgAt5": round(precision * 0.85 + random.uniform(-2, 2), 2),
        "algorithm": "SVD", "datasetSize": TARGET_INTERACTIONS, "executionTimeMs": random.randint(100, 500),
        "createdAt": (datetime.now() - timedelta(days=i)).isoformat()
    })
with open(OUTPUT_METRICS_FILE, 'w', encoding='utf-8') as f: json.dump(historical_metrics, f, indent=2, ensure_ascii=False)

print("\n[SUMMARY] Data Generation Completed & Verified ✅")
print(f"   Tổng users: {len(users)}")
print(f"   Tổng hotels: {len(hotels)}")
print(f"   Tổng interactions: {len(interactions)}")
print(f"   Tổng reviews (Explicit): {len(reviews)}")

interaction_types = defaultdict(int)
for inter in interactions: interaction_types[inter['type']] += 1
for itype, count in sorted(interaction_types.items()):
    print(f"   {itype}: {count} ({count / len(interactions) * 100:.2f}%)")