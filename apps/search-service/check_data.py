import os
import pandas as pd
from sqlalchemy import create_engine

# URL Database của bạn
DB_URL = "postgresql://admin:123456@localhost:5432/products" 

def check_stats():
    engine = create_engine(DB_URL)
    
    print("--- 📊 THỐNG KÊ DỮ LIỆU TƯƠNG TÁC ---")
    
    # 1. Đếm tổng số dòng
    count_query = 'SELECT COUNT(*) FROM "Interaction"'
    total = pd.read_sql(count_query, engine).iloc[0,0]
    print(f"Tổng số tương tác: {total}")
    
    if total == 0:
        return

    # 2. Thống kê theo Loại hành động
    type_query = """
    SELECT "type", COUNT(*) as count 
    FROM "Interaction" 
    GROUP BY "type"
    """
    df_type = pd.read_sql(type_query, engine)
    print("\n--- Số lượng theo loại ---")
    print(df_type)

    # 3. Xem 5 dòng mới nhất kèm Tên User và Tên Hotel
    # Lưu ý: Cần join bảng User và Hotel. Giả sử bảng tên là "User" và "Hotel"
    detail_query = """
    SELECT 
        i."createdAt", 
        u."name" as "User Name", 
        h."name" as "Hotel Name", 
        i."type"
    FROM "Interaction" i
    JOIN "User" u ON i."userId" = u.id
    JOIN "Hotel" h ON i."hotelId" = h.id
    ORDER BY i."createdAt" DESC
    LIMIT 5
    """
    try:
        df_detail = pd.read_sql(detail_query, engine)
        print("\n--- 5 Hoạt động mới nhất ---")
        print(df_detail)
    except Exception as e:
        print("\n(Không thể lấy chi tiết tên User/Hotel do chưa khớp tên bảng, xem raw ID bên dưới)")
        print(pd.read_sql('SELECT * FROM "Interaction" ORDER BY "timestamp" DESC LIMIT 5', engine))

if __name__ == "__main__":
    check_stats()