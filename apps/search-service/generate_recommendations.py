import json
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
import os
import numpy as np

# ---------------------------------------------------------
# CẤU HÌNH
# ---------------------------------------------------------
INPUT_FILE = "jsons/__interactions.json"
OUTPUT_FILE = "jsons/__recommendations.json"

# Định nghĩa trọng số (Implicit Feedback Score) khớp với luận văn
WEIGHT_MAP = {
    # --- Tín hiệu ngữ cảnh (Yếu) ---
    "SEARCH_QUERY": 0.5,    
    "FILTER_APPLIED": 0.5,  

    # --- Tín hiệu quan tâm (Tăng dần) ---
    "VIEW": 1.0,            
    "SHARE": 2.0,           
    "LIKE": 3.0,            
    
    # --- Tín hiệu ý định mua (Cao) ---
    "CLICK_BOOK_NOW": 4.0,  
    "BOOK": 5.0,            
    
    # --- Tín hiệu cam kết sau mua ---
    "RATING": 6.0,          # Trọng số cao nhất vì đã trải nghiệm thực tế

    # --- Tín hiệu tiêu cực ---
    "CANCEL": -5.0          # Phạt nặng để loại bỏ khỏi danh sách quan tâm
}

def main():
    print("⏳ Đang đọc dữ liệu tương tác...")
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Không tìm thấy file {INPUT_FILE}. Hãy chạy generate_interactions.py trước.")
        return

    # 1. Đọc dữ liệu
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not data:
        print("❌ File interaction rỗng!")
        return

    # 2. Tiền xử lý
    df = pd.DataFrame(data)
    
    # BƯỚC QUAN TRỌNG: Loại bỏ các tương tác không gắn với Hotel cụ thể
    # (Ví dụ: SEARCH_QUERY, FILTER_APPLIED thường có hotelId = null)
    # Collaborative Filtering bắt buộc phải có Item ID.
    original_len = len(df)
    df = df[df['hotelId'].notna()]
    print(f"🧹 Đã lọc bỏ {original_len - len(df)} dòng (Search/Filter không có hotelId).")
    
    # Map loại hành động sang điểm số
    df['weight'] = df['type'].map(WEIGHT_MAP).fillna(1)

    print(f"📊 Dữ liệu sạch: {len(df)} dòng. Đang tạo User-Item Matrix...")

    # 3. Tạo Ma trận User-Item
    # Rows: User, Cols: Hotel, Values: Tổng trọng số (Sum)
    # Logic: VIEW(1) + LIKE(3) = 4. 
    # Logic: BOOK(5) + CANCEL(-5) = 0 (Không gợi ý nữa).
    user_item_matrix = df.pivot_table(index='userId', columns='hotelId', values='weight', aggfunc='sum').fillna(0)

    # 4. Tính độ tương đồng (Collaborative Filtering - User Based)
    print("🧮 Đang tính Cosine Similarity...")
    
    # Chỉ tính nếu ma trận không rỗng
    if user_item_matrix.shape[0] == 0 or user_item_matrix.shape[1] == 0:
        print("⚠️ Ma trận rỗng, không thể tính toán.")
        return

    user_similarity = cosine_similarity(user_item_matrix)
    user_sim_df = pd.DataFrame(user_similarity, index=user_item_matrix.index, columns=user_item_matrix.index)

    # Hàm lấy gợi ý cho 1 user
    def get_recommendations(user_id, top_n=5):
        if user_id not in user_item_matrix.index:
            return None

        # Lấy 10 người giống user này nhất (bỏ qua chính mình)
        # Sắp xếp giảm dần độ tương đồng
        sim_users = user_sim_df[user_id].sort_values(ascending=False).iloc[1:11]
        
        recommended_hotels = {} # { hotel_id: predicted_score }
        
        for similar_user, similarity_score in sim_users.items():
            # Nếu độ tương đồng quá thấp thì bỏ qua để tránh nhiễu
            if similarity_score < 0.1: continue

            # Lấy lịch sử của người "hàng xóm"
            neighbor_history = user_item_matrix.loc[similar_user]
            
            # Chỉ xét những hotel mà hàng xóm có tương tác TÍCH CỰC (score > 0)
            # Nếu hàng xóm Cancel (score <= 0) thì không gợi ý
            liked_hotels = neighbor_history[neighbor_history > 0].index.tolist()
            
            for hotel in liked_hotels:
                # Chỉ gợi ý những hotel mà User hiện tại CHƯA tương tác (hoặc tương tác = 0)
                if user_item_matrix.loc[user_id, hotel] == 0:
                    # Công thức: Score = Độ giống nhau * Điểm hứng thú của hàng xóm
                    score = similarity_score * neighbor_history[hotel]
                    recommended_hotels[hotel] = recommended_hotels.get(hotel, 0) + score

        if not recommended_hotels:
            return None

        # Sort lấy top N điểm cao nhất
        sorted_recs = sorted(recommended_hotels.items(), key=lambda x: x[1], reverse=True)[:top_n]
        
        # Normalize score (chia cho max score để ra %)
        max_score = sorted_recs[0][1] if sorted_recs else 1
        
        result_ids = []
        result_scores = {}
        
        for hotel_id, raw_score in sorted_recs:
            # Trick: Chuyển raw score thành % đẹp mắt (0.6 -> 0.99) để hiển thị UI
            # Không dùng raw_score trực tiếp vì nó phụ thuộc vào độ lớn matrix
            final_score = round((raw_score / max_score) * 0.4 + 0.55, 2) # Range từ 0.55 đến 0.95
            
            # Ép kiểu int cho ID để khớp Prisma
            result_ids.append(int(hotel_id))
            result_scores[str(hotel_id)] = final_score
            
        return result_ids, result_scores

    # 5. Chạy gợi ý cho toàn bộ user
    print("🚀 Đang tạo danh sách gợi ý...")
    recommendations_export = []

    count = 0
    for user_id in user_item_matrix.index:
        res = get_recommendations(user_id)
        if res:
            ids, scores = res
            recommendations_export.append({
                "userId": user_id,
                "hotelIds": ids,
                "score": scores 
            })
            count += 1

    # 6. Lưu file
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(recommendations_export, f, ensure_ascii=False, indent=2)

    print(f"✅ Hoàn tất! Đã tạo gợi ý cho {count} users. Lưu tại: '{OUTPUT_FILE}'")

if __name__ == "__main__":
    main()