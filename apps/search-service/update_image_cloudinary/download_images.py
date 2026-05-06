import json
import os
import sys
import requests
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import cloudinary
import cloudinary.api


# Lấy đường dẫn thư mục hiện tại (update_image_cloudinary)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SEARCH_SERVICE_DIR = os.path.dirname(SCRIPT_DIR)
load_dotenv(os.path.join(SEARCH_SERVICE_DIR, ".env"))

# Cấu hình Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

BASE_DIR = SCRIPT_DIR
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
JSONS_DIR = os.path.join(BASE_DIR, "jsons")

FEATURED_JSON = os.path.join(JSONS_DIR, "featuredImage.json")
GALLERY_JSON = os.path.join(JSONS_DIR, "galleryImgs.json")

FEATURED_DIR = os.path.join(DOWNLOADS_DIR, "featuredImage")
GALLERY_DIR = os.path.join(DOWNLOADS_DIR, "galleryImgs")

FEATURED_CLOUD_FOLDER = "featuredImage"
GALLERY_CLOUD_FOLDER = "galleryImgs"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

TIMEOUT = 30  # seconds
MAX_WORKERS = 8


def get_extension(url: str) -> str:
    """Trích xuất phần mở rộng file từ URL, mặc định là .jpg."""
    parsed = urlparse(url.split("?")[0])
    path = parsed.path
    if "." in os.path.basename(path):
        ext = os.path.splitext(path)[1].lower()
        if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"):
            return ext
    return ".jpg"


def download_one(url: str, save_path: str) -> bool:
    """Tải 1 ảnh từ url và lưu vào save_path. Trả về True nếu thành công."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, stream=True)
        resp.raise_for_status()
        with open(save_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"  ✗ Lỗi tải {url[:80]}... -> {e}")
        return False


def fetch_cloudinary_resources(folder: str) -> list:
    """Lấy toàn bộ ảnh trong 1 folder trên Cloudinary (có phân trang)."""
    all_resources = []
    next_cursor = None

    while True:
        try:
            params = {
                "type": "upload",
                "prefix": f"{folder}/",
                "max_results": 500,
                "resource_type": "image",
            }
            if next_cursor:
                params["next_cursor"] = next_cursor

            result = cloudinary.api.resources(**params)
            resources = result.get("resources", [])
            all_resources.extend(resources)

            next_cursor = result.get("next_cursor")
            if not next_cursor:
                break

        except Exception as e:
            print(f"  ✗ Lỗi khi lấy danh sách ảnh từ folder '{folder}': {e}")
            break

    return all_resources


def group_by_location(resources: list, image_type: str) -> dict:
    """Nhóm ảnh theo địa phương từ tên file: {location}_{image_type}_{number}."""
    grouped = {}

    for res in resources:
        public_id = res.get("public_id", "")
        filename = public_id.split("/")[-1] if "/" in public_id else public_id

        suffix = f"_{image_type}_"
        idx = filename.rfind(suffix)
        if idx == -1:
            continue

        location = filename[:idx]
        if not location:
            continue

        url = res.get("secure_url", "")
        if location not in grouped:
            grouped[location] = []
        grouped[location].append(url)

    # Sắp xếp theo số thứ tự
    for location in grouped:
        def sort_key(url):
            basename = url.rsplit("/", 1)[-1].split(".")[0]
            parts = basename.split("_")
            try:
                return int(parts[-1])
            except (ValueError, IndexError):
                return 0
        grouped[location].sort(key=sort_key)

    return grouped


def fetch_and_save_cloudinary_urls():
    """
    Lấy URL ảnh từ Cloudinary và lưu vào jsons/featuredImage.json & jsons/galleryImgs.json.
    """
    print("\n" + "=" * 60)
    print("  BƯỚC 1: LẤY URL TỪ CLOUDINARY -> JSON")
    print("=" * 60)

    config = cloudinary.config()
    if not config.cloud_name or not config.api_key or not config.api_secret:
        print("❌ Thiếu cấu hình Cloudinary! Kiểm tra file .env")
        sys.exit(1)

    print(f"  Cloud: {config.cloud_name}")
    os.makedirs(JSONS_DIR, exist_ok=True)

    # --- Featured Images ---
    print(f"\n{'─' * 60}")
    print(f"📁 Featured Images (folder: {FEATURED_CLOUD_FOLDER})")
    print(f"{'─' * 60}")
    feat_resources = fetch_cloudinary_resources(FEATURED_CLOUD_FOLDER)
    print(f"  📷 Tìm thấy {len(feat_resources)} ảnh")

    feat_data = group_by_location(feat_resources, "featuredImage")
    feat_total = sum(len(v) for v in feat_data.values())
    print(f"  🗺  Nhóm thành {len(feat_data)} địa phương, {feat_total} ảnh")
    for loc, urls in sorted(feat_data.items()):
        print(f"    • {loc}: {len(urls)} ảnh")

    with open(FEATURED_JSON, "w", encoding="utf-8") as f:
        json.dump(feat_data, f, ensure_ascii=False, indent=2)
    print(f"  📝 Đã lưu: {FEATURED_JSON}")

    # --- Gallery Images ---
    print(f"\n{'─' * 60}")
    print(f"📁 Gallery Images (folder: {GALLERY_CLOUD_FOLDER})")
    print(f"{'─' * 60}")
    gal_resources = fetch_cloudinary_resources(GALLERY_CLOUD_FOLDER)
    print(f"  📷 Tìm thấy {len(gal_resources)} ảnh")

    gal_data = group_by_location(gal_resources, "galleryImgs")
    gal_total = sum(len(v) for v in gal_data.values())
    print(f"  🗺  Nhóm thành {len(gal_data)} địa phương, {gal_total} ảnh")
    for loc, urls in sorted(gal_data.items()):
        print(f"    • {loc}: {len(urls)} ảnh")

    with open(GALLERY_JSON, "w", encoding="utf-8") as f:
        json.dump(gal_data, f, ensure_ascii=False, indent=2)
    print(f"  📝 Đã lưu: {GALLERY_JSON}")

    return feat_data, gal_data


def download_images(json_path: str, output_dir: str, image_type: str):
    """
    Đọc file JSON, tải tất cả ảnh và lưu vào output_dir.
    
    Tên file: [địa-phương]_[image_type]_[số-thứ-tự].[ext]
    Ví dụ: ninh-binh_featuredImage_1.jpg
    """
    # Tạo thư mục nếu chưa tồn tại
    os.makedirs(output_dir, exist_ok=True)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    total_success = 0
    total_fail = 0

    for location, urls in data.items():
        print(f"\n📍 Đang tải ảnh cho: {location} ({len(urls)} ảnh)")

        # Chuẩn bị danh sách task: (url, save_path)
        tasks = []
        for idx, url in enumerate(urls, start=1):
            ext = get_extension(url)
            filename = f"{location}_{image_type}_{idx}{ext}"
            save_path = os.path.join(output_dir, filename)

            # Bỏ qua nếu file đã tồn tại
            if os.path.exists(save_path):
                print(f"  ⊘ Bỏ qua (đã tồn tại): {filename}")
                total_success += 1
                continue

            tasks.append((url, save_path))

        if not tasks:
            continue

        # Tải ảnh đa luồng
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_map = {
                executor.submit(download_one, url, path): (url, path)
                for url, path in tasks
            }
            for future in as_completed(future_map):
                url, path = future_map[future]
                filename = os.path.basename(path)
                if future.result():
                    print(f"  ✓ {filename}")
                    total_success += 1
                else:
                    total_fail += 1

    return total_success, total_fail


def download_from_json_files():
    """Tải ảnh từ URL trong 2 file JSON về downloads/."""
    print("\n" + "=" * 60)
    print("  BƯỚC 2: TẢI ẢNH TỪ JSON VỀ downloads/")
    print("=" * 60)

    # Kiểm tra file JSON tồn tại
    if not os.path.exists(FEATURED_JSON) or not os.path.exists(GALLERY_JSON):
        print("❌ Chưa có file JSON! Cần chạy bước 1 trước.")
        sys.exit(1)

    # --- Tải Featured Images ---
    print(f"\n{'─' * 60}")
    print(f"📁 Featured Images -> {FEATURED_DIR}")
    print(f"{'─' * 60}")
    feat_ok, feat_fail = download_images(FEATURED_JSON, FEATURED_DIR, "featuredImage")

    # --- Tải Gallery Images ---
    print(f"\n{'─' * 60}")
    print(f"📁 Gallery Images -> {GALLERY_DIR}")
    print(f"{'─' * 60}")
    gal_ok, gal_fail = download_images(GALLERY_JSON, GALLERY_DIR, "galleryImgs")

    # --- Tổng kết ---
    print(f"\n{'=' * 60}")
    print(f"  KẾT QUẢ TẢI ẢNH:")
    print(f"  Featured Images : {feat_ok} thành công, {feat_fail} thất bại")
    print(f"  Gallery Images  : {gal_ok} thành công, {gal_fail} thất bại")
    print(f"  Tổng            : {feat_ok + gal_ok} thành công, {feat_fail + gal_fail} thất bại")
    print(f"{'=' * 60}")


def main():
    print("=" * 60)
    print("  LẤY URL CLOUDINARY & TẢI ẢNH VỀ downloads/")
    print("=" * 60)

    # Bước 1: Lấy URL từ Cloudinary -> jsons/
    fetch_and_save_cloudinary_urls()

    # Bước 2: Tải ảnh từ URL trong JSON -> downloads/
    download_from_json_files()

    print("\n✅ HOÀN TẤT!")


if __name__ == "__main__":
    main()
