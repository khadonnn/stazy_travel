import json
import os
import random
import unicodedata
import re
from datetime import datetime, timedelta

# ---------------------------------------------------------
# 1. CẤU HÌNH & TỪ ĐIỂN DỮ LIỆU
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
    return (start_date + timedelta(days=random_days)).strftime("%Y-%m-%dT%H:%M:%S.000Z") # Format ISO 8601 cho DB

# --- LOAD ẢNH TỪ CLOUDINARY (featuredImage & galleryImgs) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSONS_DIR = os.path.join(BASE_DIR, "update_image_cloudinary", "jsons")
FEATURED_IMAGE_JSON = os.path.join(JSONS_DIR, "featuredImage.json")
GALLERY_IMGS_JSON = os.path.join(JSONS_DIR, "galleryImgs.json")

try:
    with open(FEATURED_IMAGE_JSON, "r", encoding="utf-8") as f:
        FEATURED_IMAGE_MAP = json.load(f)
    print(f"✅ Đã load featuredImage từ {FEATURED_IMAGE_JSON}")
except FileNotFoundError:
    print("⚠️ Không tìm thấy featuredImage.json, dùng fallback.")
    FEATURED_IMAGE_MAP = {}

try:
    with open(GALLERY_IMGS_JSON, "r", encoding="utf-8") as f:
        GALLERY_IMGS_MAP = json.load(f)
    print(f"✅ Đã load galleryImgs từ {GALLERY_IMGS_JSON}")
except FileNotFoundError:
    print("⚠️ Không tìm thấy galleryImgs.json, dùng fallback.")
    GALLERY_IMGS_MAP = {}

# Map location_key -> tên hiển thị tiếng Việt (để tra cứu LOC_COORDS, LANDMARKS, SCENARIOS)
LOCATION_KEY_TO_DISPLAY = {
    "sapa": "Sapa", "da-lat": "Đà Lạt", "tam-dao": "Tam Đảo",
    "ha-giang": "Hà Giang", "ninh-binh": "Ninh Bình", "ha-long": "Hạ Long",
    "nha-trang": "Nha Trang", "phu-quoc": "Phú Quốc", "quy-nhon": "Quy Nhơn",
    "phu-yen": "Phú Yên", "con-dao": "Côn Đảo", "mui-ne": "Mũi Né",
    "vung-tau": "Vũng Tàu", "ha-noi": "Hà Nội", "hcm": "TP.HCM",
    "da-nang": "Đà Nẵng", "can-tho": "Cần Thơ", "hue": "Huế", "hoi-an": "Hội An",
}

# --- CẤU HÌNH CATEGORY ---
CATEGORY_CONFIG = {
    1: {"name": "Khách sạn", "slug": "khach-san", "titles": ["Hotel", "Grand Hotel", "Plaza", "Suite"]},
    2: {"name": "Homestay", "slug": "homestay", "titles": ["Homestay", "Nhà Dân", "House", "Little Home"]},
    3: {"name": "Resort", "slug": "resort", "titles": ["Resort", "Resort & Spa", "Sanctuary", "Retreat"]},
    4: {"name": "Biệt thự", "slug": "biet-thu", "titles": ["Villa", "Mansion", "Private Villa", "Luxury Villa"]},
    5: {"name": "Căn hộ", "slug": "can-ho", "titles": ["Apartment", "Condo", "Studio", "Serviced Apt"]},
    6: {"name": "Nhà gỗ", "slug": "nha-go", "titles": ["Wooden Cabin", "Bungalow", "Lodge", "Forest Cabin"]},
    7: {"name": "Khác", "slug": "khac", "titles": ["Camping", "Glamping", "Farmstay", "Dorm"]}
}

# --- CẤU HÌNH DATA MỚI CHO SCHEMA ---
TRIP_TYPES = ["BUSINESS", "FAMILY", "COUPLE", "SOLO", "GROUP"] # Enum trong Schema
TAGS_POOL = ["romantic", "luxury", "budget", "sustainable", "pet-friendly", "instagrammable", "peaceful", "party", "historic"]
ACCESSIBILITY_POOL = ["wheelchair", "elevator", "ground_floor", "braille_signage"]

POLICIES_TEXTS = [
    "Hủy miễn phí trước 24h. Nhận phòng từ 14:00. Trả phòng trước 12:00.",
    "Không hoàn tiền nếu hủy. Yêu cầu đặt cọc 50%.",
    "Cho phép mang thú cưng (có phụ phí). Hủy linh hoạt trong vòng 3 ngày.",
    "Check-in tự động. Không hút thuốc. Giữ yên lặng sau 22:00."
]

# Map địa điểm với Landmark để gợi ý thông minh
LANDMARKS_MAP = {
    "Sapa": ["Núi Fansipan", "Bản Cát Cát", "Nhà thờ đá"],
    "Đà Lạt": ["Hồ Xuân Hương", "Chợ Đêm", "Langbiang"],
    "Nha Trang": ["Vinpearl Land", "Tháp Bà Ponagar", "Hòn Chồng"],
    "Đà Nẵng": ["Cầu Rồng", "Bà Nà Hills", "Biển Mỹ Khê"],
    "Hội An": ["Phố Cổ", "Chùa Cầu", "Biển An Bàng"],
    "Hà Nội": ["Hồ Gươm", "Lăng Bác", "Phố Cổ"],
    "TP.HCM": ["Chợ Bến Thành", "Phố đi bộ Nguyễn Huệ", "Landmark 81"],
    "Phú Quốc": ["VinWonders", "Bãi Sao", "Grand World"],
    "Hạ Long": ["Vịnh Hạ Long", "Sun World", "Bảo tàng Quảng Ninh"],
}

SCENARIOS = {
    "mountain": {
        "locs": ["Sapa", "Đà Lạt", "Tam Đảo", "Hà Giang", "Ninh Bình"],
        "valid_cats": [2, 3, 4, 6, 7],
        "file_prefix_map": {"Sapa": "sapa", "Đà Lạt": "da-lat", "Tam Đảo": "tam-dao", "Hà Giang": "ha-giang", "Ninh Bình": "ninh-binh"}
    },
    "sea": {
        "locs": ["Hạ Long", "Nha Trang", "Phú Quốc", "Quy Nhơn", "Phú Yên", "Côn Đảo", "Mũi Né", "Vũng Tàu"],
        "valid_cats": [1, 3, 4, 2],
        "file_prefix_map": {"Hạ Long": "ha-long", "Nha Trang": "nha-trang", "Phú Quốc": "phu-quoc", "Quy Nhơn": "quy-nhon", "Côn Đảo": "con-dao", "Mũi Né": "mui-ne", "Vũng Tàu": "vung-tau"}
    },
    "city": {
        "locs": ["Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Huế", "Hội An"],
        "valid_cats": [1, 5, 2, 4],
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
    # Cơ bản
    "wifi", "ac", "parking", "elevator", "tv", "kitchen", "balcony", "bathtub", "hot_water_24h", "workspace", "laundry","rice_cooker","refrigerator","free_motorbike_rental", "quiet_after_22h"
    
    # Sức khỏe & Giải trí
    "pool", "gym", "spa", "sauna", "massage", "yoga",
    
    # Ăn uống
    "restaurant", "bar", "breakfast", "room_service", "bbq_area",
    
    # View & Vị trí
    "sea_view", "mountain_view", "city_view", "garden_view",
    "beachfront", "beach_access", "beach_walkable", "private_beach", "ocean_view",
    
    # Gia đình
    "kids_club", "playground", "baby_crib", "high_chair", "family_room",
    
    # Thiên nhiên / Trải nghiệm
    "garden", "terrace", "outdoor_shower", "fireplace", "hammock", "stargazing_deck",
    
    # Vật nuôi
    "pets_allowed", "pet_bed", "pet_food", "dog_run_area",
    
    # An toàn & Tiếp cận
    "wheelchair_accessible", "24h_reception", "security_guard", "first_aid_kit", "smoke_detector",
    
    # Bền vững
    "solar_power", "rainwater_harvesting", "plastic_free", "local_sourcing",
    
    # Sự kiện
    "event_space", "karaoke_room", "wedding_ready",
]

ADJECTIVES = ["Luxury", "Cozy", "Modern", "Classic", "Hidden", "Sunny", "Royal", "Grand", "Boutique", "Charming", "Peaceful", "Vintage"]

# Map ngược: tên hiển thị -> scenario_key (khởi tạo sau khi SCENARIOS được định nghĩa)
DISPLAY_TO_SCENARIO = {}
for _sk, _sv in SCENARIOS.items():
    for _ld in _sv["locs"]:
        DISPLAY_TO_SCENARIO[_ld] = _sk


# ---------------------------------------------------------
# 2. HÀM TẠO DỮ LIỆU
# ---------------------------------------------------------
def generate_stays():
    """
    Duyệt toàn bộ URL trong featuredImage.json.
    Mỗi URL = 1 khách sạn thuộc đúng địa điểm đó.
    Tổng số stay = tổng số URL trong featuredImage.json (~255).
    """
    stays = []
    stay_id = 0

    # Duyệt qua từng location_key và danh sách featured URL
    for location_key, featured_urls in FEATURED_IMAGE_MAP.items():
        # Map location_key -> tên hiển thị tiếng Việt
        loc_display = LOCATION_KEY_TO_DISPLAY.get(location_key, location_key)

        # Xác định scenario_key từ tên hiển thị
        scenario_key = DISPLAY_TO_SCENARIO.get(loc_display)
        if not scenario_key:
            # Fallback: nếu không tìm thấy scenario, bỏ qua location này
            print(f"⚠️ Không tìm thấy scenario cho '{loc_display}' ({location_key}), bỏ qua.")
            continue

        scenario = SCENARIOS[scenario_key]
        valid_cats = scenario["valid_cats"]

        # Danhảng gallery cho location_key này
        gallery_pool = GALLERY_IMGS_MAP.get(location_key, [])

        for featured_img_url in featured_urls:
            stay_id += 1

            # 1. Category ngẫu nhiên (theo scenario)
            cat_id = random.choice(valid_cats)
            cat_info = CATEGORY_CONFIG[cat_id]

            # 2. Tên & Slug
            title_suffix = random.choice(cat_info["titles"])
            adj = random.choice(ADJECTIVES)
            full_title = f"{adj} {loc_display} {title_suffix} {random.randint(10, 99)}"
            slug = create_slug(full_title)

            # 3. Tọa độ
            base_lat, base_lng = LOC_COORDS.get(loc_display, (10.0, 105.0))
            lat = base_lat + random.uniform(-0.02, 0.02)
            lng = base_lng + random.uniform(-0.02, 0.02)

            # 4. Gallery: featured + 4 ảnh từ galleryImgs (cho phép trùng)
            if gallery_pool:
                gallery_imgs = random.choices(gallery_pool, k=4)
            else:
                gallery_imgs = []
            gallery = [featured_img_url] + gallery_imgs

            # Lấp đầy nếu gallery không đủ 5 ảnh
            while len(gallery) < 5:
                keyword = f"{location_key},hotel"
                placeholder_url = f"https://loremflickr.com/800/600/{keyword}?lock={stay_id}{len(gallery)}"
                gallery.append(placeholder_url)

            # 5. Amenities & Tags
            selected_amenities = random.sample(ALL_AMENITIES, k=random.randint(5, 12))
            if cat_id == 3:
                selected_amenities.extend(["pool", "spa"])
            if scenario_key == "sea":
                selected_amenities.append("sea_view")
            elif scenario_key == "mountain":
                selected_amenities.append("mountain_view")
            selected_amenities = list(set(selected_amenities))

            # 6. New Fields Generation
            suitable_for = random.sample(TRIP_TYPES, k=random.randint(1, 3))
            tags = random.sample(TAGS_POOL, k=random.randint(2, 5))
            accessibility = random.sample(ACCESSIBILITY_POOL, k=random.randint(0, 2))
            landmarks_for_loc = LANDMARKS_MAP.get(loc_display, ["Trung tâm"])
            nearby_landmarks = random.sample(
                landmarks_for_loc, k=min(2, len(landmarks_for_loc))
            )
            policies = random.choice(POLICIES_TEXTS)

            # 7. Description
            short_desc = f"{cat_info['name']} {adj} tại {loc_display}. Phù hợp cho {', '.join(suitable_for)}."
            full_desc = (
                f"Tận hưởng kỳ nghỉ tuyệt vời tại {full_title}. "
                f"Vị trí đắc địa gần {', '.join(nearby_landmarks)}. "
                f"Chỗ nghỉ được trang bị đầy đủ tiện nghi như {', '.join(selected_amenities)}. "
                f"Không gian thiết kế theo phong cách {adj}, mang lại cảm giác thư thái. "
                f"Thích hợp nhất cho nhóm khách: {', '.join(suitable_for)}."
            )

            # 8. Giá
            base_price = random.randint(3, 40) * 100000
            if cat_id in [3, 4]:
                base_price = int(base_price * 1.5)

            has_sale = random.random() < 0.3
            sale_percent = random.choice([10, 20, 30, 50]) if has_sale else 0
            sale_text = f"-{sale_percent}% Summer Deal" if has_sale else None

            # 9. Room name
            if cat_id in [2, 4, 5, 6]:
                room_name = "Nguyên căn"
            elif cat_id == 7:
                room_name = random.choice(["Lều trại cao cấp", "Giường Dorm", "Bungalow"])
            else:
                room_name = random.choice([
                    "Standard Room", "Deluxe Room", "Suite City View",
                    "Family Suite", "King Room with Balcony",
                ])

            stay = {
                "id": stay_id,
                "authorId": f"user_seed_{random.randint(1, 5)}",
                "createdAt": random_date(),
                "updatedAt": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "slug": slug,
                "categoryId": cat_id,
                "category": cat_info["name"],
                "title": full_title,
                "name": room_name,
                "featuredImage": featured_img_url,
                "galleryImgs": gallery,
                "description": short_desc,
                "fullDescription": full_desc,
                "policies": policies,
                "tags": tags,
                "suitableFor": suitable_for,
                "accessibility": accessibility,
                "nearbyLandmarks": nearby_landmarks,
                "cancellationRate": round(random.random() * 0.2, 2),
                "amenities": selected_amenities,
                "price": base_price,
                "address": f"{random.randint(1, 999)} Đường {loc_display}, Việt Nam",
                "destination": loc_display,
                "reviewStar": round(random.uniform(3.8, 5.0), 1),
                "reviewCount": random.randint(10, 500),
                "viewCount": random.randint(100, 2000),
                "commentCount": random.randint(0, 50),
                "like": random.choice([True, False]),
                "isAds": random.random() < 0.05,
                "maxGuests": random.randint(2, 10),
                "bedrooms": random.randint(1, 5),
                "bathrooms": random.randint(1, 5),
                "saleOff": sale_text,
                "saleOffPercent": sale_percent,
                "map": {"lat": round(lat, 6), "lng": round(lng, 6)},
            }
            stays.append(stay)

    return stays


if __name__ == "__main__":
    JSON_DIR = os.path.join(BASE_DIR, "jsons")
    os.makedirs(JSON_DIR, exist_ok=True)

    data = generate_stays()

    # Đảm bảo slug là duy nhất
    slug_count = {}
    for item in data:
        base_slug = item["slug"]
        if base_slug not in slug_count:
            slug_count[base_slug] = 1
            item["slug"] = base_slug
        else:
            slug_count[base_slug] += 1
            item["slug"] = f"{base_slug}-{slug_count[base_slug]}"

    output_path = os.path.join(JSON_DIR, "__homeStay.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã tạo {len(data)} khách sạn tại: {output_path}")

    # In thống kê theo địa điểm
    location_stats = {}
    for item in data:
        addr = item["address"]
        loc = addr.split(" Đường ")[-1].split(",")[0] if " Đường " in addr else "Unknown"
        location_stats[loc] = location_stats.get(loc, 0) + 1
    print("\n📊 Phân bổ theo địa điểm:")
    for loc, count in sorted(location_stats.items()):
        print(f"  • {loc}: {count} khách sạn")
