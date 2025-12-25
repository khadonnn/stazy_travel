import json
import random
import unicodedata
import re
from datetime import datetime, timedelta

# --- 1. CÁC HÀM TIỆN ÍCH ---

def create_slug(text):
    """
    Chuyển đổi chuỗi có dấu thành slug chuẩn SEO.
    VD: "Đà Lạt Lodge 1" -> "da-lat-lodge-1"
    """
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text

def random_date(start_days_ago=90):
    """Random ngày trong khoảng 90 ngày gần đây"""
    start_date = datetime.now() - timedelta(days=start_days_ago)
    random_days = random.randint(0, start_days_ago)
    return (start_date + timedelta(days=random_days)).strftime("%b %d, %Y")

# --- 2. DỮ LIỆU CẤU HÌNH ---

ALL_AMENITY_IDS = [
    "wifi", "air-conditioning", "bathroom", "hot-water", "tv", "laundry",
    "luggage-storage", "housekeeping", "double-bed", "single-bed", "extra-bed",
    "balcony", "terrace", "high-floor-view", "room-service", "concierge",
    "kitchen", "fridge", "microwave", "coffee-maker", "breakfast", "kitchenware",
    "mini-bar", "on-site-restaurant", "bar", "pool", "gym", "spa", "bbq",
    "garden", "game-console", "boardgames", "sound-system", "baby-cot",
    "high-chair", "family-room", "pet-friendly", "parking", "motorbike-parking",
    "bike-rental", "motorbike-rental", "airport-shuttle", "shuttle-service",
    "mountain-view", "beach-view", "sea-view", "river-view", "lake-view",
    "city-view", "garden-view", "scenic-view", "cctv", "reception-24h",
    "fire-safety", "first-aid", "workspace", "printer", "meeting-room",
    "award-winning", "top-rated", "trending",
]

LOC_COORDS = {
    "Sapa": (22.33, 103.84), "Đà Lạt": (11.94, 108.45), "Tam Đảo": (21.45, 105.64),
    "Hà Giang": (22.82, 104.98), "Ninh Bình": (20.25, 105.97), "Hạ Long": (20.95, 107.04),
    "Nha Trang": (12.24, 109.19), "Phú Quốc": (10.22, 103.96), "Quy Nhơn": (13.78, 109.21),
    "Phú Yên": (13.08, 109.30), "Côn Đảo": (8.68, 106.60), "Mũi Né": (10.93, 108.28),
    "Vũng Tàu": (10.34, 107.08), "Hà Nội": (21.02, 105.85), "TP.HCM": (10.76, 106.66),
    "Đà Nẵng": (16.05, 108.20), "Cần Thơ": (10.03, 105.78), "Huế": (16.46, 107.59),
    "Hội An": (15.88, 108.33),
}

# Thêm tính từ để tên khách sạn phong phú hơn
ADJECTIVES = [
    "Luxury", "Cozy", "Modern", "Classic", "Hidden", "Sunny", 
    "Royal", "Grand", "Boutique", "Charming", "Peaceful", "Vintage"
]

SCENARIOS = {
    "mountain": {
        "locs": ["Sapa", "Đà Lạt", "Tam Đảo", "Hà Giang", "Ninh Bình"],
        "keywords": ["mountain", "forest", "valley", "nature"],
        "titles": ["Retreat", "Lodge", "Homestay", "Hillside Villa", "Eco Farm"],
        "must_have": ["mountain-view", "hot-water", "garden", "bbq"],
        "cat_id": 3 # Homestay/Nature
    },
    "sea": {
        "locs": ["Hạ Long", "Nha Trang", "Phú Quốc", "Quy Nhơn", "Phú Yên", "Côn Đảo", "Mũi Né", "Vũng Tàu"],
        "keywords": ["beach", "ocean", "resort", "island"],
        "titles": ["Resort & Spa", "Beach House", "Ocean View", "Seaside Hotel", "Bay Villa"],
        "must_have": ["beach-view", "sea-view", "pool", "bar"],
        "cat_id": 2 # Resort/Beach
    },
    "city": {
        "locs": ["Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Huế", "Hội An"],
        "keywords": ["city", "building", "urban", "modern"],
        "titles": ["Grand Hotel", "Urban Suite", "Central Stay", "Luxury Inn", "Apartment"],
        "must_have": ["city-view", "workspace", "reception-24h", "wifi"],
        "cat_id": 1 # Hotel/City
    },
}

# --- 3. HÀM TẠO DỮ LIỆU ---

def generate_stays(count=100):
    stays = []
    for i in range(1, count + 1):
        s_key = random.choice(list(SCENARIOS.keys()))
        config = SCENARIOS[s_key]
        
        loc = random.choice(config["locs"])
        keyword = random.choice(config["keywords"])
        
        # Tạo tên khách sạn ngẫu nhiên và hay hơn
        adjective = random.choice(ADJECTIVES)
        base_title = random.choice(config['titles'])
        # Tỷ lệ 50% là "Luxury Sapa Retreat" hoặc "Sapa Luxury Retreat"
        if random.random() > 0.5:
            full_title = f"{adjective} {loc} {base_title} {random.randint(10, 99)}"
        else:
            full_title = f"{loc} {adjective} {base_title} {random.randint(10, 99)}"

        # Tạo Slug từ Title
        slug = create_slug(full_title)

        # Tọa độ nhiễu nhẹ để không trùng nhau 1 điểm
        base_lat, base_lng = LOC_COORDS.get(loc, (10.0, 105.0))
        lat = base_lat + random.uniform(-0.03, 0.03)
        lng = base_lng + random.uniform(-0.03, 0.03)

        # Gallery 4 ảnh
        gallery = [
            f"https://loremflickr.com/800/600/vietnam,nature,{keyword}?lock={i*10 + j}"
            for j in range(4)
        ]

        # Xử lý Sale Off
        has_sale = random.random() < 0.3
        sale_percent = random.choice([5, 10, 15, 20, 25, 30]) if has_sale else 0
        sale_off_text = f"-{sale_percent}% hôm nay" if has_sale else None

        stay = {
            "id": i,
            "authorId": f"user_fake_{random.randint(1, 30)}",
            "date": random_date(), # Ngày random
            
            # --- QUAN TRỌNG: Đổi href thành slug ---
            "slug": slug,
            
            "categoryId": config["cat_id"],
            "title": full_title,
            "featuredImage": f"https://loremflickr.com/1200/800/vietnam,{keyword}?lock={i}",
            "galleryImgs": gallery,
            "amenities": list(set(config["must_have"] + random.sample(ALL_AMENITY_IDS, k=random.randint(6, 12)))),
            "description": f"Trải nghiệm đẳng cấp tại {full_title}. Tọa lạc tại khu vực {loc} thơ mộng, mang đến không gian {keyword} yên bình. Phù hợp cho cả nghỉ dưỡng và công tác.",
            "price": random.randint(10, 300) * 50000, # Giá từ 500k đến 15tr
            "address": f"Khu vực {keyword}, {loc}",
            "reviewStart": round(random.uniform(3.8, 5.0), 1),
            "reviewCount": random.randint(5, 600),
            "viewCount": random.randint(100, 5000),
            "like": random.choice([True, False]),
            "commentCount": random.randint(0, 150),
            "maxGuests": random.randint(2, 12),
            "bedrooms": random.randint(1, 6),
            "bathrooms": random.randint(1, 4),
            
            # --- Cập nhật Sale Off ---
            "saleOff": sale_off_text,
            "saleOffPercent": sale_percent,
            
            "isAds": random.random() < 0.15,
            "map": {"lat": round(lat, 6), "lng": round(lng, 6)},
        }
        stays.append(stay)
    return stays

# --- 4. CHẠY SCRIPT ---

if __name__ == "__main__":
    data = generate_stays(100)
    
    # Ghi file
    filename = "__homeStay.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    print(f"✅ Đã tạo {len(data)} khách sạn thành công vào file '{filename}'")
    print("✨ Các tính năng mới: Slug chuẩn SEO, Tên đa dạng, Ngày tháng động, SaleOffPercent.")