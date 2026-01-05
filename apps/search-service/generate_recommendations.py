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

# Định nghĩa trọng số cho các hành động (Khớp logic toàn hệ thống)
WEIGHT_MAP = {
    "VIEW": 1,            # Xem: Thể hiện sự tò mò
    "SHARE": 2,           # Share: Thể hiện sự quan tâm
    "LIKE": 3,            # Like: Thích thú
    "CLICK_BOOK_NOW": 4,  # Ý định mua cao
    "BOOK": 5,            # Đã mua: Tương tác mạnh nhất
    "SEARCH_QUERY": 0.5   # Tìm kiếm: Tín hiệu yếu
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

    # 2. Tiền xử lý (Map Type -> Weight)
    df = pd.DataFrame(data)
    
    # Map loại hành động sang điểm số
    # Nếu type không có trong map, mặc định là 1
    df['weight'] = df['type'].map(WEIGHT_MAP).fillna(1)

    print(f"📊 Dữ liệu: {len(df)} tương tác. Đang tạo User-Item Matrix...")

    # 3. Tạo Ma trận User-Item
    # Rows: User, Cols: Hotel, Values: Tổng trọng số (Sum)
    # Ví dụ: Xem (1) + Like (3) = 4 điểm cho hotel đó
    user_item_matrix = df.pivot_table(index='userId', columns='hotelId', values='weight', aggfunc='sum').fillna(0)

    # 4. Tính độ tương đồng (Collaborative Filtering - User Based)
    print("🧮 Đang tính Cosine Similarity...")
    # Tính ma trận tương đồng giữa các User
    user_similarity = cosine_similarity(user_item_matrix)
    user_sim_df = pd.DataFrame(user_similarity, index=user_item_matrix.index, columns=user_item_matrix.index)

    # Hàm lấy gợi ý cho 1 user
    def get_recommendations(user_id, top_n=5):
        if user_id not in user_item_matrix.index:
            return None

        # Lấy 10 người giống user này nhất (bỏ qua chính mình)
        sim_users = user_sim_df[user_id].sort_values(ascending=False).iloc[1:11]
        
        recommended_hotels = {} # { hotel_id: predicted_score }
        
        for similar_user, similarity_score in sim_users.items():
            # Lấy lịch sử của người "hàng xóm"
            neighbor_history = user_item_matrix.loc[similar_user]
            # Lấy những hotel mà hàng xóm đã tương tác (score > 0)
            liked_hotels = neighbor_history[neighbor_history > 0].index.tolist()
            
            for hotel in liked_hotels:
                # Chỉ gợi ý những hotel mà User hiện tại CHƯA xem/tương tác
                if user_item_matrix.loc[user_id, hotel] == 0:
                    # Công thức: Score = Độ giống nhau * Điểm hứng thú của hàng xóm
                    score = similarity_score * neighbor_history[hotel]
                    recommended_hotels[hotel] = recommended_hotels.get(hotel, 0) + score

        # Chuẩn hóa điểm số về thang 0.0 -> 1.0 (cho đẹp UI: 98% Match)
        if not recommended_hotels:
            return None

        # Sort lấy top N
        sorted_recs = sorted(recommended_hotels.items(), key=lambda x: x[1], reverse=True)[:top_n]
        
        # Normalize score (chia cho max score để ra %)
        max_score = sorted_recs[0][1] if sorted_recs else 1
        
        result_ids = []
        result_scores = {}
        
        for hotel_id, raw_score in sorted_recs:
            final_score = round((raw_score / max_score) * 0.95 + 0.04, 2) # Trick để score đẹp (0.05 -> 0.99)
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
                "score": scores # Output thêm cái này để Frontend hiển thị "98% phù hợp"
            })
            count += 1

    # 6. Lưu file
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(recommendations_export, f, ensure_ascii=False, indent=2)

    print(f"✅ Hoàn tất! Đã tạo gợi ý cho {count} users. Lưu tại: '{OUTPUT_FILE}'")

if __name__ == "__main__":
    main()