import json
import random
import unicodedata
import re
from datetime import datetime, timedelta

# ---------------------------------------------------------
# 1. CẤU HÌNH & HÀM TIỆN ÍCH
# ---------------------------------------------------------

def create_slug(text):
    text = text.replace('Đ', 'd').replace('đ', 'd')
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text

def random_date(start_days_ago=90):
    start_date = datetime.now() - timedelta(days=start_days_ago)
    random_days = random.randint(0, start_days_ago)
    return (start_date + timedelta(days=random_days)).strftime("%b %d, %Y")

# --- LOAD ẢNH THẬT TỪ FILE CỦA BƯỚC 1 ---
try:
    with open("real_images_map.json", "r", encoding="utf-8") as f:
        REAL_IMAGES_MAP = json.load(f)
    print("✅ Đã load danh sách ảnh thật.")
except FileNotFoundError:
    print("❌ LỖI: Chưa có file 'real_images_map.json'. Hãy chạy get_images.py trước!")
    REAL_IMAGES_MAP = {}

# MAPPING CẤU HÌNH
FILE_NAME_MAP = {
    "Sapa": "sapa", "Đà Lạt": "da-lat", "Tam Đảo": "tam-dao",
    "Hà Giang": "ha-giang", "Ninh Bình": "ninh-binh", "Hạ Long": "ha-long",
    "Nha Trang": "nha-trang", "Phú Quốc": "phu-quoc", "Quy Nhơn": "quy-nhon",
    "Phú Yên": "phu-yen", "Côn Đảo": "con-dao", "Mũi Né": "mui-ne",
    "Vũng Tàu": "vung-tau", "Hà Nội": "ha-noi", "TP.HCM": "hcm",
    "Đà Nẵng": "da-nang", "Cần Thơ": "can-tho", "Huế": "hue", "Hội An": "hoi-an"
}

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

SCENARIOS = {
    "mountain": {
        "locs": ["Sapa", "Đà Lạt", "Tam Đảo", "Hà Giang", "Ninh Bình"],
        "keywords": ["mountain", "forest", "valley", "nature", "landscape"],
        "titles": ["Retreat", "Lodge", "Homestay", "Hillside Villa", "Eco Farm"],
        "cat_id": 3
    },
    "sea": {
        "locs": ["Hạ Long", "Nha Trang", "Phú Quốc", "Quy Nhơn", "Phú Yên", "Côn Đảo", "Mũi Né", "Vũng Tàu"],
        "keywords": ["beach", "ocean", "sea", "island", "coast", "resort"],
        "titles": ["Resort & Spa", "Beach House", "Ocean View", "Seaside Hotel", "Bay Villa"],
        "cat_id": 2
    },
    "city": {
        "locs": ["Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Huế", "Hội An"],
        "keywords": ["city", "building", "urban", "modern", "architecture", "skyscraper"],
        "titles": ["Grand Hotel", "Urban Suite", "Central Stay", "Luxury Inn", "Apartment"],
        "cat_id": 1
    },
}

ADJECTIVES = ["Luxury", "Cozy", "Modern", "Classic", "Hidden", "Sunny", "Royal", "Grand", "Boutique", "Charming", "Peaceful", "Vintage"]

# ---------------------------------------------------------
# 2. HÀM TẠO DỮ LIỆU CHÍNH
# ---------------------------------------------------------
def generate_stays(count=100):
    stays = []
    
    # Lấy danh sách ảnh dự phòng (nếu không tìm thấy ảnh của tỉnh đó)
    # Lấy đại danh sách đầu tiên tìm được trong map
    fallback_images = []
    if REAL_IMAGES_MAP:
        fallback_images = list(REAL_IMAGES_MAP.values())[0]

    for i in range(1, count + 1):
        s_key = random.choice(list(SCENARIOS.keys()))
        config = SCENARIOS[s_key]
        loc = random.choice(config["locs"])
        
        full_title = f"{random.choice(ADJECTIVES)} {loc} {random.choice(config['titles'])} {random.randint(10, 99)}"
        slug = create_slug(full_title)

        base_lat, base_lng = LOC_COORDS.get(loc, (10.0, 105.0))
        lat = base_lat + random.uniform(-0.03, 0.03)
        lng = base_lng + random.uniform(-0.03, 0.03)

        # --- LOGIC CHỌN ẢNH THÔNG MINH ---
        file_prefix = FILE_NAME_MAP.get(loc, "sapa") 
        
        # Lấy ảnh của đúng tỉnh đó
        available_images = REAL_IMAGES_MAP.get(file_prefix)
        
        if available_images and len(available_images) > 0:
            featured_img_url = random.choice(available_images)
        else:
            # Nếu tỉnh này chưa có ảnh trên Cloudinary, lấy tạm ảnh dự phòng
            if fallback_images:
                featured_img_url = random.choice(fallback_images)
            else:
                # Nếu không có ảnh nào cả -> Placeholder
                featured_img_url = "https://placehold.co/600x400?text=No+Image"

        selected_amenities = random.sample(ALL_AMENITY_IDS, k=random.randint(8, 15))
        has_sale = random.random() < 0.3
        sale_percent = random.choice([5, 10, 15, 20, 25, 30]) if has_sale else 0
        sale_off_text = f"-{sale_percent}% hôm nay" if has_sale else None
        
        stay = {
            "id": i,
            "authorId": f"user_fake_{random.randint(1, 30)}", 
            "date": random_date(),
            "slug": slug,
            "categoryId": config["cat_id"],
            "title": full_title,
            "featuredImage": featured_img_url, 
            # Gallery giả lập (lấy cùng ảnh thumbnail cho đẹp hoặc loremflickr)
            "galleryImgs": [
                featured_img_url,
                "https://loremflickr.com/800/600/interior?lock=" + str(i*10+1),
                "https://loremflickr.com/800/600/interior?lock=" + str(i*10+2),
                "https://loremflickr.com/800/600/interior?lock=" + str(i*10+3)
            ],
            "amenities": selected_amenities, 
            "description": f"Trải nghiệm đẳng cấp tại {full_title}. Tọa lạc tại khu vực {loc} thơ mộng.",
            "price": random.randint(10, 300) * 50000, 
            "address": f"Đường trung tâm, {loc}",
            "reviewStart": round(random.uniform(3.8, 5.0), 1),
            "reviewCount": random.randint(5, 600),
            "viewCount": random.randint(100, 5000),
            "like": random.choice([True, False]),
            "commentCount": random.randint(0, 150),
            "maxGuests": random.randint(2, 12),
            "bedrooms": random.randint(1, 6),
            "bathrooms": random.randint(1, 4),
            "saleOff": sale_off_text,
            "saleOffPercent": sale_percent,
            "isAds": random.random() < 0.15,
            "map": {"lat": round(lat, 6), "lng": round(lng, 6)},
        }
        stays.append(stay)
    return stays

if __name__ == "__main__":
    data = generate_stays(100)
    with open("jsons/__homeStay.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f"✅ Đã tạo {len(data)} items thành công vào 'jsons/__homeStay.json'!")