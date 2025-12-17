# generate_mock_interactions.py
import json
import random
import numpy as np
from datetime import datetime, timedelta

# 1. Load stays (giả sử bạn có file stays.json)
with open("stays.json", "r", encoding="utf-8") as f:
    stays = json.load(f)

# 2. Chuẩn bị: tính "score" cho mỗi stay — dùng để sampling
for stay in stays:
    # Đơn giản: kết hợp popularity + rating
    popularity = (
        stay.get("viewCount", 100) * 0.3
        + stay.get("likeCount", 0) * 1.0
        + stay.get("bookingCount", 0) * 2.0
    )
    rating = stay.get("reviewStart", 5.0)
    stay["__score"] = max(0.1, popularity * (rating / 10.0))  # tránh 0

stay_ids = [s["id"] for s in stays]
stay_scores = [s["__score"] for s in stays]
stay_amenities = {s["id"]: set(s.get("amenities", [])) for s in stays}

# 3. Tạo 80 user giả (phù hợp prototype)
users = []
for i in range(1, 81):
    # Mỗi user có "sở thích": chọn ngẫu nhiên 2–4 tiện nghi yêu thích
    all_amenities = list(set(a for s in stays for a in s.get("amenities", [])))
    preferred = random.sample(all_amenities, k=random.randint(2, 4))

    users.append(
        {
            "id": f"u{i}",
            "preferred_amenities": preferred,
            "avg_budget": random.choice(
                [500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000]
            ),
        }
    )

# 4. Sinh hành vi
interactions = []

for user in users:
    n_actions = random.randint(5, 30)  # mỗi user 5–30 hành vi

    for _ in range(n_actions):
        # Chọn stay: ưu tiên stay có amenities phù hợp + điểm cao
        weights = []
        for stay in stays:
            # Bonus nếu có tiện nghi user thích
            match_bonus = len(
                set(stay.get("amenities", [])) & set(user["preferred_amenities"])
            )
            price_ok = 0.5 if stay.get("price", 0) <= user["avg_budget"] * 1.5 else 0.1
            w = stay["__score"] * (1 + match_bonus * 0.3) * price_ok
            weights.append(w)

        # Sampling có trọng số
        stay = random.choices(stays, weights=weights, k=1)[0]

        # Quyết định hành vi: view → (có thể) like → (có thể) book
        action = "view"
        weight = 0.2

        if random.random() < 0.4:  # 40% view → like
            action = "like"
            weight = 0.8
            if random.random() < 0.2:  # 20% like → book
                action = "book"
                weight = 1.0

        # Thời gian ngẫu nhiên trong 30 ngày qua
        days_ago = random.randint(0, 30)
        time = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23))

        interactions.append(
            {
                "userId": user["id"],
                "stayId": stay["id"],
                "action": action,
                "weight": weight,
                "timestamp": time.isoformat(),
            }
        )

# 5. Lưu
with open("mock_interactions.json", "w", encoding="utf-8") as f:
    json.dump(interactions, f, ensure_ascii=False, indent=2)

print(f"✅ Đã tạo {len(interactions)} hành vi cho {len(users)} user.")
