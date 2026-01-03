import json
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
import os

# Đường dẫn file
INPUT_FILE = "jsons/__mock_interactions.json"
OUTPUT_FILE = "jsons/__recommendations.json"

def main():
    print("⏳ Đang đọc dữ liệu từ file JSON...")
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Không tìm thấy file {INPUT_FILE}")
        return

    # 1. Đọc dữ liệu từ JSON
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not data:
        print("❌ File interaction rỗng!")
        return

    # Chuyển sang DataFrame
    df = pd.DataFrame(data)
    
    # Lưu ý: Trong file mock_interactions.json của bạn dùng 'stayId', nhưng logic cần 'hotelId'
    # Map lại tên cột cho chuẩn
    if 'stayId' in df.columns:
        df = df.rename(columns={'stayId': 'hotelId'})

    # 2. Tạo Ma trận User-Item
    print("📊 Đang tạo Pivot Table...")
    user_item_matrix = df.pivot_table(index='userId', columns='hotelId', values='weight', aggfunc='sum').fillna(0)

    # 3. Tính độ tương đồng (Collaborative Filtering)
    print("🧮 Đang tính Cosine Similarity...")
    user_similarity = cosine_similarity(user_item_matrix)
    user_sim_df = pd.DataFrame(user_similarity, index=user_item_matrix.index, columns=user_item_matrix.index)

    # Hàm lấy gợi ý cho 1 user
    def get_recommendations(user_id, top_n=5):
        if user_id not in user_item_matrix.index:
            return []

        # Lấy 10 người giống nhất (bỏ qua chính mình)
        sim_users = user_sim_df[user_id].sort_values(ascending=False).iloc[1:11]
        
        recommended_hotels = {}
        
        for similar_user, score in sim_users.items():
            # Lịch sử của người giống mình
            their_history = user_item_matrix.loc[similar_user]
            liked_hotels = their_history[their_history > 0].index.tolist()
            
            for hotel in liked_hotels:
                # Chỉ gợi ý khách sạn mình CHƯA xem
                if user_item_matrix.loc[user_id, hotel] == 0:
                    # Score = độ giống nhau * điểm họ đánh giá (đơn giản hóa)
                    recommended_hotels[hotel] = recommended_hotels.get(hotel, 0) + score

        # Sort lấy top N
        sorted_recs = sorted(recommended_hotels.items(), key=lambda x: x[1], reverse=True)
        return [int(hotel_id) for hotel_id, score in sorted_recs[:top_n]]

    # 4. Chạy vòng lặp tạo data
    print("🚀 Đang tạo danh sách gợi ý...")
    recommendations_export = []

    for user_id in user_item_matrix.index:
        recs = get_recommendations(user_id)
        if recs:
            recommendations_export.append({
                "userId": user_id,
                "hotelIds": recs
            })

    # 5. Lưu ra file JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(recommendations_export, f, ensure_ascii=False, indent=2)

    print(f"✅ Hoàn tất! Đã lưu {len(recommendations_export)} gợi ý vào '{OUTPUT_FILE}'")

if __name__ == "__main__":
    main()