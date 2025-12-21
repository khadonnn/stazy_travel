import json
import random
import uuid
from faker import Faker
from datetime import datetime
from unidecode import unidecode

# Khởi tạo Faker
fake = Faker(["vi_VN"])

NUM_AUTHORS = 30
NUM_REGULAR_USERS = 20
HOTEL_ID_RANGE = (1, 100)
OUTPUT_FILE = "__users.json"

STREETS = [
    "Lê Lợi",
    "Nguyễn Huệ",
    "Trần Hưng Đạo",
    "Lý Tự Trọng",
    "Hai Bà Trưng",
    "Phan Chu Trinh",
    "Võ Văn Kiệt",
]
DISTRICTS = [
    "Quận 1",
    "Quận 3",
    "Quận 7",
    "Quận Tân Bình",
    "Quận Bình Thạnh",
    "Quận Hoàn Kiếm",
]
CITIES = ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng", "Đà Lạt"]

# Tập hợp để kiểm tra email trùng lặp
used_emails = set()


def clean_vietnamese_name(name):
    no_accent = unidecode(name.lower())
    clean_name = "".join(filter(str.isalnum, no_accent))
    return clean_name


def generate_unique_email(name):
    """Tạo email không dấu và đảm bảo không trùng lặp"""
    base_email = clean_vietnamese_name(name)
    email = f"{base_email}@gmail.com"

    # Nếu trùng thì thêm số đằng sau cho đến khi hết trùng
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


def create_user_data(user_id, role, hotel_ids=None):
    full_name = fake.name()
    email = generate_unique_email(full_name)

    user = {
        "id": user_id,
        "email": email,
        "password": "123456",
        "name": full_name,
        "nickname": fake.user_name(),
        "phone": f"0{random.randint(32, 98)}{random.randint(1000000, 9999999)}",
        "gender": random.choice(["male", "female"]),
        "dob": fake.date_of_birth(minimum_age=18, maximum_age=60).isoformat(),
        "address": generate_vietnam_address(),
        "avatar": f"https://i.pravatar.cc/150?u={user_id}",
        "bgImage": f"https://loremflickr.com/800/400/nature?lock={random.randint(1, 1000)}",
        "jobName": fake.job(),
        "desc": f"Xin chào, tôi là {full_name}. Chào mừng bạn đến với không gian nghỉ dưỡng của tôi.",
        "role": role,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
    }

    if role == "AUTHOR" and hotel_ids:
        user["posts"] = [{"id": hid} for hid in hotel_ids]
    else:
        user["posts"] = []

    return user


def generate_users_with_posts():
    all_users = []

    # 1. Tạo AUTHOR
    for i in range(1, NUM_AUTHORS + 1):
        u_id = f"user_fake_{i}"
        n_hotels = random.randint(3, 6)
        hotel_ids = random.sample(
            range(HOTEL_ID_RANGE[0], HOTEL_ID_RANGE[1] + 1), n_hotels
        )
        all_users.append(create_user_data(u_id, "AUTHOR", hotel_ids))

    # 2. Tạo USER/ADMIN
    for _ in range(NUM_REGULAR_USERS):
        u_id = str(uuid.uuid4())
        role = random.choice(["USER", "ADMIN"])
        all_users.append(create_user_data(u_id, role))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_users, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã tạo {len(all_users)} user vào file {OUTPUT_FILE}")
    print(f"📧 Ví dụ email sạch: {all_users[0]['email']}")


if __name__ == "__main__":
    generate_users_with_posts()
