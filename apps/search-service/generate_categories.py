import json
import os

OUTPUT_FILE = "jsons/__category.json"

# Danh sách danh mục cố định
categories = [
    {
        "id": 1,
        "name": "Khách sạn",
        "slug": "khach-san",
        "description": "Trải nghiệm tiện nghi và sang trọng tại các khách sạn hàng đầu.",
        "thumbnail": "https://loremflickr.com/800/600/hotel,luxury?lock=1",
        "icon": "🏨"
    },
    {
        "id": 2,
        "name": "Homestay",
        "slug": "homestay",
        "description": "Khám phá văn hóa địa phương với không gian ấm cúng.",
        "thumbnail": "https://loremflickr.com/800/600/homestay,house?lock=2",
        "icon": "🏡"
    },
    {
        "id": 3,
        "name": "Resort",
        "slug": "resort",
        "description": "Thư giãn tuyệt đối tại các khu nghỉ dưỡng ven biển.",
        "thumbnail": "https://loremflickr.com/800/600/resort,beach?lock=3",
        "icon": "🏖️"
    },
    {
        "id": 4,
        "name": "Biệt thự",
        "slug": "biet-thu",
        "description": "Không gian riêng tư và đẳng cấp cho cả gia đình.",
        "thumbnail": "https://loremflickr.com/800/600/villa,mansion?lock=4",
        "icon": "🏰"
    },
    {
        "id": 5,
        "name": "Căn hộ",
        "slug": "can-ho",
        "description": "Tiện nghi như ở nhà ngay tại trung tâm thành phố.",
        "thumbnail": "https://loremflickr.com/800/600/apartment,interior?lock=5",
        "icon": "🏢"
    },
    {
        "id": 6,
        "name": "Nhà gỗ",
        "slug": "nha-go",
        "description": "Hòa mình vào thiên nhiên với những căn nhà gỗ thơ mộng.",
        "thumbnail": "https://loremflickr.com/800/600/cabin,forest?lock=6",
        "icon": "🏕️"
    },
    { "id": 7,
        "name": "Khác",
        "slug": "khac",
        "description": "Những trải nghiệm lưu trú độc đáo khác.",
        "thumbnail": "https://loremflickr.com/800/600/travel?lock=7",
        "icon": "🌍"
    }
]
# Tạo thư mục nếu chưa có
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(categories, f, ensure_ascii=False, indent=2)

print(f"✅ Đã tạo {len(categories)} danh mục vào file '{OUTPUT_FILE}'")