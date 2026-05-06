import os
import sys
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
from concurrent.futures import ThreadPoolExecutor, as_completed

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

DOWNLOADS_DIR = os.path.join(SCRIPT_DIR, "downloads")
FEATURED_DIR = os.path.join(DOWNLOADS_DIR, "featuredImage")
GALLERY_DIR = os.path.join(DOWNLOADS_DIR, "galleryImgs")

# Folder trên Cloudinary để phân loại
FEATURED_CLOUD_FOLDER = "featuredImage"
GALLERY_CLOUD_FOLDER = "galleryImgs"

MAX_WORKERS = 4  # Số luồng upload đồng thời


def upload_one(filepath: str, cloud_folder: str) -> dict | None:
    """
    Upload 1 ảnh lên Cloudinary, giữ nguyên tên file gốc.

    Sử dụng folder + public_id để đảm bảo ảnh nằm đúng folder trên Cloudinary.
    unique_filename=False + overwrite=True để không bị thêm ID khác.
    """
    filename = os.path.basename(filepath)
    name_without_ext = os.path.splitext(filename)[0]

    try:
        result = cloudinary.uploader.upload(
            filepath,
            folder=cloud_folder,
            public_id=name_without_ext,
            unique_filename=False,
            overwrite=True,
            resource_type="image",
        )
        return {
            "file": filename,
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
        }
    except Exception as e:
        print(f"  ✗ Lỗi upload {filename}: {e}")
        return None


def upload_folder(folder_path: str, cloud_folder: str):
    """Upload tất cả ảnh trong folder lên Cloudinary."""
    if not os.path.isdir(folder_path):
        print(f"  ⚠ Thư mục không tồn tại: {folder_path}")
        return [], []

    files = [
        os.path.join(folder_path, f)
        for f in os.listdir(folder_path)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"))
    ]

    if not files:
        print(f"  ⚠ Không tìm thấy ảnh trong: {folder_path}")
        return [], []

    print(f"  📤 Tìm thấy {len(files)} ảnh, bắt đầu upload...")

    success_results = []
    failed_files = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_map = {
            executor.submit(upload_one, fp, cloud_folder): fp for fp in files
        }
        for future in as_completed(future_map):
            filepath = future_map[future]
            filename = os.path.basename(filepath)
            result = future.result()
            if result:
                print(f"  ✓ {filename} -> {result['url']}")
                success_results.append(result)
            else:
                failed_files.append(filename)

    return success_results, failed_files


def save_upload_log(results: list, log_name: str):
    """Lưu kết quả upload vào file JSON để tham khảo."""
    import json

    log_path = os.path.join(SCRIPT_DIR, f"upload_log_{log_name}.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"  📝 Log đã lưu: {log_path}")


def main():
    print("=" * 60)
    print("  UPLOAD ẢNH LÊN CLOUDINARY (giữ nguyên tên file)")
    print("=" * 60)

    # Kiểm tra cấu hình Cloudinary
    config = cloudinary.config()
    if not config.cloud_name or not config.api_key or not config.api_secret:
        print("❌ Thiếu cấu hình Cloudinary! Kiểm tra file .env:")
        print("   CLOUDINARY_CLOUD_NAME=...")
        print("   CLOUDINARY_API_KEY=...")
        print("   CLOUDINARY_API_SECRET=...")
        sys.exit(1)

    print(f"  Cloud: {config.cloud_name}")
    print(f"  unique_filename=False, overwrite=True")
    print(f"  → Tên file gốc sẽ được giữ nguyên trên Cloudinary\n")

    total_ok = 0
    total_fail = 0

    # --- Upload Featured Images ---
    print(f"{'─' * 60}")
    print(f"📁 Featured Images ({FEATURED_DIR})")
    print(f"   -> Cloudinary folder: {FEATURED_CLOUD_FOLDER}")
    print(f"{'─' * 60}")
    feat_results, feat_failed = upload_folder(FEATURED_DIR, FEATURED_CLOUD_FOLDER)
    if feat_results:
        save_upload_log(feat_results, "featuredImage")
    total_ok += len(feat_results)
    total_fail += len(feat_failed)

    # --- Upload Gallery Images ---
    print(f"\n{'─' * 60}")
    print(f"📁 Gallery Images ({GALLERY_DIR})")
    print(f"   -> Cloudinary folder: {GALLERY_CLOUD_FOLDER}")
    print(f"{'─' * 60}")
    gal_results, gal_failed = upload_folder(GALLERY_DIR, GALLERY_CLOUD_FOLDER)
    if gal_results:
        save_upload_log(gal_results, "galleryImgs")
    total_ok += len(gal_results)
    total_fail += len(gal_failed)

    # --- Tổng kết ---
    print(f"\n{'=' * 60}")
    print(f"  KẾT QUẢ:")
    print(f"  Featured Images : {len(feat_results)} thành công, {len(feat_failed)} thất bại")
    print(f"  Gallery Images  : {len(gal_results)} thành công, {len(gal_failed)} thất bại")
    print(f"  Tổng            : {total_ok} thành công, {total_fail} thất bại")
    print(f"{'=' * 60}")

    if total_fail > 0:
        print(f"\n⚠ Các file upload thất bại:")
        for f in feat_failed + gal_failed:
            print(f"  - {f}")


if __name__ == "__main__":
    main()