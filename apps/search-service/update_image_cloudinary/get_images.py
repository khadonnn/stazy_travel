import os
import sys
import json
from dotenv import load_dotenv
import cloudinary
import cloudinary.api

# Load .env từ thư mục search-service
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SEARCH_SERVICE_DIR = os.path.dirname(SCRIPT_DIR)
load_dotenv(os.path.join(SEARCH_SERVICE_DIR, ".env"))

# Cấu hình Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

FEATURED_CLOUD_FOLDER = "featuredImage"
GALLERY_CLOUD_FOLDER = "galleryImgs"

JSONS_DIR = os.path.join(SCRIPT_DIR, "jsons")
OUTPUT_FEATURED = os.path.join(JSONS_DIR, "featuredImage.json")
OUTPUT_GALLERY = os.path.join(JSONS_DIR, "galleryImgs.json")


def fetch_all_resources(folder: str) -> list:
    """
    Lấy toàn bộ ảnh trong 1 folder trên Cloudinary.
    Sử dụng Admin API với phân trang (next_cursor).
    """
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
    """
    Nhóm ảnh theo tên địa phương.

    Tên file có dạng: {location}_{image_type}_{number}
    Ví dụ: ninh-binh_featuredImage_1 -> location = "ninh-binh"
    """
    grouped = {}

    for res in resources:
        public_id = res.get("public_id", "")
        filename = public_id.split("/")[-1] if "/" in public_id else public_id

        suffix = f"_{image_type}_"
        idx = filename.rfind(suffix)
        if idx == -1:
            print(f"  ⚠ Bỏ qua (không đúng format): {filename}")
            continue

        location = filename[:idx]
        if not location:
            print(f"  ⚠ Bỏ qua (không tách được location): {filename}")
            continue

        url = res.get("secure_url", "")

        if location not in grouped:
            grouped[location] = []

        grouped[location].append(url)

    # Sắp xếp URL theo số thứ tự trong tên file
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


def save_json(data: dict, output_path: str):
    """Lưu dict ra file JSON."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  📝 Đã lưu: {output_path}")


def process_folder(cloud_folder: str, image_type: str, output_path: str):
    """Fetch ảnh từ Cloudinary, nhóm theo địa phương, lưu JSON."""
    print(f"\n{'─' * 60}")
    print(f"📁 Folder: {cloud_folder}")
    print(f"{'─' * 60}")

    resources = fetch_all_resources(cloud_folder)
    print(f"  📷 Tìm thấy {len(resources)} ảnh trên Cloudinary")

    if not resources:
        print(f"  ⚠ Không có ảnh nào trong folder '{cloud_folder}'")
        save_json({}, output_path)
        return {}

    grouped = group_by_location(resources, image_type)

    total_images = sum(len(urls) for urls in grouped.values())
    print(f"  🗺  Nhóm thành {len(grouped)} địa phương, {total_images} ảnh")

    for location, urls in sorted(grouped.items()):
        print(f"    • {location}: {len(urls)} ảnh")

    save_json(grouped, output_path)
    return grouped


def main():
    print("=" * 60)
    print("  LẤY URL ẢNH TỪ CLOUDINARY -> JSON")
    print("=" * 60)

    # Kiểm tra cấu hình
    config = cloudinary.config()
    if not config.cloud_name or not config.api_key or not config.api_secret:
        print("❌ Thiếu cấu hình Cloudinary! Kiểm tra file .env")
        sys.exit(1)

    print(f"  Cloud: {config.cloud_name}")

    # --- Featured Images ---
    feat_data = process_folder(
        FEATURED_CLOUD_FOLDER, "featuredImage", OUTPUT_FEATURED
    )

    # --- Gallery Images ---
    gal_data = process_folder(
        GALLERY_CLOUD_FOLDER, "galleryImgs", OUTPUT_GALLERY
    )

    # --- Tổng kết ---
    feat_total = sum(len(v) for v in feat_data.values())
    gal_total = sum(len(v) for v in gal_data.values())

    print(f"\n{'=' * 60}")
    print(f"  KẾT QUẢ:")
    print(f"  Featured Images : {len(feat_data)} địa phương, {feat_total} ảnh")
    print(f"  Gallery Images  : {len(gal_data)} địa phương, {gal_total} ảnh")
    print(f"  File output     :")
    print(f"    - {OUTPUT_FEATURED}")
    print(f"    - {OUTPUT_GALLERY}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
