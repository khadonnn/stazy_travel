import json
import os
import random
import unicodedata
import re
from datetime import datetime, timedelta

# ---------------------------------------------------------
# 1. CẤU HÌNH CƠ BẢN
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

# --- LOAD ẢNH THẬT ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REAL_IMAGES_PATH = os.path.join(BASE_DIR, "real_images_map.json")

try:
    with open(REAL_IMAGES_PATH, "r", encoding="utf-8") as f:
        REAL_IMAGES_MAP = json.load(f)
    print(f"✅ Đã load danh sách ảnh thật.")
except FileNotFoundError:
    print("⚠️ Dùng chế độ Fallback (không có ảnh thật).")
    REAL_IMAGES_MAP = {}

# --- CẤU HÌNH DANH MỤC (KHỚP VỚI FILE __category.json CỦA BẠN) ---
# ID tương ứng với thứ tự trong mảng categories của bạn (1-based index)
CATEGORY_CONFIG = {
    1: {"name": "Khách sạn", "slug": "khach-san", "titles": ["Hotel", "Grand Hotel", "Plaza", "Suite"]},
    2: {"name": "Homestay", "slug": "homestay", "titles": ["Homestay", "Nhà Dân", "House", "Little Home"]},
    3: {"name": "Resort", "slug": "resort", "titles": ["Resort", "Resort & Spa", "Sanctuary", "Retreat"]},
    4: {"name": "Biệt thự", "slug": "biet-thu", "titles": ["Villa", "Mansion", "Private Villa", "Luxury Villa"]},
    5: {"name": "Căn hộ", "slug": "can-ho", "titles": ["Apartment", "Condo", "Studio", "Serviced Apt"]},
    6: {"name": "Nhà gỗ", "slug": "nha-go", "titles": ["Wooden Cabin", "Bungalow", "Lodge", "Forest Cabin"]},
    7: {"name": "Khác", "slug": "khac", "titles": ["Camping", "Glamping", "Farmstay", "Dorm"]}
}

# --- CẤU HÌNH VÙNG MIỀN & LOGIC CHỌN CATEGORY ---
# Mỗi vùng miền sẽ chỉ random ra các loại hình lưu trú phù hợp
SCENARIOS = {
    "mountain": {
        "locs": ["Sapa", "Đà Lạt", "Tam Đảo", "Hà Giang", "Ninh Bình"],
        "valid_cats": [2, 3, 4, 6, 7], # Núi thường có Homestay, Resort, Biệt thự, Nhà gỗ, Khác
        "file_prefix_map": {"Sapa": "sapa", "Đà Lạt": "da-lat", "Tam Đảo": "tam-dao", "Hà Giang": "ha-giang", "Ninh Bình": "ninh-binh"}
    },
    "sea": {
        "locs": ["Hạ Long", "Nha Trang", "Phú Quốc", "Quy Nhơn", "Phú Yên", "Côn Đảo", "Mũi Né", "Vũng Tàu"],
        "valid_cats": [1, 3, 4, 2], # Biển thường có Khách sạn, Resort, Biệt thự, Homestay
        "file_prefix_map": {"Hạ Long": "ha-long", "Nha Trang": "nha-trang", "Phú Quốc": "phu-quoc", "Quy Nhơn": "quy-nhon", "Côn Đảo": "con-dao", "Mũi Né": "mui-ne", "Vũng Tàu": "vung-tau"}
    },
    "city": {
        "locs": ["Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Huế", "Hội An"],
        "valid_cats": [1, 5, 2, 4], # Phố thường có Khách sạn, Căn hộ, Homestay, Biệt thự
        "file_prefix_map": {"Hà Nội": "ha-noi", "TP.HCM": "hcm", "Đà Nẵng": "da-nang", "Cần Thơ": "can-tho", "Huế": "hue", "Hội An": "hoi-an"}
    }
}

LOC_COORDS = {
    "Sapa": (22.33, 103.84), "Đà Lạt": (11.94, 108.45), "Tam Đảo": (21.45, 105.64),
    "Hà Giang": (22.82, 104.98), "Ninh Bình": (20.25, 105.97), "Hạ Long": (20.95, 107.04),
    "Nha Trang": (12.24, 109.19), "Phú Quốc": (10.22, 103.96), "Quy Nhơn": (13.78, 109.21),
    "Phú Yên": (13.08, 109.30), "Côn Đảo": (8.68, 106.60), "Mũi Né": (10.93, 108.28),
    "Vũng Tàu": (10.34, 107.08), "Hà Nội": (21.02, 105.85), "TP.HCM": (10.76, 106.66),
    "Đà Nẵng": (16.05, 108.20), "Cần Thơ": (10.03, 105.78), "Huế": (16.46, 107.59),
    "Hội An": (15.88, 108.33),
}

ALL_AMENITIES = [
    "wifi", "ac", "pool", "parking", "gym", "spa", "restaurant", "bar", 
    "sea-view", "mountain-view", "city-view", "kitchen", "tv", "bathtub",
    "balcony", "breakfast", "pets-allowed", "elevator"
]

ADJECTIVES = ["Luxury", "Cozy", "Modern", "Classic", "Hidden", "Sunny", "Royal", "Grand", "Boutique", "Charming", "Peaceful", "Vintage"]

# ---------------------------------------------------------
# 2. HÀM TẠO DỮ LIỆU
# ---------------------------------------------------------
def generate_stays(count=100):
    stays = []
    
    # Fallback images
    fallback_images = []
    if REAL_IMAGES_MAP:
        first_key = next(iter(REAL_IMAGES_MAP))
        fallback_images = REAL_IMAGES_MAP[first_key]

    for i in range(1, count + 1):
        # 1. Chọn vùng miền (Scenario)
        scenario_key = random.choice(list(SCENARIOS.keys()))
        scenario = SCENARIOS[scenario_key]
        
        # 2. Chọn địa điểm cụ thể
        loc = random.choice(scenario["locs"])
        
        # 3. Chọn Category ID phù hợp với vùng miền đó
        cat_id = random.choice(scenario["valid_cats"])
        cat_info = CATEGORY_CONFIG[cat_id]
        
        # 4. Tạo tên khách sạn dựa trên Category
        # VD: Luxury Sapa Wooden Cabin 99
        title_suffix = random.choice(cat_info["titles"])
        full_title = f"{random.choice(ADJECTIVES)} {loc} {title_suffix} {random.randint(10, 99)}"
        slug = create_slug(full_title)

        # 5. Tọa độ (làm lệch đi chút xíu để không trùng nhau)
        base_lat, base_lng = LOC_COORDS.get(loc, (10.0, 105.0))
        lat = base_lat + random.uniform(-0.02, 0.02)
        lng = base_lng + random.uniform(-0.02, 0.02)

        # 6. Chọn ảnh
        file_prefix = scenario.get("file_prefix_map", {}).get(loc, "sapa")
        available_images = REAL_IMAGES_MAP.get(file_prefix)
        
        if available_images and len(available_images) > 0:
            featured_img_url = random.choice(available_images)
        else:
            featured_img_url = random.choice(fallback_images) if fallback_images else "https://placehold.co/600x400?text=Hotel"

        # 7. Amenities
        selected_amenities = random.sample(ALL_AMENITIES, k=random.randint(5, 12))
        
        # Thêm logic Amenities đặc thù
        if cat_id == 3: # Resort thường có pool, spa
            selected_amenities.extend(["pool", "spa"])
        if scenario_key == "sea": 
            selected_amenities.append("sea-view")
        elif scenario_key == "mountain":
            selected_amenities.append("mountain-view")

        # Khử trùng lặp amenities
        selected_amenities = list(set(selected_amenities))

        # 8. Giá & Sale
        base_price = random.randint(5, 100) * 100000 # 500k -> 10tr
        if cat_id == 4 or cat_id == 3: # Villa/Resort đắt hơn
            base_price *= 2
        
        has_sale = random.random() < 0.3
        sale_percent = random.choice([10, 20, 30, 50]) if has_sale else 0
        sale_text = f"-{sale_percent}% Summer Deal" if has_sale else None

        stay = {
            "id": i,
            "authorId": f"user_fake_{random.randint(1, 10)}", 
            "date": random_date(),
            "slug": slug,
            
            # --- QUAN TRỌNG: Mapping Category ---
            "categoryId": cat_id,     # Số (1-7)
            "category": cat_info["name"], # Tên ("Khách sạn", "Nhà gỗ"...)
            
            "title": full_title,
            "featuredImage": featured_img_url, 
            "galleryImgs": [
                featured_img_url,
                f"https://loremflickr.com/800/600/room?lock={i}a",
                f"https://loremflickr.com/800/600/view?lock={i}b",
                f"https://loremflickr.com/800/600/interior?lock={i}c"
            ],
            "amenities": selected_amenities, 
            "description": f"{cat_info['name']} đẳng cấp tại {loc}. {random.choice(['Phù hợp cho gia đình.', 'Không gian lãng mạn.', 'Gần trung tâm.', 'View cực chill.'])}",
            "price": base_price, 
            "address": f"{random.randint(1,999)} Đường Chính, {loc}",
            "reviewStart": round(random.uniform(4.0, 5.0), 1),
            "reviewCount": random.randint(10, 500),
            "viewCount": random.randint(100, 2000),
            "like": random.choice([True, False]),
            "commentCount": random.randint(0, 50),
            "maxGuests": random.randint(2, 10),
            "bedrooms": random.randint(1, 5),
            "bathrooms": random.randint(1, 5),
            "saleOff": sale_text,
            "saleOffPercent": sale_percent,
            "isAds": random.random() < 0.1,
            "map": {"lat": round(lat, 6), "lng": round(lng, 6)},
        }
        stays.append(stay)
    
    return stays

if __name__ == "__main__":
    JSON_DIR = os.path.join(BASE_DIR, "jsons")
    os.makedirs(JSON_DIR, exist_ok=True)

    data = generate_stays(100) # Tạo 100 khách sạn
    
    output_path = os.path.join(JSON_DIR, "__homeStay.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Đã tạo {len(data)} items với category chuẩn tại: {output_path}")