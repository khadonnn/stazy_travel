import json
import random

# 1. Danh sách Amenity ID chuẩn
ALL_AMENITY_IDS = [
    "wifi",
    "air-conditioning",
    "bathroom",
    "hot-water",
    "tv",
    "laundry",
    "luggage-storage",
    "housekeeping",
    "double-bed",
    "single-bed",
    "extra-bed",
    "balcony",
    "terrace",
    "high-floor-view",
    "room-service",
    "concierge",
    "kitchen",
    "fridge",
    "microwave",
    "coffee-maker",
    "breakfast",
    "kitchenware",
    "mini-bar",
    "on-site-restaurant",
    "bar",
    "pool",
    "gym",
    "spa",
    "bbq",
    "garden",
    "game-console",
    "boardgames",
    "sound-system",
    "baby-cot",
    "high-chair",
    "family-room",
    "pet-friendly",
    "parking",
    "motorbike-parking",
    "bike-rental",
    "motorbike-rental",
    "airport-shuttle",
    "shuttle-service",
    "mountain-view",
    "beach-view",
    "sea-view",
    "river-view",
    "lake-view",
    "city-view",
    "garden-view",
    "scenic-view",
    "cctv",
    "reception-24h",
    "fire-safety",
    "first-aid",
    "workspace",
    "printer",
    "meeting-room",
    "award-winning",
    "top-rated",
    "trending",
]

LOC_COORDS = {
    "Sapa": (22.33, 103.84),
    "Đà Lạt": (11.94, 108.45),
    "Tam Đảo": (21.45, 105.64),
    "Hà Giang": (22.82, 104.98),
    "Ninh Bình": (20.25, 105.97),
    "Hạ Long": (20.95, 107.04),
    "Nha Trang": (12.24, 109.19),
    "Phú Quốc": (10.22, 103.96),
    "Quy Nhơn": (13.78, 109.21),
    "Phú Yên": (13.08, 109.30),
    "Côn Đảo": (8.68, 106.60),
    "Mũi Né": (10.93, 108.28),
    "Vũng Tàu": (10.34, 107.08),
    "Hà Nội": (21.02, 105.85),
    "TP.HCM": (10.76, 106.66),
    "Đà Nẵng": (16.05, 108.20),
    "Cần Thơ": (10.03, 105.78),
    "Huế": (16.46, 107.59),
    "Hội An": (15.88, 108.33),
}

SCENARIOS = {
    "mountain": {
        "locs": ["Sapa", "Đà Lạt", "Tam Đảo", "Hà Giang", "Ninh Bình"],
        "keywords": ["mountain", "forest", "valley", "nature"],
        "titles": ["Retreat", "Lodge", "Homestay", "Hillside Villa"],
        "must_have": ["mountain-view", "hot-water", "garden"],
    },
    "sea": {
        "locs": [
            "Hạ Long",
            "Nha Trang",
            "Phú Quốc",
            "Quy Nhơn",
            "Phú Yên",
            "Côn Đảo",
            "Mũi Né",
            "Vũng Tàu",
        ],
        "keywords": ["beach", "ocean", "resort", "island"],
        "titles": ["Resort & Spa", "Beach House", "Ocean View", "Seaside Hotel"],
        "must_have": ["beach-view", "sea-view", "pool"],
    },
    "city": {
        "locs": ["Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Huế", "Hội An"],
        "keywords": ["city", "building", "urban", "modern"],
        "titles": ["Grand Hotel", "Urban Suite", "Central Stay", "Luxury Inn"],
        "must_have": ["city-view", "workspace", "reception-24h"],
    },
}


def generate_stays(count=100):
    stays = []
    for i in range(1, count + 1):
        s_key = random.choice(list(SCENARIOS.keys()))
        config = SCENARIOS[s_key]
        loc = random.choice(config["locs"])
        keyword = random.choice(config["keywords"])

        base_lat, base_lng = LOC_COORDS.get(loc, (10.0, 105.0))
        lat = base_lat + random.uniform(-0.02, 0.02)
        lng = base_lng + random.uniform(-0.02, 0.02)

        # 4 ảnh gallery khác nhau hoàn toàn cho mỗi khách sạn
        # Sử dụng vietnam,nature để lọc ảnh cảnh vật không có người
        gallery = [
            f"https://loremflickr.com/800/600/vietnam,nature,landscape?lock={i*10 + j}"
            for j in range(4)
        ]

        stay = {
            "id": i,
            "authorId": f"user_fake_{random.randint(1, 30)}",
            "date": "Dec 19, 2024",
            "href": f"/hotels/{i}",
            "listingCategoryId": 1 if s_key == "city" else (2 if s_key == "sea" else 3),
            "title": f"{loc} {random.choice(config['titles'])} {i}",
            "featuredImage": f"https://loremflickr.com/1200/800/vietnam,{keyword}?lock={i}",
            "galleryImgs": gallery,  # Đã cập nhật thành 4 ảnh độc nhất
            "amenities": list(
                set(
                    config["must_have"]
                    + random.sample(ALL_AMENITY_IDS, k=random.randint(5, 10))
                )
            ),
            "description": f"Khám phá vẻ đẹp thiên nhiên tại {loc}. Không gian nghỉ dưỡng mang phong cách {keyword}, cam kết không gian yên tĩnh, cảnh đẹp đặc trưng của Việt Nam.",
            "price": random.randint(15, 200) * 50000,
            "address": f"Khu vực {keyword}, {loc}",
            "reviewStart": round(random.uniform(4.0, 5.0), 1),
            "reviewCount": random.randint(10, 500),
            "viewCount": random.randint(100, 2000),
            "like": random.choice([True, False]),
            "commentCount": random.randint(5, 100),
            "maxGuests": random.randint(2, 10),
            "bedrooms": random.randint(1, 5),
            "bathrooms": random.randint(1, 3),
            "saleOff": (
                f"-{random.choice([5, 10, 15])}% hôm nay"
                if random.random() < 0.3
                else None
            ),
            "isAds": random.random() < 0.1,
            "map": {"lat": round(lat, 6), "lng": round(lng, 6)},
        }
        stays.append(stay)
    return stays


data = generate_stays(100)
with open("__homeStay.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print(
    "✅ Đã cập nhật 100 khách sạn: 4 ảnh Gallery độc nhất, chủ đề phong cảnh Việt Nam!"
)
