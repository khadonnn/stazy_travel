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
# CẤU HÌNH
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_DIR = os.path.join(BASE_DIR, "jsons")

HOTEL_FILE = os.path.join(JSON_DIR, "__homeStay.json")
USER_FILE = os.path.join(JSON_DIR, "__users.json")

OUTPUT_INTERACTIONS_FILE = os.path.join(JSON_DIR, "__interactions.json")
OUTPUT_REVIEWS_FILE = os.path.join(JSON_DIR, "__reviews.json")
OUTPUT_METRICS_FILE = os.path.join(JSON_DIR, "__metrics.json")
OUTPUT_DAILY_STATS_FILE = os.path.join(JSON_DIR, "__daily_stats.json")

# ---------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------
def load_json(filepath):
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_tuning_params(base_rmse):
    """Giả lập tuning params cho SVD"""
    data = []
    for k in [10, 20, 30, 40, 50, 60]:
        noise = random.uniform(-0.02, 0.02)
        metric = base_rmse + (60 - k) * 0.002 + noise 
        data.append({"param": k, "metric": round(metric, 4)})
    return data

# =========================================================
# DYNAMIC REVIEW GENERATOR (MIX & MATCH)
# =========================================================
def generate_dynamic_review(sentiment):
    """Tạo comment đa dạng dựa trên sentiment"""
    if sentiment == "POSITIVE":
        subjects = ["Phòng ốc", "Vị trí khách sạn", "Nhân viên lễ tân", "Không gian", "Bữa sáng", "Hồ bơi và tiện ích"]
        adjectives = [
            "cực kỳ sạch sẽ và thơm tho", "nằm ngay trung tâm rất tiện đi lại", 
            "siêu nhiệt tình và dễ thương", "rộng rãi, view nhìn ra ngoài cực chill", 
            "được thiết kế rất hiện đại và ấm cúng", "vượt xa mong đợi của mình so với mức giá"
        ]
        endings = [
            "Chắc chắn sẽ quay lại vào lần sau!", "10 điểm không có nhưng nha mọi người.", 
            "Gia đình mình đã có một kỳ nghỉ rất trọn vẹn.", "Rất đáng đồng tiền bát gạo.",
            "Highly recommend cho những ai đang tìm chỗ nghỉ ở đây."
        ]
        return f"{random.choice(subjects)} {random.choice(adjectives)}. {random.choice(endings)}"

    elif sentiment == "NEGATIVE":
        subjects = ["Trải nghiệm", "Phòng", "Chất lượng dịch vụ", "Vệ sinh", "Thái độ nhân viên", "Cách âm của phòng"]
        adjectives = [
            "thật sự quá tệ hại", "rất ẩm mốc và có mùi khó chịu", 
            "không hề giống với hình ảnh quảng cáo trên mạng", "làm việc thiếu chuyên nghiệp, chậm chạp", 
            "rất kém, ga giường có vẻ chưa được thay", "quá ồn ào, mình không thể ngủ được cả đêm"
        ]
        endings = [
            "Sẽ không bao giờ quay lại đây thêm một lần nào nữa.", "Tiếc tiền thật sự, mọi người nên né ra.", 
            "Cảm thấy thất vọng tràn trề.", "Khách sạn cần xem lại khâu quản lý ngay lập tức.",
            "Một trải nghiệm đáng quên cho kỳ nghỉ này."
        ]
        return f"{random.choice(subjects)} {random.choice(adjectives)}. {random.choice(endings)}"

    else:  # NEUTRAL
        starts = ["Nói chung là", "Đánh giá khách quan thì", "Theo cảm nhận của mình,"]
        middles = [
            "mọi thứ ở mức cơ bản, tạm chấp nhận được.", "phòng ốc bình thường, không có gì quá nổi bật.",
            "tiện nghi đầy đủ nhưng hơi cũ.", "chỉ hợp để ngủ qua đêm trong chuyến công tác.",
            "dịch vụ tương xứng với số tiền bỏ ra, không đòi hỏi hơn."
        ]
        endings = ["", "Có dịp tiện đường thì ghé lại.", "Sẽ cân nhắc nếu không tìm được chỗ khác tốt hơn."]
        
        review = f"{random.choice(starts)} {random.choice(middles)} {random.choice(endings)}"
        return review.strip()

# ---------------------------------------------------------
# MAIN LOGIC WITH CLUSTERING
# ---------------------------------------------------------
print("📊 GENERATING MOCK INTERACTIONS WITH USER CLUSTERING")
print("=" * 60)
print("\n[1/6] Loading data...")
hotels = load_json(HOTEL_FILE)
if not hotels:
    print(f"❌ Cannot find hotel file")
    exit(1)

users_data = load_json(USER_FILE)
users = [{"id": u["id"]} for u in users_data] if users_data else []

if not users:
    users = [{"id": f"user_{i}"} for i in range(1, 201)]

print(f"✅ Loaded {len(users)} users, {len(hotels)} hotels")

# =========================================================
# STEP 2: CLASSIFY USERS BY SEGMENT
# =========================================================
print("\n[2/6] Classifying users by segment...")

user_segments = {}
n_budget = len(users) // 3
n_mid = len(users) // 3
n_luxury = len(users) - n_budget - n_mid

user_ids = [u['id'] for u in users]
budget_user_ids = user_ids[:n_budget]
mid_user_ids = user_ids[n_budget:n_budget+n_mid]
luxury_user_ids = user_ids[n_budget+n_mid:]

for uid in budget_user_ids:
    user_segments[uid] = 'budget'
for uid in mid_user_ids:
    user_segments[uid] = 'mid'
for uid in luxury_user_ids:
    user_segments[uid] = 'luxury'

print(f"   Budget users: {len(budget_user_ids)}")
print(f"   Mid-range users: {len(mid_user_ids)}")
print(f"   Luxury users: {len(luxury_user_ids)}")

# =========================================================
# STEP 3: CLASSIFY HOTELS BY SEGMENT
# =========================================================
print("\n[3/6] Classifying hotels by segment...")

hotel_segments = {}
n_hotels_budget = len(hotels) // 3
n_hotels_mid = len(hotels) // 3
n_hotels_luxury = len(hotels) - n_hotels_budget - n_hotels_mid

hotel_list = sorted(hotels, key=lambda h: h.get('price', 0))
for i, h in enumerate(hotel_list):
    if i < n_hotels_budget:
        hotel_segments[h['id']] = 'budget'
    elif i < n_hotels_budget + n_hotels_mid:
        hotel_segments[h['id']] = 'mid'
    else:
        hotel_segments[h['id']] = 'luxury'

print(f"   Budget hotels: {n_hotels_budget}")
print(f"   Mid-range hotels: {n_hotels_mid}")
print(f"   Luxury hotels: {n_hotels_luxury}")

# =========================================================
# STEP 4: GENERATE STRUCTURED INTERACTIONS WITH CLUSTERING
# =========================================================
print("\n[4/6] Generating structured interactions with clustering...")

interactions = []
reviews = []
bookings_created = []

daily_agg = defaultdict(lambda: {
    "totalRevenue": 0, "totalBookings": 0, "totalCancels": 0,
    "totalViews": 0, "totalClickBook": 0, "totalLikes": 0, "totalSearch": 0
})

# Preference matrix: (user_segment, hotel_segment) → probability
preference_matrix = {
    ('budget', 'budget'): 0.8,
    ('budget', 'mid'): 0.15,
    ('budget', 'luxury'): 0.05,
    ('mid', 'budget'): 0.2,
    ('mid', 'mid'): 0.6,
    ('mid', 'luxury'): 0.2,
    ('luxury', 'budget'): 0.05,
    ('luxury', 'mid'): 0.15,
    ('luxury', 'luxury'): 0.8,
}

# Rating scoring function (replaces hard-coded rating_strength_matrix)
def compute_base_score(user_seg, hotel_seg):
    """
    Compute a base rating score based on user-hotel segment match.
    Match → higher base, mismatch → lower base.
    Uses continuous uniform distribution for natural variance.
    """
    if user_seg == hotel_seg:
        # Same segment: strong match → base 3.5–5.0
        return random.uniform(3.5, 5.0)
    elif (user_seg == 'mid' and hotel_seg in ('budget', 'luxury')) or \
         (user_seg in ('budget', 'luxury') and hotel_seg == 'mid'):
        # Adjacent segment: moderate match → base 2.0–4.0
        return random.uniform(2.0, 4.0)
    else:
        # Cross segment (budget↔luxury): weak match → base 1.0–3.0
        return random.uniform(1.0, 3.0)

def compute_rating(user_seg, hotel_seg):
    """
    Final rating = base_score + noise, clamped to [1, 5].
    Noise simulates individual taste variation.
    """
    base_score = compute_base_score(user_seg, hotel_seg)
    noise = random.choice([-1, -0.5, 0, 0, 0.5, 1])  # weighted toward 0
    rating = int(round(min(5, max(1, base_score + noise))))
    return rating

# Generate interactions per user
for user in users:
    user_id = user['id']
    user_segment = user_segments[user_id]
    
    # ~80 interactions per user
    num_interactions = random.randint(50, 100)
    
    for _ in range(num_interactions):
        hotel = random.choice(hotels)
        hotel_id = hotel['id']
        hotel_segment = hotel_segments[hotel_id]
        
        # Check preference (with noise for realism)
        pref_score = preference_matrix[(user_segment, hotel_segment)]
        pref_score_noisy = pref_score + random.uniform(-0.1, 0.1)
        pref_score_noisy = max(0.05, min(1.0, pref_score_noisy))
        
        if random.random() > pref_score_noisy:
            # Even when pref fails, 30% chance to keep (realistic exploration)
            if random.random() > 0.3:
                continue
        
        # Pick interaction type
        match_strength = pref_score
        
        # Generate timestamp
        base_date = datetime(2024, 1, 1)
        timestamp = base_date + timedelta(days=random.randint(0, 364), hours=random.randint(0, 23))
        date_key = timestamp.strftime("%Y-%m-%d")
        
        if random.random() < 0.3 * match_strength:
            # BOOK
            interaction_type = "BOOK"
            rating = compute_rating(user_segment, hotel_segment)
            
            booking_id = str(uuid.uuid4())
            price = hotel.get('price', 1000000)
            
            interactions.append({
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "hotelId": hotel_id,
                "sessionId": str(uuid.uuid4()),
                "type": interaction_type,
                "rating": rating,
                "timestamp": timestamp.isoformat(),
                "metadata": {"amount": price, "bookingId": booking_id}
            })
            
            bookings_created.append({
                "bookingId": booking_id,
                "userId": user_id,
                "hotelId": hotel_id,
                "timestamp": timestamp,
                "price": price
            })
            
            daily_agg[date_key]["totalBookings"] += 1
            daily_agg[date_key]["totalRevenue"] += price
            
            # Generate review (realistic: not everyone reviews)
            # People with extreme experiences (very good or very bad) are more likely to review
            if rating >= 4:
                review_prob = 0.7
            elif rating == 3:
                review_prob = 0.4
            else:
                review_prob = 0.5  # Angry customers also tend to review
            
            if random.random() < review_prob:
                review_timestamp = timestamp + timedelta(days=random.randint(2, 7))
                
                if rating >= 4:
                    sentiment = random.choices(['POSITIVE', 'NEUTRAL'], weights=[0.75, 0.25])[0]
                elif rating == 3:
                    sentiment = random.choices(['NEUTRAL', 'POSITIVE', 'NEGATIVE'], weights=[0.5, 0.25, 0.25])[0]
                else:
                    sentiment = random.choices(['NEGATIVE', 'NEUTRAL'], weights=[0.7, 0.3])[0]
                
                # Generate dynamic comment
                comment = generate_dynamic_review(sentiment)
                
                reviews.append({
                    "id": str(uuid.uuid4()),
                    "bookingId": booking_id,
                    "userId": user_id,
                    "hotelId": hotel_id,
                    "rating": rating,
                    "comment": comment,
                    "sentiment": sentiment,
                    "createdAt": review_timestamp.isoformat(),
                    "updatedAt": review_timestamp.isoformat()
                })
            else:
                # Booking completed but user didn't review (realistic)
                pass
            
            # 5% cancellation rate
            if random.random() < 0.05:
                daily_agg[date_key]["totalCancels"] += 1
                daily_agg[date_key]["totalRevenue"] -= price
        
        elif random.random() < 0.5:
            # ADD_TO_WISHLIST
            interactions.append({
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "hotelId": hotel_id,
                "sessionId": str(uuid.uuid4()),
                "type": "ADD_TO_WISHLIST",
                "rating": None,
                "timestamp": timestamp.isoformat(),
                "metadata": {}
            })
            daily_agg[date_key]["totalLikes"] += 1
        
        else:
            # CLICK_BOOK_NOW
            interactions.append({
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "hotelId": hotel_id,
                "sessionId": str(uuid.uuid4()),
                "type": "CLICK_BOOK_NOW",
                "rating": None,
                "timestamp": timestamp.isoformat(),
                "metadata": {}
            })
            daily_agg[date_key]["totalClickBook"] += 1
            
            # 25% of CLICK_BOOK_NOW users also leave a rating/review (browsing feedback)
            if random.random() < 0.25:
                click_rating = compute_rating(user_segment, hotel_segment)
                click_review_timestamp = timestamp + timedelta(days=random.randint(0, 3))
                
                if click_rating >= 4:
                    click_sentiment = random.choices(['POSITIVE', 'NEUTRAL'], weights=[0.7, 0.3])[0]
                elif click_rating == 3:
                    click_sentiment = random.choices(['NEUTRAL', 'POSITIVE', 'NEGATIVE'], weights=[0.5, 0.3, 0.2])[0]
                else:
                    click_sentiment = random.choices(['NEGATIVE', 'NEUTRAL'], weights=[0.6, 0.4])[0]
                
                click_comment = generate_dynamic_review(click_sentiment)
                
                reviews.append({
                    "id": str(uuid.uuid4()),
                    "bookingId": None,
                    "userId": user_id,
                    "hotelId": hotel_id,
                    "rating": click_rating,
                    "comment": click_comment,
                    "sentiment": click_sentiment,
                    "createdAt": click_review_timestamp.isoformat(),
                    "updatedAt": click_review_timestamp.isoformat()
                })

print(f"   ✅ Generated {len(interactions)} interactions")
print(f"   ✅ Generated {len(reviews)} reviews")

# =========================================================
# STEP 5: SAVE FILES
# =========================================================
print("\n[5/6] Saving files...")

with open(OUTPUT_INTERACTIONS_FILE, 'w', encoding='utf-8') as f:
    json.dump(interactions, f, indent=2, ensure_ascii=False)
    print(f"   ✅ {OUTPUT_INTERACTIONS_FILE}")

with open(OUTPUT_REVIEWS_FILE, 'w', encoding='utf-8') as f:
    json.dump(reviews, f, indent=2, ensure_ascii=False)
    print(f"   ✅ {OUTPUT_REVIEWS_FILE}")

# Convert daily_agg to list
daily_stats_list = []
for date_str, stats in daily_agg.items():
    daily_stats_list.append({
        "date": f"{date_str}T00:00:00.000Z",
        **stats
    })

with open(OUTPUT_DAILY_STATS_FILE, 'w', encoding='utf-8') as f:
    json.dump(daily_stats_list, f, indent=2, ensure_ascii=False)
    print(f"   ✅ {OUTPUT_DAILY_STATS_FILE}")

# =========================================================
# STEP 6: GENERATE METRICS
# =========================================================
print("\n[6/6] Generating system metrics...")

historical_metrics = []
for i in range(29, -1, -1):
    date_str = (datetime.now() - timedelta(days=i)).isoformat()
    base_rmse = 0.95 - (i * 0.005)
    base_rmse = max(0.80, base_rmse + random.uniform(-0.02, 0.02))

    metric_entry = {
        "rmse": round(base_rmse, 4),
        "precisionAt5": round(70 + random.uniform(-5, 5), 2),
        "recallAt5": round(60 + random.uniform(-5, 5), 2),
        "algorithm": "SVD",
        "datasetSize": len(interactions),
        "executionTimeMs": random.randint(100, 500),
        "createdAt": date_str,
        "tuningParams": generate_tuning_params(base_rmse) if i == 0 else None,
        "trainingHistory": None
    }
    historical_metrics.append(metric_entry)

with open(OUTPUT_METRICS_FILE, 'w', encoding='utf-8') as f:
    json.dump(historical_metrics, f, indent=2, ensure_ascii=False)
    print(f"   ✅ {OUTPUT_METRICS_FILE}")

# =========================================================
# PRINT STATISTICS
# =========================================================
print("\n[SUMMARY] Data Generation Completed ✅")
print(f"   Total interactions: {len(interactions)}")
print(f"   Total reviews: {len(reviews)}")
print(f"   Daily stats: {len(daily_stats_list)}")
print(f"   Metrics records: {len(historical_metrics)}")

# Count interaction types
interaction_types = defaultdict(int)
for inter in interactions:
    interaction_types[inter['type']] += 1

print("\n[INTERACTION TYPES]")
for itype, count in sorted(interaction_types.items()):
    pct = count / len(interactions) * 100
    print(f"   {itype}: {count} ({pct:.1f}%)")

print("\n✅ All files saved successfully!")

if __name__ == "__main__":
    os.makedirs(JSON_DIR, exist_ok=True)