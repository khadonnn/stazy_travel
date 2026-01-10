# train_real.py
import os
import pandas as pd
import pickle
from sqlalchemy import create_engine
from surprise import Dataset, Reader, SVD
from surprise.model_selection import train_test_split

# 1. Kết nối Database (Thay URL của bạn vào)
# Lưu ý: Cần cài thư viện: uv pip install sqlalchemy psycopg2-binary
DB_URL = os.getenv("DATABASE_URL", "postgresql://admin:123456@localhost:5432/products")

def train_and_save():
    print("⏳ Đang kết nối Database để lấy dữ liệu Interaction...")
    engine = create_engine(DB_URL)
    
    # Chỉ lấy các hành động có thể quy đổi ra điểm số (VIEW, LIKE, BOOK)
    query = """
    SELECT "userId", "hotelId", "type", "rating" 
    FROM "Interaction"
    """
    df = pd.read_sql(query, engine)

    if df.empty:
        print("⚠️ Chưa có dữ liệu interaction nào. Hãy click trên web trước!")
        return

    print(f"📊 Đã tải {len(df)} dòng dữ liệu.")

    # 2. Quy đổi hành vi thành điểm số (Implicit Feedback)
    # Ví dụ: VIEW = 1 điểm, LIKE = 3 điểm, BOOK = 5 điểm, RATING thì lấy rating thật
    def calculate_score(row):
        if row['rating']: return row['rating'] # Nếu có rating thì dùng luôn
        if row['type'] == 'BOOK': return 5
        if row['type'] == 'CLICK_BOOK_NOW': return 4
        if row['type'] == 'LIKE': return 3
        if row['type'] == 'VIEW': return 1
        return 1

    df['score'] = df.apply(calculate_score, axis=1)

    # 3. Train Model
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(df[['userId', 'hotelId', 'score']], reader)
    trainset = data.build_full_trainset()
    
    algo = SVD()
    algo.fit(trainset)
    print("✅ Train xong Model SVD.")

    # 4. Lưu Model ra file (để main.py dùng)
    with open("jsons/recsys_model.pkl", "wb") as f:
        pickle.dump(algo, f)
    
    print("💾 Đã lưu model vào jsons/recsys_model.pkl")

if __name__ == "__main__":
    train_and_save()