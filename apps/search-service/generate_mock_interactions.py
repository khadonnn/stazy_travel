import json
import random
import numpy as np
from datetime import datetime, timedelta

# 1. Khai báo danh sách ID tiện nghi (Lấy từ file amenities.ts của bạn)
# Chúng ta chỉ cần các ID để giả lập sở thích user
ALL_AMENITY_IDS = [
    "wifi",
    "air-conditioning",
    "bathroom",
    "hot-water",
    "tv",
    "fridge",
    "kitchen",
    "double-bed",
    "extra-bed",
    "family-room",
    "breakfast",
    "mountain-view",
    "beach-view",
    "sea-view",
    "river-view",
    "city-view",
    "garden-view",
    "laundry",
    "pool",
    "gym",
    "spa",
    "garden",
    "parking",
    "motorbike-parking",
    "airport-shuttle",
    "reception-24h",
    "cctv",
    "fire-safety",
    "baby-cot",
    "pet-friendly",
    "workspace",
]

# 2. Load stays (File __homeStay.json của bạn)
try:
    with open("__homeStay.json", "r", encoding="utf-8") as f:
        stays = json.load(f)
except FileNotFoundError:
    print("Lỗi: Không tìm thấy file __homeStay.json")
    exit()

# 3. Tính score giả lập cho mỗi stay
for stay in stays:
    popularity = stay.get("viewCount", 100) * 0.3 + stay.get("commentCount", 0) * 0.5
    rating = stay.get("reviewStart", 4.0)
    stay["__score"] = max(0.1, popularity * (rating / 5.0))

# 4. Tạo 80 user giả
users = []
for i in range(1, 81):
    # FIX LỖI TẠI ĐÂY: Lấy mẫu từ danh sách ALL_AMENITY_IDS chúng ta vừa định nghĩa
    preferred = random.sample(ALL_AMENITY_IDS, k=random.randint(2, 5))

    users.append(
        {
            "id": f"u{i}",
            "preferred_amenities": preferred,
            "avg_budget": random.choice([500000, 1000000, 2000000, 5000000]),
        }
    )

# 5. Sinh hành vi
interactions = []
for user in users:
    n_actions = random.randint(5, 20)
    for _ in range(n_actions):
        # Tính trọng số chọn khách sạn dựa trên sở thích
        weights = []
        for stay in stays:
            # Ở đây giả sử stay chưa có trường amenities trong JSON,
            # chúng ta tính dựa trên title hoặc mặc định
            w = stay["__score"]
            if stay.get("price", 0) <= user["avg_budget"] * 1.5:
                w *= 1.5
            weights.append(w)

        stay_choice = random.choices(stays, weights=weights, k=1)[0]

        # Quyết định hành động
        rand_val = random.random()
        if rand_val < 0.7:
            # 70% là xem -> Điểm thấp nhất (1.0)
            action, weight = "VIEW", 1.0
        elif rand_val < 0.9:
            # 20% là thích -> Điểm trung bình (3.0)
            action, weight = "LIKE", 3.0
        else:
            # 10% là đặt -> Điểm cao nhất (5.0)
            action, weight = "BOOK", 5.0
        days_ago = random.randint(0, 30)
        timestamp = datetime.now() - timedelta(days=days_ago)

        interactions.append(
            {
                "userId": user["id"],
                "stayId": stay_choice["id"],
                "action": action,
                "weight": weight,
                "timestamp": timestamp.isoformat(),
            }
        )

# 6. Lưu file
with open("mock_interactions.json", "w", encoding="utf-8") as f:
    json.dump(interactions, f, ensure_ascii=False, indent=2)

print(f"✅ Đã tạo {len(interactions)} hành vi thành công!")
