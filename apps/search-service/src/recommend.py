# src/recommend.py
import os
import pickle
import random
from src.db_utils import get_user_interested_categories # Import hàm vừa tạo ở Bước 2

MODEL_PATH = "jsons/recsys_model.pkl"
algo = None

# Load Model
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            algo = pickle.load(f)
        print("✅ [Recommend] Đã load Model SVD.")
    except Exception as e:
        print(f"❌ [Recommend] Lỗi model: {e}")

def get_recommendations_for_user(user_id: str, interactions_file_ignored, hotel_vectors: list, top_k=5):
    try:
        # --- BƯỚC 1: KIỂM TRA XEM CÓ DÙNG ĐƯỢC AI KHÔNG? ---
        use_ai = False
        if algo:
            try:
                # Kiểm tra user có trong tập train không
                algo.trainset.to_inner_uid(user_id)
                use_ai = True
            except ValueError:
                use_ai = False

        # --- BƯỚC 2: NẾU LÀ USER CŨ (CÓ MODEL) -> DÙNG SVD ---
        if use_ai:
            print(f"🤖 User {user_id} là người cũ -> Dùng AI SVD.")
            predictions = []
            for hotel in hotel_vectors:
                pred = algo.predict(user_id, hotel.get("id"))
                predictions.append({"data": hotel, "score": pred.est})
            
            predictions.sort(key=lambda x: x["score"], reverse=True)
            return [p["data"] for p in predictions[:top_k]]

        # --- BƯỚC 3: NẾU LÀ USER MỚI -> DÙNG CATEGORY (ONBOARDING) ---
        print(f"👶 User {user_id} là người mới -> Check Onboarding.")
        
        # Gọi xuống DB lấy danh sách user đã chọn (VD: ['resort', 'bien'])
        interested_cats = get_user_interested_categories(user_id)
        
        if interested_cats:
            print(f"🎯 User thích: {interested_cats}")
            # Lọc các khách sạn có category hoặc tags trùng với sở thích
            filtered_hotels = [
                h for h in hotel_vectors 
                if (h.get('category') in interested_cats) or 
                   (h.get('slug') in interested_cats) or
                   (any(tag in interested_cats for tag in h.get('tags', [])))
            ]
            
            # Nếu tìm thấy khách sạn phù hợp -> Trả về (Shuffle cho tự nhiên)
            if filtered_hotels:
                return random.sample(filtered_hotels, min(top_k, len(filtered_hotels)))
        
        # --- BƯỚC 4: FALLBACK (KHÔNG AI, KHÔNG CHỌN GÌ) -> RANDOM ---
        print("🎲 User chưa chọn gì -> Random.")
        return random.sample(hotel_vectors, min(top_k, len(hotel_vectors)))

    except Exception as e:
        print(f"❌ Error: {e}")
        return random.sample(hotel_vectors, min(top_k, len(hotel_vectors)))