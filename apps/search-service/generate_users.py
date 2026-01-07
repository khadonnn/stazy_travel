import json
import random
import os
from faker import Faker
from datetime import datetime, timedelta
from unidecode import unidecode

# Khởi tạo Faker
fake = Faker(["vi_VN"])

# --- CẤU HÌNH ---
NUM_USERS = 200 
OUTPUT_FILE = "jsons/__users.json"

STREETS = [
    # 🟢 Miền Nam (TP.HCM, Cần Thơ, Vũng Tàu…)
    "Lê Lợi", "Nguyễn Huệ", "Trần Hưng Đạo", "Lý Tự Trọng", "Hai Bà Trưng", 
    "Phan Chu Trinh", "Võ Văn Kiệt", "Ngô Đức Kế", "Cách Mạng Tháng Tám",
    "Nguyễn Văn Linh", "Phạm Ngũ Lão", "Điện Biên Phủ", "Nguyễn Thị Minh Khai",
    "Hoàng Diệu", "Trần Quốc Thảo", "Nguyễn Đình Chiểu", "Bà Huyện Thanh Quan",
    
    # 🔵 Miền Bắc (Hà Nội, Hải Phòng, Ninh Bình…)
    "Hàng Bài", "Tràng Tiền", "Lê Duẩn", "Giảng Võ", "Liễu Giai",
    "Kim Mã", "Láng Hạ", "Xã Đàn", "Giải Phóng", "Nguyễn Trãi",
    "Phạm Văn Đồng", "Hoàng Quốc Việt", "Cầu Giấy", "Đội Cấn",
    
    # 🟠 Miền Trung (Đà Nẵng, Huế, Nha Trang, Quy Nhơn…)
    "Bạch Đằng", "Trần Phú", "Hùng Vương", "Lý Thường Kiệt", "Ngô Quyền",
    "Nguyễn Tất Thành", "Võ Nguyên Giáp", "Trần Cao Vân", "Phan Bội Châu",
    "Nguyễn Chí Thanh", "Lê Duẩn", "Hoàng Diệu", "Trần Hưng Đạo"
]

DISTRICTS = [
    # 🟢 TP.HCM
    "Quận 1", "Quận 3", "Quận 5", "Quận 7", "Quận 10", 
    "Quận Tân Bình", "Quận Phú Nhuận", "Quận Gò Vấp", "Quận Bình Thạnh",
    "Quận Thủ Đức", "Quận 12", "Quận Bình Tân", "Huyện Hóc Môn",
    
    # 🔵 Hà Nội
    "Quận Hoàn Kiếm", "Quận Đống Đa", "Quận Ba Đình", "Quận Hai Bà Trưng", 
    "Quận Tây Hồ", "Quận Cầu Giấy", "Quận Thanh Xuân", "Quận Hà Đông",
    "Quận Long Biên", "Huyện Thanh Trì", "Quận Nam Từ Liêm",
    
    # 🟠 Đà Nẵng & miền Trung
    "Quận Hải Châu", "Quận Thanh Khê", "Quận Sơn Trà", "Quận Ngũ Hành Sơn",
    "Quận Liên Chiểu", "Huyện Hòa Vang",
    
    # 🟣 Các tỉnh khác
    "Thành phố Nha Trang", "Thành phố Huế", "Thành phố Quy Nhơn",
    "Thành phố Vũng Tàu", "Thành phố Biên Hòa", "Thị xã Dĩ An",
    "Huyện Bình Chánh", "Huyện Củ Chi", "Huyện Nhà Bè"
]

CITIES = [
    # 🟢 Miền Nam
    "TP. Hồ Chí Minh", "Cần Thơ", "Bình Dương", "Đồng Nai", "Bà Rịa - Vũng Tàu",
    "Long An", "Tây Ninh", "Tiền Giang", "Bến Tre", "Đồng Tháp",
    
    # 🔵 Miền Bắc
    "Hà Nội", "Hải Phòng", "Hải Dương", "Bắc Ninh", "Quảng Ninh",
    "Ninh Bình", "Nam Định", "Thái Bình", "Vĩnh Phúc", "Phú Thọ",
    
    # 🟠 Miền Trung – Tây Nguyên
    "Đà Nẵng", "Khánh Hòa", "Thừa Thiên Huế", "Bình Định", "Phú Yên",
    "Quảng Nam", "Quảng Ngãi", "Đắk Lắk", "Đắk Nông", "Gia Lai",
    "Lâm Đồng", "Nghệ An", "Hà Tĩnh", "Quảng Bình", "Quảng Trị"
]
AMENITIES_POOL = ["wifi", "pool", "ac", "parking", "sea_view", "mountain_view", "kitchen", "breakfast", "pets_allowed"]
LOCATIONS_POOL = ["nha_trang", "da_lat", "vung_tau", "ha_noi", "hcm", "da_nang", "sapa"]

used_emails = set()

def clean_vietnamese_name(name):
    no_accent = unidecode(name.lower())
    clean_name = "".join(filter(str.isalnum, no_accent))
    return clean_name

def generate_unique_email(name):
    base_email = clean_vietnamese_name(name)
    email = f"{base_email}@gmail.com"
    counter = 1
    temp_email = email
    while temp_email in used_emails:
        temp_email = f"{base_email}{counter}@gmail.com"
        counter += 1
    used_emails.add(temp_email)
    return temp_email

def generate_vietnam_address():
    number = random.randint(1, 500)
    street = random.choice(STREETS)
    district = random.choice(DISTRICTS)
    city = random.choice(CITIES)
    return f"Số {number}, Đường {street}, {district}, {city}"

def generate_preferences(user_id):
    if random.random() < 0.3:
        return None
    return {
        "favoriteAmenities": random.sample(AMENITIES_POOL, k=random.randint(2, 5)),
        "favoriteCities": random.sample(LOCATIONS_POOL, k=random.randint(1, 3)),
        "avgPriceExpect": random.randint(5, 50) * 100000, 
        "preferredRatingMin": round(random.uniform(3.5, 4.8), 1),
        "pastBookingCount": random.randint(0, 10),
        "lastBookingAt": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat()
    }

def create_user_data(index):
    # ID String cố định -> Dễ map với bảng Hotel
    user_id = f"user_seed_{index}"
    
    # 5 User đầu tiên là Author (khớp với logic bên generate_stays.py)
    if index <= 5:
        role = "AUTHOR"
    else:
        role = random.choice(["USER", "USER", "USER", "ADMIN"])

    full_name = fake.name()
    email = generate_unique_email(full_name)

    user = {
        "id": user_id, # Prisma chấp nhận string này
        "email": email,
        "password": "123456", 
        "name": full_name,
        "nickname": fake.user_name(),
        "phone": f"0{random.randint(32, 98)}{random.randint(1000000, 9999999)}",
        "gender": random.choice(["male", "female"]),
        "dob": fake.date_of_birth(minimum_age=18, maximum_age=60).isoformat(),
        "address": generate_vietnam_address(),
        "avatar": f"https://i.pravatar.cc/150?u={user_id}",
        "bgImage": f"https://loremflickr.com/800/400/nature,landscape?lock={index}",
        "jobName": fake.job(),
        "desc": f"Xin chào, tôi là {full_name}. Yêu thích du lịch.",
        "role": role,
        "preference": generate_preferences(user_id),
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
    }
    return user

def generate_users():
    all_users = []
    print(f"🚀 Đang tạo {NUM_USERS} Users...")

    for i in range(1, NUM_USERS + 1):
        all_users.append(create_user_data(i))

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_users, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã tạo xong {len(all_users)} user tại {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_users()