import json
import torch
from sentence_transformers import SentenceTransformer
from PIL import Image
import requests
from io import BytesIO
import os

# 1. Khởi tạo model AI
print("Đang tải model CLIP...")
model = SentenceTransformer("clip-ViT-B-32")

def get_image_vector(path_or_url):
    try:
        # Trường hợp 1: URL Pinterest/Internet
        if path_or_url.startswith(("http://", "https://")):
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(path_or_url, headers=headers, timeout=15)
            img = Image.open(BytesIO(response.content)).convert("RGB")
        
        # Trường hợp 2: Đường dẫn Local (Sửa lỗi tại đây)
        else:
            # 1. Xác định thư mục gốc của toàn bộ project (stazy)
            # Vì bạn đang chạy ở apps/search-service, dùng absolute path cho chắc chắn
            current_dir = os.getcwd() # D:\it\_1doan_totnghiep\stazy\apps\search-service
            project_root = os.path.abspath(os.path.join(current_dir, "../../")) # D:\it\_1doan_totnghiep\stazy
            
            # 2. Làm sạch đường dẫn từ JSON
            # Nếu path là /apps/client/public/locations/..., ta chỉ cần nối với project_root
            clean_path = path_or_url.lstrip("/")
            full_local_path = os.path.join(project_root, clean_path)
            
            # Kiểm tra nếu đường dẫn trong JSON chỉ là /locations/...
            if not os.path.exists(full_local_path):
                # Thử tìm trong apps/client/public/locations/...
                full_local_path = os.path.join(project_root, "apps/client/public", clean_path)

            if not os.path.exists(full_local_path):
                print(f"❌ Vẫn không thấy file tại: {full_local_path}")
                return None
                
            img = Image.open(full_local_path).convert("RGB")

        vector = model.encode(img).tolist()
        return vector
    except Exception as e:
        print(f"❌ Lỗi xử lý: {e}")
        return None

def main():
    input_file = "jsons/__homeStay.json"
    output_file = "jsons/__hotel_vectors.json"

    with open(input_file, "r", encoding="utf-8") as f:
        stays = json.load(f)

    hotel_vectors = []
    print(f"🚀 Bắt đầu tạo vector cho {len(stays)} khách sạn...")

    for item in stays:
        print(f"-> Đang xử lý: {item['title']}")
        vector = get_image_vector(item["featuredImage"])
        if vector:
            hotel_vectors.append({"id": item["id"], "vector": vector})

    os.makedirs("jsons", exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(hotel_vectors, f)
    print(f"✅ Hoàn thành! File lưu tại: {output_file}")

if __name__ == "__main__":
    main()