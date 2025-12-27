import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import create_engine
import numpy as np

# 1. Kết nối Database (Thay URL của bạn vào)
# Cấu trúc: postgresql://user:pass@localhost:5432/db_name
db_url = "postgresql://postgres:123456@localhost:5432/products"
engine = create_engine(db_url)

print("⏳ Đang tải dữ liệu tương tác...")

# 2. Đọc bảng interactions
df = pd.read_sql("SELECT * FROM interactions", engine)

if df.empty:
    print("❌ Chưa có dữ liệu tương tác nào!")
    exit()

# 3. Tạo Ma trận User-Item (Pivot Table)
# Hàng là User, Cột là Hotel, Giá trị là tổng điểm (weight)
user_item_matrix = df.pivot_table(index='userId', columns='hotelId', values='weight', aggfunc='sum').fillna(0)

print(f"✅ Ma trận: {user_item_matrix.shape[0]} users x {user_item_matrix.shape[1]} hotels")

# 4. Tính độ tương đồng giữa các User (User-Based Collaborative Filtering)
# "Tìm những người có gu giống user A"
user_similarity = cosine_similarity(user_item_matrix)
user_sim_df = pd.DataFrame(user_similarity, index=user_item_matrix.index, columns=user_item_matrix.index)

def get_recommendations(user_id, top_n=5):
    if user_id not in user_item_matrix.index:
        return []

    # Lấy các user giống user này nhất (trừ chính nó)
    sim_users = user_sim_df[user_id].sort_values(ascending=False).iloc[1:11] # Top 10 người giống nhất
    
    # Lấy các khách sạn mà những người giống này đã thích
    recommended_hotels = {}
    
    for similar_user, score in sim_users.items():
        # Lấy lịch sử của người giống đó
        their_history = user_item_matrix.loc[similar_user]
        
        # Chỉ lấy những khách sạn họ đã tương tác (>0)
        liked_hotels = their_history[their_history > 0].index.tolist()
        
        for hotel in liked_hotels:
            # Nếu user hiện tại chưa xem khách sạn này -> Gợi ý
            if user_item_matrix.loc[user_id, hotel] == 0:
                recommended_hotels[hotel] = recommended_hotels.get(hotel, 0) + score

    # Sắp xếp theo điểm số gợi ý cao nhất
    sorted_recs = sorted(recommended_hotels.items(), key=lambda x: x[1], reverse=True)
    return [hotel_id for hotel_id, score in sorted_recs[:top_n]]

# 5. Chạy gợi ý cho TẤT CẢ user và lưu vào DB
print("🚀 Đang tính toán gợi ý...")
recommendations_data = []

for user_id in user_item_matrix.index:
    recs = get_recommendations(user_id)
    if recs:
        # Chuẩn bị data để insert
        recommendations_data.append({
            "userId": user_id,
            "hotelIds": recs, # Array Integer
            "updatedAt": pd.Timestamp.now()
        })
        print(f" -> User {user_id}: Gợi ý {recs}")

# 6. Lưu ngược lại vào PostgreSQL (Bảng Recommendation)
# Dùng to_sql của pandas hoặc thư viện ORM tùy bạn, đây là cách đơn giản dùng loop sql raw hoặc trick pandas
if recommendations_data:
    # Xoá gợi ý cũ
    with engine.connect() as con:
        con.execute("TRUNCATE TABLE recommendations")
        
    # Lưu cái mới
    rec_df = pd.DataFrame(recommendations_data)
    # Lưu ý: Postgres Array cần xử lý chút nếu dùng to_sql thuần, 
    # nhưng để đơn giản cho demo, bạn có thể loop insert
    print("💾 Đang lưu vào Database...")
    
    # Cách lưu nhanh (giả lập):
    # Thực tế bạn nên dùng Prisma client trong JS để lưu thì an toàn hơn về type array
    # Hoặc convert list sang string kiểu '{1,2,3}' để Postgres hiểu
    rec_df['hotelIds'] = rec_df['hotelIds'].apply(lambda x: "{" + ",".join(map(str, x)) + "}")
    rec_df.to_sql('recommendations', engine, if_exists='append', index=False, dtype=None)

print("✅ Hoàn tất Collaborative Filtering!")