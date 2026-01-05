import json
import random
from datetime import datetime, timedelta

# ---------------------------------------------------------
# 1. CẤU HÌNH (ĐỒNG BỘ VỚI CÁC FILE KHÁC)
# ---------------------------------------------------------

# Dùng danh sách chuẩn (snake_case) để khớp với Hotel
ALL_AMENITIES_STANDARD = [
    # Cơ bản
    "wifi", "ac", "parking", "elevator", "tv", "kitchen", "balcony", "bathtub", "hot_water_24h", "workspace", "laundry","rice_cooker","refrigerator","free_motorbike_rental", "quiet_after_22h",
    # Sức khỏe & Giải trí
    "pool", "gym", "spa", "sauna", "massage", "yoga",
    # Ăn uống
    "restaurant", "bar", "breakfast", "room_service", "bbq_area",
    # View & Vị trí
    "sea_view", "mountain_view", "city_view", "garden_view", "beachfront", "beach_access", "beach_walkable", "private_beach", "ocean_view",
    # Gia đình
    "kids_club", "playground", "baby_crib", "high_chair", "family_room",
    # Thiên nhiên
    "garden", "terrace", "outdoor_shower", "fireplace", "hammock", "stargazing_deck",
    # Vật nuôi
    "pets_allowed", "pet_bed", "pet_food", "dog_run_area",
    # An toàn
    "wheelchair_accessible", "24h_reception", "security_guard", "first_aid_kit", "smoke_detector",
    # Bền vững
    "solar_power", "rainwater_harvesting", "plastic_free", "local_sourcing",
    # Sự kiện
    "event_space", "karaoke_room", "wedding_ready",
]

# Các loại interaction theo Schema mới
INTERACTION_TYPES = [
    "VIEW",            # Xem chi tiết
    "LIKE",            # Thích
    "CLICK_BOOK_NOW",  # Bấm đặt nhưng chưa thanh toán
    "BOOK",            # Đặt thành công
    "SHARE",           # Chia sẻ
    "SEARCH_QUERY"     # Tìm kiếm (Sẽ làm riêng nếu cần)
]

# Trọng số cho từng hành động (để tính toán sơ bộ)
WEIGHT_MAP = {
    "VIEW": 1,
    "SHARE": 2,
    "LIKE": 3,
    "CLICK_BOOK_NOW": 4,
    "BOOK": 5
}

def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Không tìm thấy file: {path}")
        return []

# ---------------------------------------------------------
# 2. LOGIC TẠO TƯƠNG TÁC
# ---------------------------------------------------------
def main():
    # Load dữ liệu đầu vào
    stays = load_json("jsons/__homeStay.json")
    users = load_json("jsons/__users.json")
    
    if not stays or not users:
        return

    interactions = []
    print(f"🚀 Đang tạo tương tác giả lập giữa {len(users)} users và {len(stays)} hotels...")

    for user in users:
        # User Role Author/Admin ít tương tác mua hàng hơn User thường
        if user["role"] == "ADMIN": 
            continue
            
        # Lấy sở thích của user (nếu có) để tạo hành vi logic hơn
        user_pref = user.get("preference")
        fav_amenities = user_pref.get("favoriteAmenities", []) if user_pref else []
        
        # Mỗi user thực hiện 5-30 hành động
        n_actions = random.randint(5, 30)
        
        for _ in range(n_actions):
            # 1. Chọn Hotel để tương tác
            # Logic: Nếu hotel có tiện nghi user thích -> khả năng click cao hơn
            weights = []
            for stay in stays:
                score = 1.0
                # Nếu có chung amenity -> tăng score
                common = set(stay.get("amenities", [])) & set(fav_amenities)
                score += len(common) * 0.5 
                
                # Random yếu tố ngẫu nhiên
                score *= random.uniform(0.8, 1.5)
                weights.append(score)
            
            # Chọn 1 hotel dựa trên trọng số
            stay_choice = random.choices(stays, weights=weights, k=1)[0]

            # 2. Quyết định loại hành động (Funnel)
            # 70% View, 15% Like, 10% Click Book, 5% Book
            rand_val = random.random()
            if rand_val < 0.7:
                itype = "VIEW"
            elif rand_val < 0.85:
                itype = "LIKE"
            elif rand_val < 0.95:
                itype = "CLICK_BOOK_NOW"
            else:
                itype = "BOOK"
            
            # 3. Thời gian (Random trong 90 ngày qua)
            days_ago = random.randint(0, 90)
            timestamp = (datetime.now() - timedelta(days=days_ago)).isoformat()
            
            # 4. Metadata (Context cho AI)
            metadata = None
            if itype in ["BOOK", "CLICK_BOOK_NOW"]:
                metadata = {
                    "adults": random.randint(1, 4),
                    "children": random.randint(0, 2),
                    "totalPrice": stay_choice.get("price", 0) * random.randint(1, 3), # Giá x số đêm
                    "checkIn": timestamp
                }
            elif itype == "VIEW":
                metadata = {
                    "duration_sec": random.randint(10, 300), # Xem bao lâu
                    "scroll_depth": random.choice(["25%", "50%", "100%"])
                }

            interactions.append({
                "userId": user["id"],       # user_seed_X
                "hotelId": stay_choice["id"], # int
                "type": itype,              # Enum
                "timestamp": timestamp,
                "metadata": metadata
                # Lưu ý: Không cần field "weight" nữa vì ta đã có Enum Type,
                # nhưng nếu cần train model CF cổ điển thì có thể mapping sau.
            })

    # Lưu kết quả
    output_file = "jsons/__interactions.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(interactions, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã tạo {len(interactions)} tương tác tại: {output_file}")
    print("👉 Mẫu: userId='user_seed_6' -> type='BOOK' -> hotelId=12")

if __name__ == "__main__":
    main()