import cloudinary
import cloudinary.api
import json
import re

# ---------------------------------------------------------
# 1. CẤU HÌNH (THAY BẰNG API KEY THẬT CỦA BẠN)
# ---------------------------------------------------------
cloudinary.config(
  cloud_name = "dtj7wfwzu", 
  api_key = "169917112282832", 
  api_secret = "Clx0shqiMMMa9UCtZFtj3hWmty0",
  secure = True
)

def fetch_all_images():
    print("⏳ Đang quét toàn bộ ảnh trên Cloudinary...")
    
    # FIX: Bỏ 'prefix' để tìm trong cả Root lẫn Folder
    # max_results=500: Lấy tối đa 500 ảnh
    response = cloudinary.api.resources(
        type="upload", 
        max_results=500 
    )
    
    resources = response.get('resources', [])
    print(f"✅ Tổng số ảnh tìm thấy trên kho: {len(resources)}")

    image_map = {}
    count_valid = 0

    # Danh sách các từ khóa địa danh hợp lệ để lọc rác
    VALID_LOCATIONS = [
        "sapa", "da-lat", "tam-dao", "ha-giang", "ninh-binh", "ha-long",
        "nha-trang", "phu-quoc", "quy-nhon", "phu-yen", "con-dao", "mui-ne",
        "vung-tau", "ha-noi", "hcm", "da-nang", "can-tho", "hue", "hoi-an"
    ]

    for res in resources:
        url = res['secure_url'] 
        public_id = res['public_id'] # VD: "locations/sapa-1" HOẶC "sapa-1" HOẶC "image_123"
        
        # Regex thông minh hơn:
        # Tìm bất kỳ chuỗi nào khớp định dạng: "tên-số" (VD: sapa-1, hcm-5)
        # Bất kể nó nằm trong folder nào
        match = re.search(r'([a-z-]+)-(\d+)', public_id)
        
        if match:
            clean_name = match.group(1) # Lấy phần tên (VD: sapa, da-lat)
            
            # Chỉ lấy nếu tên nằm trong danh sách địa danh hợp lệ
            if clean_name in VALID_LOCATIONS:
                if clean_name not in image_map:
                    image_map[clean_name] = []
                
                # Thêm tham số tối ưu ảnh (f_auto, q_auto)
                optimized_url = url.replace("/upload/", "/upload/f_auto,q_auto/")
                image_map[clean_name].append(optimized_url)
                count_valid += 1
            else:
                print(f"⚠️ Bỏ qua ảnh (tên lạ): {public_id}")
        else:
            print(f"⚠️ Bỏ qua ảnh (không đúng định dạng): {public_id}")

    # Lưu ra file JSON
    with open("real_images_map.json", "w", encoding="utf-8") as f:
        json.dump(image_map, f, indent=4)
    
    print("-" * 30)
    print(f"🎉 Đã lọc được {count_valid} ảnh hợp lệ.")
    print("✅ Đã lưu vào 'real_images_map.json'")
    
    # In ra thử vài key
    if image_map:
        print("👉 Các địa danh có ảnh:", list(image_map.keys()))
    else:
        print("❌ CẢNH BÁO: Không lọc được ảnh nào. Hãy kiểm tra tên file trên Cloudinary!")
        print("   Tên file phải có dạng: 'sapa-1', 'hcm-2' (không cần đuôi .jpg)")

if __name__ == "__main__":
    fetch_all_images()