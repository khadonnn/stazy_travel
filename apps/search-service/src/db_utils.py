# src/db_utils.py
import os
from sqlalchemy import create_engine, text

# Lấy URL từ biến môi trường (nhớ cấu hình trong .env)
DB_URL = os.getenv("DATABASE_URL", "postgresql://admin:123456@localhost:5432/products")
engine = create_engine(DB_URL)

def get_user_interested_categories(user_id: str):
    """
    Kết nối DB để lấy danh sách category user đã chọn lúc Onboarding
    """
    try:
        query = text("""
            SELECT "interestedCategories" 
            FROM "UserPreference" 
            WHERE "userId" = :uid
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query, {"uid": user_id}).fetchone()
            
            if result and result[0]:
                # result[0] là mảng String[] trong Postgres, Python sẽ hiểu là list
                return result[0] 
            return []
    except Exception as e:
        print(f"⚠️ Lỗi đọc DB: {e}")
        return []