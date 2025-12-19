import json
import torch
from sentence_transformers import SentenceTransformer
from PIL import Image
import requests
from io import BytesIO

# 1. Khởi tạo model AI
print("Đang tải model CLIP...")
model = SentenceTransformer("clip-ViT-B-32")


def get_image_vector(url):
    """Tải ảnh và chuyển thành vector số"""
    try:
        response = requests.get(url, timeout=10)
        img = Image.open(BytesIO(response.content)).convert("RGB")
        # Chuyển ảnh thành vector (mảng 512 số thực)
        vector = model.encode(img).tolist()
        return vector
    except Exception as e:
        print(f"Lỗi khi xử lý ảnh {url}: {e}")
        return None


# 2. Đọc file JSON gốc của bạn
input_file = "__homeStay.json"  # Đổi tên cho đúng file của bạn
output_file = "hotel_vectors.json"

with open(input_file, "r", encoding="utf-8") as f:
    stays = json.load(f)

hotel_vectors = []

# 3. Duyệt qua từng khách sạn để tạo vector
print(f"Bắt đầu xử lý {len(stays)} khách sạn...")
for item in stays:
    print(f" -> Đang xử lý: {item['title']}")

    # Chúng ta lấy ảnh featuredImage để làm đại diện so sánh
    vector = get_image_vector(item["featuredImage"])

    if vector:
        hotel_vectors.append({"id": item["id"], "vector": vector})

# 4. Lưu kết quả ra file mới
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(hotel_vectors, f)

print(f"✅ Hoàn thành! Đã tạo file {output_file} sẵn sàng cho Search.")
