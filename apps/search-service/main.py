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
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from clerk_backend_api import Clerk
from sentence_transformers import SentenceTransformer, util
from pydantic import BaseModel
from typing import List, Dict, Optional
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

# ------------------------------------------------
# TRACKING TIẾN TRÌNH TRAINING (in-memory)
# ------------------------------------------------
training_progress = {
    "is_running": False,
    "progress_pct": 0,          # 0 -> 100
    "current_step": "",         # tên bước đang chạy
    "status_message": "",       # message chi tiết
    "started_at": None,         # ISO datetime
    "finished_at": None,       
    "success": None,            # True / False / None
    "error_message": None,
}

def reset_training_progress():
    training_progress["is_running"] = True
    training_progress["progress_pct"] = 0
    training_progress["current_step"] = "init"
    training_progress["status_message"] = "Đang khởi tạo..."
    training_progress["started_at"] = datetime.now().isoformat()
    training_progress["finished_at"] = None
    training_progress["success"] = None
    training_progress["error_message"] = None

def update_progress(pct: int, step: str, message: str):
    training_progress["progress_pct"] = min(pct, 100)
    training_progress["current_step"] = step
    training_progress["status_message"] = message

def finish_training_progress(success: bool, error_msg: str = None):
    training_progress["is_running"] = False
    training_progress["progress_pct"] = 100 if success else training_progress["progress_pct"]
    training_progress["finished_at"] = datetime.now().isoformat()
    training_progress["success"] = success
    training_progress["error_message"] = error_msg

# =========================================================
# SCHEDULED RETRAIN
# =========================================================

def scheduled_retrain():
    """Called by APScheduler at 3:00 AM daily"""
    print("\n⏰ [CRON] Scheduled SVD retrain started...")
    try:
        from train_real import train_and_save
        train_and_save(progress_callback=None)
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

class CurrentHotelInfo(BaseModel):
    id: int
    title: str
    address: str

class ChatRequest(BaseModel):
    message: str
    user_id: str = "guest"
    history: List[Dict[str, str]] = []
    current_hotel: Optional[CurrentHotelInfo] = None

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
        raise HTTPException(status_code=400, detail="Missing image base64 data")

    # Strip prefix if present (e.g. "data:image/png;base64,")
    if "," in base64_data:
        base64_data = base64_data.split(",")[1]

    try:
        image_bytes = base64.b64decode(base64_data)
        query_vector = get_image_vector(image_bytes)
        return find_top_matches(query_vector, HOTEL_VECTORS)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# B. TÌM KIẾM BẰNG ĐƯỜNG DẪN HÌNH ẢNH (URL - Dùng cho tích hợp)
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
# AI RECOMMENDATION ENDPOINT (used by frontend)
# =========================================================
@app.get("/recommend/{user_id}")
async def get_recommendations(
    user_id: str,
    strategy: str = Query("svd", description="Recommendation strategy: svd, user_cf, item_cf, content, popular"),
    top_k: int = Query(5, description="Number of recommendations to return"),
    destination: Optional[str] = Query(None, description="Session intent destination"),
    confidence: Optional[float] = Query(None, description="Intent confidence score"),
    chip_signal: Optional[str] = Query(None, description="Chip filter signal"),
    force_refresh: bool = Query(False, description="Force cache bypass"),
):
    """
    Get AI-powered hotel recommendations for a user.
    Uses SVD + Content hybrid recommendation engine.
    """
    try:
        print(f"📊 [Recommend] user={user_id} strategy={strategy} top_k={top_k} dest={destination}")
        
        # Build hotels list from vector database
        # Convert HOTEL_VECTORS to the format expected by get_recommendations_for_user
        hotels_for_recommend = []
        for hv in HOTEL_VECTORS:
            hotel_data = {
                "id": hv.get("id"),
                "title": hv.get("title", ""),
                "price": hv.get("price", 0),
                "address": hv.get("address", ""),
                "destination": hv.get("destination", hv.get("city", "")),
                "reviewStar": hv.get("reviewStar", hv.get("rating", 0)),
                "reviewCount": hv.get("reviewCount", 0),
                "slug": hv.get("slug", str(hv.get("id", ""))),
                "image": hv.get("image", hv.get("featuredImage", "")),
                "galleryImgs": hv.get("galleryImgs", []),
                "amenities": hv.get("amenities", []),
                "tags": hv.get("tags", []),
                "suitableFor": hv.get("suitableFor", []),
                "category": hv.get("category", None),
            }
            hotels_for_recommend.append(hotel_data)
        
        # Call the recommendation engine
        results = get_recommendations_for_user(
            user_id=user_id,
            interactions_file_ignored=None,
            hotel_vectors=hotels_for_recommend if hotels_for_recommend else [],
            top_k=top_k,
            strategy=strategy,
            external_destination=destination,
            external_confidence=confidence,
            chip_signal=chip_signal,
        )
        
        # Ensure we always return a list
        if results is None:
            results = []
        
        print(f"📊 [Recommend] Returning {len(results)} recommendations for user={user_id}")
        return results
        
    except Exception as e:
        print(f"❌ [Recommend] Error for user={user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# SIMILAR HOTELS ENDPOINT (used by chat comparison)
# =========================================================
@app.get("/similar/{hotel_id}")
async def get_similar_hotels_api(
    hotel_id: int,
    top_k: int = Query(5, description="Number of similar hotels to return"),
):
    """
    Get similar hotels based on content features.
    """
    try:
        print(f"🔍 [Similar] hotel_id={hotel_id} top_k={top_k}")
        
        hotels_for_recommend = []
        for hv in HOTEL_VECTORS:
            hotel_data = {
                "id": hv.get("id"),
                "title": hv.get("title", ""),
                "price": hv.get("price", 0),
                "address": hv.get("address", ""),
                "destination": hv.get("destination", hv.get("city", "")),
                "reviewStar": hv.get("reviewStar", hv.get("rating", 0)),
                "reviewCount": hv.get("reviewCount", 0),
                "slug": hv.get("slug", str(hv.get("id", ""))),
                "image": hv.get("image", hv.get("featuredImage", "")),
                "galleryImgs": hv.get("galleryImgs", []),
                "amenities": hv.get("amenities", []),
                "tags": hv.get("tags", []),
                "suitableFor": hv.get("suitableFor", []),
                "category": hv.get("category", None),
            }
            hotels_for_recommend.append(hotel_data)
        
        results = get_similar_hotels(
            hotel_id=hotel_id,
            hotels=hotels_for_recommend if hotels_for_recommend else None,
            top_k=top_k,
        )
        
        if results is None:
            results = []
        
        print(f"🔍 [Similar] Returning {len(results)} similar hotels for hotel_id={hotel_id}")
        return results
        
    except Exception as e:
        print(f"❌ [Similar] Error for hotel_id={hotel_id}: {str(e)}")
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
                "message": "Quá trình huấn luyện đang diễn ra. Vui lòng đợi."
            }
        )
    
    def do_retrain_with_progress():
        with retrain_lock:
            reset_training_progress()
            try:
                import traceback
                print("\n🔧 [MANUAL] Force retrain triggered by admin...")
                print("🔧 [DEBUG] Starting training pipeline...")
                
                # --- STEP 1: Kết nối DB ---
                update_progress(5, "connecting_db", "Đang kết nối cơ sở dữ liệu...")
                print("🔧 [DEBUG] Importing train_and_save from train_real...")
                from train_real import train_and_save
                
                # Định nghĩa callback để train_real.py báo progress
                def progress_callback(pct: int, step: str, msg: str):
                    print(f"🔧 [PROGRESS] {pct}% | {step} | {msg}")
                    update_progress(pct, step, msg)
                
                print("🔧 [DEBUG] Calling train_and_save()...")
                train_and_save(progress_callback=progress_callback)
                print("🔧 [DEBUG] train_and_save() completed successfully.")
                
                # --- STEP cuối: Reload model ---
                update_progress(95, "reloading_model", "Đang tải model vào bộ nhớ...")
                print("🔧 [DEBUG] Reloading SVD model into RAM...")
                reload_svd_model()
                print("🔧 [DEBUG] Model reloaded successfully.")
                
                update_progress(100, "completed", "Huấn luyện hoàn tất!")
                finish_training_progress(success=True)
                print("🔧 [MANUAL] Force retrain completed!")
            except Exception as e:
                import traceback
                error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
                print(f"🔧 [MANUAL] Force retrain FAILED: {error_msg}")
                finish_training_progress(success=False, error_msg=error_msg)
                print("🔧 [DEBUG] Full traceback:")
                traceback.print_exc()
    
    background_tasks.add_task(do_retrain_with_progress)
    
    return {
        "status": "started",
        "message": "Quá trình huấn luyện đã bắt đầu chạy ngầm. Kiểm tra lại sau vài phút."
    }


@app.get("/api/admin/ai/training-progress")
async def get_training_progress():
    """
    Endpoint poll tiến trình training real-time.
    Trả về: is_running, progress_pct, current_step, status_message, ...
    """
    return {
        **training_progress,
        "lock_acquired": retrain_lock.locked(),
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