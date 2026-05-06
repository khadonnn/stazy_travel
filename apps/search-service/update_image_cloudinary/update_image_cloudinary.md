Đã cập nhật `download_images.py` với 2 bước:

**Bước 1:** Lấy URL từ Cloudinary → lưu vào `jsons/featuredImage.json` & `jsons/galleryImgs.json` **Bước 2:** Tải ảnh từ URL trong JSON → lưu vào `downloads/featuredImage/` & `downloads/galleryImgs/`

**Quy trình hoàn chỉnh (3 script):**

1. `python download_images.py` — Lấy URL từ Cloudinary về `jsons/` + Tải ảnh về `downloads/`
2. `python upload_images.py` — Upload ảnh từ `downloads/` lên Cloudinary (giữ nguyên tên, đúng folder)
3. `python get_images.py` — Lấy lại URL mới từ Cloudinary về `jsons/`

**Cấu trúc output:**

```javascript
update_image_cloudinary/
├── jsons/
│   ├── featuredImage.json    ← URL Cloudinary grouped by location
│   └── galleryImgs.json      ← URL Cloudinary grouped by location
├── downloads/
│   ├── featuredImage/        ← Ảnh tải về
│   └── galleryImgs/          ← Ảnh tải về
├── download_images.py
├── upload_images.py
└── get_images.py
```
