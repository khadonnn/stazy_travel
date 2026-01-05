import json
import torch
from sentence_transformers import SentenceTransformer
from PIL import Image
import requests
from io import BytesIO
import os

# ---------------------------------------------------------
# 1. KHỞI TẠO MODELS AI
# ---------------------------------------------------------
print("⏳ Đang tải models AI...")

# Model 1: CLIP (Xử lý ảnh) - Output: 512 dims
# Dùng để: Tìm khách sạn bằng hình ảnh tương đồng
img_model = SentenceTransformer("clip-ViT-B-32")

# Model 2: Multilingual Text (Xử lý văn bản tiếng Việt) - Output: 512 dims
# Dùng để: RAG, tìm kiếm ngữ nghĩa (vd: "tìm chỗ ở cho gia đình có bếp")
# distiluse-base-multilingual-cased-v1 hỗ trợ 50+ ngôn ngữ gồm Tiếng Việt
text_model = SentenceTransformer("distiluse-base-multilingual-cased-v1")

print("✅ Models đã sẵn sàng!")

# ---------------------------------------------------------
# 2. HÀM XỬ LÝ ẢNH (GIỮ NGUYÊN LOGIC CŨ)
# ---------------------------------------------------------
def get_image_vector(path_or_url):
    try:
        if not path_or_url: return None
        
        # Trường hợp 1: URL Online
        if path_or_url.startswith(("http://", "https://")):
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            # Timeout ngắn để tránh treo lâu nếu link chết
            response = requests.get(path_or_url, headers=headers, timeout=5)
            if response.status_code != 200: return None
            img = Image.open(BytesIO(response.content)).convert("RGB")
        
        # Trường hợp 2: Local Path
        else:
            current_dir = os.getcwd() 
            project_root = os.path.abspath(os.path.join(current_dir, "../../")) 
            clean_path = path_or_url.lstrip("/")
            
            # Logic tìm file thông minh
            possible_paths = [
                os.path.join(project_root, clean_path),
                os.path.join(project_root, "apps/client/public", clean_path),
                os.path.join(current_dir, clean_path)
            ]
            
            full_local_path = None
            for p in possible_paths:
                if os.path.exists(p):
                    full_local_path = p
                    break
            
            if not full_local_path:
                # print(f"⚠️ Không tìm thấy ảnh local: {clean_path}") # Bớt spam log
                return None
                
            img = Image.open(full_local_path).convert("RGB")

        # Encode ảnh bằng CLIP
        vector = img_model.encode(img).tolist()
        return vector

    except Exception as e:
        # print(f"❌ Lỗi xử lý ảnh {path_or_url}: {e}")
        return None

# ---------------------------------------------------------
# 3. HÀM XỬ LÝ TEXT (MỚI)
# ---------------------------------------------------------
def get_text_embedding(text):
    """
    Chuyển đổi văn bản (policies, description) thành vector 512 chiều
    """
    if not text or len(text.strip()) == 0:
        return None
    try:
        # Encode văn bản bằng Multilingual Model
        vector = text_model.encode(text).tolist()
        return vector
    except Exception as e:
        print(f"❌ Lỗi xử lý text: {e}")
        return None

# ---------------------------------------------------------
# 4. MAIN PROGRAM
# ---------------------------------------------------------
def main():
    input_file = "jsons/__homeStay.json"
    output_file = "jsons/__hotel_vectors.json"

    if not os.path.exists(input_file):
        print(f"❌ Không tìm thấy file input: {input_file}")
        return

    with open(input_file, "r", encoding="utf-8") as f:
        stays = json.load(f)

    processed_data = []
    total = len(stays)
    print(f"🚀 Bắt đầu tạo vector cho {total} khách sạn...")

    for index, item in enumerate(stays):
        print(f"[{index+1}/{total}] 🛠️  Processing: {item.get('title', 'Unknown')}")
        
        # 1. Tạo Image Vector (cho featuredImage)
        img_vec = get_image_vector(item.get("featuredImage"))
        
        # 2. Tạo Policies Vector (Context cho RAG)
        # Mẹo: Kết hợp nhiều trường text lại để AI hiểu ngữ cảnh tốt hơn
        # Chúng ta nối: Title + Full Description + Policies + Tags
        context_text = f"""
        Tên: {item.get('title')}
        Mô tả: {item.get('fullDescription')}
        Chính sách: {item.get('policies')}
        Tags: {', '.join(item.get('tags', []))}
        Phù hợp cho: {', '.join(item.get('suitableFor', []))}
        """.strip()
        
        text_vec = get_text_embedding(context_text)

        # Chỉ lưu nếu có dữ liệu
        if img_vec or text_vec:
            processed_data.append({
                "id": item["id"],
                "imageVector": img_vec,      # Map vào schema: imageVector
                "policiesVector": text_vec   # Map vào schema: policiesVector
            })

    # Lưu kết quả
    os.makedirs("jsons", exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(processed_data, f) # Không cần indent để file nhẹ hơn
    
    print(f"\n✅ HOÀN THÀNH! Đã xuất {len(processed_data)} vectors ra file: {output_file}")

if __name__ == "__main__":
    main()