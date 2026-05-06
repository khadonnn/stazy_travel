import os
import json
import base64
import pickle
import torch
import requests
import threading
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from clerk_backend_api import Clerk
from sentence_transformers import SentenceTransformer, util
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime

# Import logic từ các file trong src
from src.embedding import get_image_vector, get_text_vector
from src.search import find_top_matches
from src.recommend import get_recommendations_for_user, get_similar_hotels, algo as recommend_algo
import src.recommend as recommend_module
from agent import run_agent_logic
from bi_agent import run_bi_agent_logic

# 1. CẤU HÌNH HỆ THỐNG
load_dotenv()
port = int(os.getenv("PORT", 8008))

MODEL_PATH = "jsons/recsys_model.pkl"
REPORT_PATH = "jsons/svd_training_report.json"

# =========================================================
# CRONJOB: AUTO-RETRAIN SVD MODEL
# =========================================================
retrain_lock = threading.Lock()

def scheduled_retrain():
    """Called by APScheduler at 3:00 AM daily"""
    print("\n⏰ [CRON] Scheduled SVD retrain started...")
    try:
        from train_svd import main as train_main
        train_main()
        reload_svd_model()
        print("⏰ [CRON] SVD retrain completed successfully!")
    except Exception as e:
        print(f"⏰ [CRON] SVD retrain failed: {e}")

def reload_svd_model():
    """Reload SVD model into RAM after training"""
    global recommend_module
    try:
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, "rb") as f:
                recommend_module.algo = pickle.load(f)
            print("✅ [Reload] SVD model reloaded into RAM.")
        else:
            print("⚠️ [Reload] Model file not found.")
    except Exception as e:
        print(f"❌ [Reload] Failed to reload model: {e}")

# =========================================================
# LIFESPAN: Startup & Shutdown
# =========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    print("🚀 Search Service starting...")
    
    # Start APScheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        scheduler = BackgroundScheduler()
        scheduler.add_job(scheduled_retrain, 'cron', hour=3, minute=0, id='svd_retrain')
        scheduler.start()
        print("✅ APScheduler started. Cron job: daily at 3:00 AM")
    except ImportError:
        print("⚠️ APScheduler not installed. Auto-retrain disabled.")
        print("   Install: uv add apscheduler")
    except Exception as e:
        print(f"⚠️ APScheduler error: {e}")
    
    yield
    
    # --- SHUTDOWN ---
    try:
        scheduler.shutdown()
    except:
        pass
    print("👋 Search Service shutting down...")

app = FastAPI(
    title="Stazy AI Search & Recommend Service",
    lifespan=lifespan
)

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
HOTEL_VECTORS = []
try:
    with open("jsons/__hotel_vectors.json", "r", encoding="utf-8") as f:
        HOTEL_VECTORS = json.load(f)
    print(f"✅ Loaded {len(HOTEL_VECTORS)} hotel vectors into memory.")
except FileNotFoundError:
    print("⚠️ Warning: hotel_vectors.json not found. Search results might be empty.")

class ChatRequest(BaseModel):
    message: str
    user_id: str = "guest"
    history: List[Dict[str, str]] = []

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
async def recommend(user_id: str, strategy: str = "svd", top_k: int = 5):
    """
    Gợi ý dựa trên hành vi tương tác.
    Query params:
      - strategy: svd (default) | user_cf | item_cf | content | popular
      - top_k: số lượng kết quả (default=5)
    """
    try:
        results = get_recommendations_for_user(
            user_id, "mock_interactions.json", HOTEL_VECTORS,
            top_k=top_k, strategy=strategy
        )

        if not results:
            return HOTEL_VECTORS[:top_k]

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation Error: {str(e)}")


# C2. KHÁCH SẠN TƯƠNG TỰ (SIMILAR HOTELS)
@app.get("/similar/{hotel_id}")
async def similar_hotels(hotel_id: int, top_k: int = 5):
    """
    Tìm khách sạn tương tự dựa trên Item-CF similarity.
    Dùng cho trang chi tiết khách sạn.
    """
    try:
        results = get_similar_hotels(hotel_id, HOTEL_VECTORS, top_k=top_k)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similar Hotels Error: {str(e)}")


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

@app.post("/agent/chat")
async def agent_chat(data: ChatRequest):
    """
    Endpoint xử lý chat thông minh.
    Input: { "message": "...", "user_id": "..." }
    """
    if not data.message:
        raise HTTPException(status_code=400, detail="Missing message")

    try:
        print(f"📩 Chat request from {data.user_id}: {data.message}")
        
        # ✅ SỬA LỖI Ở ĐÂY: Gọi hàm run_agent_logic thay vì analyze_user_query
        response_data = run_agent_logic(data.message, data.user_id)
        
        return response_data

    except Exception as e:
        print(f"❌ Agent Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# ADMIN ENDPOINTS
# =========================================================

@app.get("/api/admin/ai/status")
async def ai_status():
    """
    Đọc SVD training report và trả về trạng thái model hiện tại.
    """
    try:
        if not os.path.exists(REPORT_PATH):
            return {
                "status": "no_report",
                "message": "Chưa có báo cáo训练. Hãy chạy train_svd.py trước.",
                "model_loaded": recommend_module.algo is not None
            }
        
        with open(REPORT_PATH, "r", encoding="utf-8") as f:
            report = json.load(f)
        
        return {
            "status": "ready",
            "model_loaded": recommend_module.algo is not None,
            "last_trained": report.get("timestamp"),
            "model_type": report.get("model_type"),
            "best_params": report.get("best_params"),
            "data_stats": report.get("data_stats"),
            "evaluation": report.get("evaluation"),
            "model_file_exists": os.path.exists(MODEL_PATH),
            "model_file_size_mb": round(os.path.getsize(MODEL_PATH) / 1024 / 1024, 2) if os.path.exists(MODEL_PATH) else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading status: {str(e)}")


@app.post("/api/admin/ai/force-retrain")
async def force_retrain(background_tasks: BackgroundTasks):
    """
    Kích hoạt train SVD thủ công qua BackgroundTasks (không block request).
    """
    if retrain_lock.locked():
        return JSONResponse(
            status_code=202,
            content={
                "status": "already_running",
                "message": "Quá trình训练 đang diễn ra. Vui lòng đợi."
            }
        )
    
    def do_retrain():
        with retrain_lock:
            try:
                print("\n🔧 [MANUAL] Force retrain triggered by admin...")
                from train_svd import main as train_main
                train_main()
                reload_svd_model()
                print("🔧 [MANUAL] Force retrain completed!")
            except Exception as e:
                print(f"🔧 [MANUAL] Force retrain failed: {e}")
    
    background_tasks.add_task(do_retrain)
    
    return {
        "status": "started",
        "message": "Quá trình huấn luyện đã bắt đầu chạy ngầm. Kiểm tra lại sau vài phút."
    }


class AdminChatRequest(BaseModel):
    message: str


@app.post("/api/admin/chat")
async def admin_chat(data: AdminChatRequest):
    """
    BI Agent chat endpoint cho Admin Dashboard.
    Nhận message và trả về BI insights với data cho biểu đồ.
    """
    if not data.message:
        raise HTTPException(status_code=400, detail="Missing message")

    try:
        print(f"📊 [Admin BI] Request: {data.message}")
        response = run_bi_agent_logic(data.message, user_id="admin")
        return response
    except Exception as e:
        print(f"❌ [Admin BI] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
