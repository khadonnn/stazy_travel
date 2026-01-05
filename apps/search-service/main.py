import os
import json
import base64
import torch
import requests
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from clerk_backend_api import Clerk
from sentence_transformers import SentenceTransformer, util

# Import logic từ các file trong src
from src.embedding import get_image_vector, get_text_vector
from src.search import find_top_matches
from src.recommend import get_recommendations_for_user

# 1. CẤU HÌNH HỆ THỐNG
load_dotenv()
port = int(os.getenv("PORT", 8008))

app = FastAPI(title="Stazy AI Search & Recommend Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. KHỞI TẠO AI MODEL & CLERK
print("--- Loading AI Model (CLIP-ViT-B-32) ---")
model = SentenceTransformer("clip-ViT-B-32")

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "your_sk_here")
clerk_client = Clerk(bearer_auth=CLERK_SECRET_KEY)

# 3. LOAD DATABASE VECTOR VÀO RAM
# File này nên được tạo trước bằng script xử lý ảnh
HOTEL_VECTORS = []
try:
    with open("jsons/__hotel_vectors.json", "r", encoding="utf-8") as f:
        HOTEL_VECTORS = json.load(f)
    print(f"✅ Loaded {len(HOTEL_VECTORS)} hotel vectors into memory.")
except FileNotFoundError:
    print("⚠️ Warning: hotel_vectors.json not found. Search results might be empty.")

# --- ENDPOINTS ---


@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Stazy Search Service",
        "vectors_loaded": len(HOTEL_VECTORS),
    }


# A. TÌM KIẾM BẰNG HÌNH ẢNH (BASE64 - Dùng cho Kéo/Thả)
@app.post("/search-by-base64")
async def search_base64(data: dict):
    """
    Nhận: { "image": "data:image/png;base64,..." }
    """
    base64_data = data.get("image")
    if not base64_data:
        raise HTTPException(status_code=400, detail="Missing image data")

    try:
        # Giải mã Base64
        if "," in base64_data:
            base64_str = base64_data.split(",")[1]
        else:
            base64_str = base64_data

        img_bytes = base64.b64decode(base64_str)
        img = Image.open(BytesIO(img_bytes)).convert("RGB")

        # AI trích xuất vector
        query_vector = model.encode(img)

        # Tìm kiếm tương đồng
        return find_top_matches(query_vector, HOTEL_VECTORS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")


# B. TÌM KIẾM BẰNG MÔ TẢ VĂN BẢN
@app.post("/search-by-text")
async def search_text(data: dict):
    """
    Nhận: { "description": "villa ven biển có hồ bơi" }
    """
    description = data.get("description")
    if not description:
        raise HTTPException(status_code=400, detail="Missing description")

    try:
        query_vector = get_text_vector(description)
        return find_top_matches(query_vector, HOTEL_VECTORS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# C. GỢI Ý KHÁCH SẠN CHO NGƯỜI DÙNG (RECOMMENDATION)
@app.get("/recommend/{user_id}")
async def recommend(user_id: str):
    """
    Gợi ý dựa trên hành vi tương tác trong file mock_interactions.json
    """
    try:
        results = get_recommendations_for_user(
            user_id, "mock_interactions.json", HOTEL_VECTORS
        )

        # Nếu là User mới (không có lịch sử), trả về top khách sạn mặc định
        if not results:
            return HOTEL_VECTORS[:5]

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation Error: {str(e)}")


# D. TÌM KIẾM BẰNG URL ẢNH (Nếu cần)
@app.post("/search-by-image-url")
async def search_url(data: dict):
    url = data.get("image_url")
    if not url:
        raise HTTPException(status_code=400, detail="Missing image URL")
    try:
        query_vector = get_image_vector(url)
        return find_top_matches(query_vector, HOTEL_VECTORS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
