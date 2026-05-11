import json
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
import os
import numpy as np

# ---------------------------------------------------------
# 1. CẤU HÌNH & TRỌNG SỐ
# ---------------------------------------------------------
INPUT_INTERACTIONS_FILE = "jsons/__interactions.json"
INPUT_REVIEWS_FILE = "jsons/__reviews_real_vi.json"  # Reviews tiếng Việt thật (explicit feedback)
OUTPUT_FILE = "jsons/__recommendations.json"

# Trọng số Implicit Feedback (Khớp với evaluate.py & recommend.py)
WEIGHT_MAP = {
    "VIEW": 0.5,            # Xem chi tiết (tín hiệu yếu)
    "CLICK_BOOK_NOW": 2.0,  # Intent: Click nút đặt phòng
    "ADD_TO_WISHLIST": 3.0, # Wishlist: Quan tâm rõ ràng
    "RATE_POSITIVE": 4.5,   # Rating >= 4 sao (Explicit positive)
    "BOOK": 5.0,            # Conversion: Tương tác mạnh nhất
    "RATE_NEGATIVE": -3.0,  # Rating <= 2 sao (Explicit negative signal)
}

def load_data():
    """
    Load CẢ 2 nguồn dữ liệu và merge:
    1. __interactions.json (implicit signals từ generate_mock_interactions.py)
    2. __reviews_real_vi.json (explicit ratings từ generate_reviews_from_csv.py)
    
    Logic merge (giống train_svd.py & recommend.py):
    - Implicit signals → weight theo WEIGHT_MAP
    - Explicit ratings (1-5⭐) → GHI ĐÈ implicit nếu cùng (user, hotel) pair
    """
    # Load implicit interactions
    interactions = []
    if os.path.exists(INPUT_INTERACTIONS_FILE):
        with open(INPUT_INTERACTIONS_FILE, "r", encoding="utf-8") as f:
            interactions = json.load(f)
        print(f"   📥 Loaded {len(interactions)} implicit interactions từ {INPUT_INTERACTIONS_FILE}")
    else:
        print(f"❌ Không tìm thấy {INPUT_INTERACTIONS_FILE}")
        return None

    # Load explicit reviews (tiếng Việt thật từ CSV)
    reviews = []
    if os.path.exists(INPUT_REVIEWS_FILE):
        with open(INPUT_REVIEWS_FILE, "r", encoding="utf-8") as f:
            reviews = json.load(f)
        print(f"   📥 Loaded {len(reviews)} explicit reviews từ {INPUT_REVIEWS_FILE}")
    else:
        print(f"   ⚠️ Không tìm thấy {INPUT_REVIEWS_FILE} (sẽ chỉ dùng implicit)")

    # --- MERGE: Tạo unified (userId, hotelId) → score ---
    merged = {}  # key=(userId, hotelId) → {type, weight, source}

    # 1. Implicit signals
    for inter in interactions:
        uid = inter.get("userId")
        hid = inter.get("hotelId")
        itype = inter.get("type")
        if not uid or not hid or itype not in WEIGHT_MAP:
            continue
        key = f"{uid}_{hid}"
        merged[key] = {
            "userId": uid,
            "hotelId": hid,
            "type": itype,
            "weight": WEIGHT_MAP[itype],
            "source": "implicit"
        }

    # 2. Explicit ratings → GHI ĐÈ implicit (explicit takes precedence)
    for rev in reviews:
        uid = rev.get("userId")
        hid = rev.get("hotelId")
        rating = rev.get("rating")
        if not uid or not hid or not rating:
            continue
        key = f"{uid}_{hid}"
        # Explicit rating GHI ĐÈ implicit
        merged[key] = {
            "userId": uid,
            "hotelId": hid,
            "type": "EXPLICIT_RATING",
            "weight": float(rating),
            "source": "explicit"
        }

    # Convert to list (format như __interactions.json để code bên dưới không đổi)
    merged_list = list(merged.values())

    # Stats
    implicit_count = sum(1 for v in merged.values() if v["source"] == "implicit")
    explicit_count = sum(1 for v in merged.values() if v["source"] == "explicit")
    print(f"   ✅ Merged: {len(merged_list)} unique (user, hotel) pairs")
    print(f"      Implicit: {implicit_count} | Explicit (override): {explicit_count}")

    return merged_list

def get_popular_items(df, top_n=5):
    """
    Hàm Fallback: Lấy ra danh sách các khách sạn phổ biến nhất (dựa trên tổng trọng số interaction)
    Dùng cho trường hợp User mới hoặc User có hành vi quá dị biệt.
    """
    popular_items = df.groupby('hotelId')['weight'].sum().sort_values(ascending=False).head(top_n)
    ids = popular_items.index.tolist()
    # Score giả lập cho items phổ biến (từ 0.5 -> 0.4) để phân biệt với items được personalize
    scores = {str(hid): round(0.5 - (i * 0.02), 2) for i, hid in enumerate(ids)}
    return ids, scores

def main():
    print("⏳ Đang xử lý Recommendation Engine...")
    
    data = load_data()
    if not data: return

    # 1. Tạo DataFrame & Tiền xử lý
    df = pd.DataFrame(data)
    
    # Lọc bỏ interaction không hợp lệ
    original_len = len(df)
    df = df[df['hotelId'].notna()] # Bỏ dòng không có hotelId
    
    # Trọng số đã được tính sẵn từ merge logic:
    # - Implicit → WEIGHT_MAP[type]
    # - Explicit → float(rating) (1-5)
    # Chỉ map nếu weight chưa có sẵn (backward compatible với file cũ)
    if 'weight' not in df.columns or df['weight'].isna().all():
        df['weight'] = df['type'].map(WEIGHT_MAP).fillna(1.0)
    else:
        # Fill NaN weight bằng WEIGHT_MAP fallback
        df['weight'] = df['weight'].fillna(df['type'].map(WEIGHT_MAP).fillna(1.0))
    
    print(f"📊 Dữ liệu đầu vào: {len(df)} interactions hợp lệ.")
    print(f"   📊 Weight stats: min={df['weight'].min():.1f}, max={df['weight'].max():.1f}, mean={df['weight'].mean():.2f}")

    # 2. Xây dựng User-Item Matrix
    # index=UserId, columns=HotelId, values=Sum(Weight)
    user_item_matrix = df.pivot_table(index='userId', columns='hotelId', values='weight', aggfunc='sum').fillna(0)
    
    print(f"📐 Kích thước ma trận: {user_item_matrix.shape} (Users x Hotels)")

    # 3. Tính Cosine Similarity (User-User)
    # Chỉ tính khi ma trận đủ lớn
    if user_item_matrix.shape[0] > 1:
        user_similarity = cosine_similarity(user_item_matrix)
        user_sim_df = pd.DataFrame(user_similarity, index=user_item_matrix.index, columns=user_item_matrix.index)
    else:
        print("⚠️ Không đủ user để tính tương đồng. Sẽ dùng fallback toàn bộ.")
        user_sim_df = pd.DataFrame()

    # Chuẩn bị danh sách fallback (Top Popular)
    popular_ids, popular_scores = get_popular_items(df)

    # 4. Hàm tạo gợi ý cá nhân hóa
    def generate_user_recs(user_id, k_neighbors=10, top_n=5):
        # Trường hợp 1: User chưa có trong ma trận (Cold Start) -> Trả về Popular
        if user_id not in user_item_matrix.index:
            return popular_ids, popular_scores

        # Trường hợp 2: Có lịch sử -> Dùng Collaborative Filtering
        # Lấy K user giống nhất (bỏ qua chính mình ở index 0 vì sim=1.0)
        if user_id not in user_sim_df.index:
             return popular_ids, popular_scores
             
        sim_users = user_sim_df[user_id].sort_values(ascending=False).iloc[1:k_neighbors+1]
        
        # Dictionary lưu tổng điểm dự đoán: { hotel_id: total_score }
        item_scores = {}
        # Dictionary lưu tổng độ tương đồng (để chuẩn hóa): { hotel_id: sum_similarity }
        sim_sums = {}

        for neighbor_id, similarity in sim_users.items():
            if similarity <= 0: continue # Bỏ qua nếu không giống hoặc đối nghịch

            # Lấy các item mà hàng xóm đã tương tác (weight > 0)
            neighbor_ratings = user_item_matrix.loc[neighbor_id]
            rated_items = neighbor_ratings[neighbor_ratings > 0].index
            
            for item_id in rated_items:
                # Chỉ gợi ý item mà user hiện tại CHƯA xem/mua (weight == 0)
                if user_item_matrix.loc[user_id, item_id] == 0:
                    # Dự đoán = Similarity * Rating của hàng xóm
                    item_scores[item_id] = item_scores.get(item_id, 0) + (similarity * neighbor_ratings[item_id])
                    sim_sums[item_id] = sim_sums.get(item_id, 0) + similarity

        if not item_scores:
            return popular_ids, popular_scores # Fallback nếu không tìm được gợi ý nào từ hàng xóm

        # Tính điểm trung bình có trọng số & Sort
        final_scores = []
        for item_id, score_sum in item_scores.items():
            # Normalize: Chia cho tổng độ tương đồng để score về thang điểm gốc (gần đúng)
            normalized_score = score_sum / sim_sums[item_id] if sim_sums[item_id] > 0 else 0
            final_scores.append((item_id, normalized_score))
        
        # Sort giảm dần
        final_scores.sort(key=lambda x: x[1], reverse=True)
        top_recs = final_scores[:top_n]

        # Format output
        rec_ids = []
        rec_scores_map = {}
        
        if top_recs:
            # Lấy điểm cao nhất trong danh sách gợi ý này làm chuẩn (100%)
            max_pred = top_recs[0][1] 
            
            for pid, pscore in top_recs:
                # Logic chuẩn hóa tương đối (Relative Normalization):
                # Item cao nhất sẽ có ratio = 1.0. Item thấp hơn sẽ < 1.0.
                ratio = pscore / max_pred if max_pred > 0 else 0
                
                # Scale về khoảng 60% -> 99% để hiển thị lên UI cho đẹp
                # Công thức: 0.6 + (ratio * 0.39)
                display_score = round(0.60 + (ratio * 0.39), 2)
                
                rec_ids.append(int(pid))
                rec_scores_map[str(pid)] = display_score

        return rec_ids, rec_scores_map

    # 5. Chạy Loop cho tất cả User (kể cả những user có trong User List mà chưa có interaction)
    # Để đảm bảo đầy đủ, ta nên lấy list user gốc từ file User (nếu có), ở đây ta lấy từ matrix index
    recommendations_export = []
    
    # Lấy danh sách user duy nhất từ interaction
    all_users = df['userId'].unique()
    
    count = 0
    for uid in all_users:
        ids, scores = generate_user_recs(uid)
        
        recommendations_export.append({
            "userId": uid,
            "hotelIds": ids,
            "score": scores
        })
        count += 1

    # 6. Xuất file
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(recommendations_export, f, ensure_ascii=False, indent=2)

    print(f"✅ Hoàn tất! Đã tạo gợi ý cho {count} users.")
    print(f"💾 File lưu tại: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()