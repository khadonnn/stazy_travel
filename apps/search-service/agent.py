import os
import json
import psycopg2
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from groq import Groq
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# 1. CẤU HÌNH
load_dotenv()

# Kết nối Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("⚠️ Warning: Missing GROQ_API_KEY in .env")

client = Groq(api_key=GROQ_API_KEY)

# Load Model Embedding (Dùng để chuyển text user thành vector)
# Lưu ý: Model này phải GIỐNG model bạn đã dùng để tạo vector trong database (seed)
# Khuyên dùng: 'distiluse-base-multilingual-cased-v1' hoặc 'sentence-transformers/clip-ViT-B-32-multilingual-v1'
print("⏳ Loading Embedding Model for Agent...")
embed_model = SentenceTransformer("distiluse-base-multilingual-cased-v1")

# Kết nối Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stazy_db")

# ---------------------------------------------------------
# 2. ĐỊNH NGHĨA DATA MODEL (STRUCTURAL OUTPUT)
# ---------------------------------------------------------
class DateRange(BaseModel):
    start: Optional[str] = Field(None, description="Ngày bắt đầu (YYYY-MM-DD)")
    end: Optional[str] = Field(None, description="Ngày kết thúc (YYYY-MM-DD)")

class BookingIntent(BaseModel):
    intent_type: str = Field(..., description="Loại ý định: 'SEARCH' (tìm phòng), 'BOOK' (đặt phòng), 'RECOMMEND' (gợi ý), 'CHAT' (hỏi đáp thường)")
    dates: Optional[DateRange] = Field(None, description="Khoảng thời gian")
    location: Optional[str] = Field(None, description="Địa điểm, thành phố (VD: Đà Lạt, Nha Trang)")
    price_max: Optional[int] = Field(None, description="Ngân sách tối đa (VND)")
    guests_adults: Optional[int] = Field(2, description="Số người lớn")
    guests_children: Optional[int] = Field(0, description="Số trẻ em")
    semantic_query: Optional[str] = Field(None, description="Từ khóa mô tả cảm xúc/không gian để search vector (VD: chill, yên tĩnh, view biển)")

# ---------------------------------------------------------
# 3. CÁC HÀM HỖ TRỢ (HELPER FUNCTIONS)
# ---------------------------------------------------------
def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def create_booking_link(slug_or_id, dates: Optional[DateRange], adults=2):
    if dates and dates.start:
        start_str = dates.start
    else:
        start_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    # 🔥 Tự động tính ngày về = ngày đi + 1 nếu thiếu
    if dates and dates.end:
        end_str = dates.end
    else:
        try:
            s_date = datetime.strptime(start_str, "%Y-%m-%d")
            end_str = (s_date + timedelta(days=1)).strftime("%Y-%m-%d")
        except:
            end_str = ""

    # Trả về đường dẫn tương đối để Frontend tự map port
    return f"/checkout?hotelId={slug_or_id}&start={start_str}&end={end_str}&adults={adults}"

def search_hotels_rag(intent: BookingIntent) -> List[Dict]:
    """
    Thực hiện Hybrid Search:
    1. Lọc cứng (SQL WHERE) theo địa điểm, giá.
    2. Lọc mềm (Vector Similarity) theo semantic_query.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Base Query
    # Lưu ý: Cần lấy thêm cột 'featuredImage' để hiển thị Card ở Frontend
    query = """
        SELECT id, title, price, address, "reviewStar", "featuredImage" 
        FROM hotels 
        WHERE 1=1
    """
    params = []
    
    # 1. Áp dụng SQL Filters
    if intent.location:
        query += " AND (address ILIKE %s OR title ILIKE %s)"
        # Thêm % vào đầu cuối để tìm kiếm tương đối
        params.extend([f"%{intent.location}%", f"%{intent.location}%"])
    
    if intent.price_max:
        query += " AND price <= %s"
        params.append(intent.price_max)
        
    # 2. Áp dụng Vector Search (Semantic) hoặc Sort thường
    if intent.semantic_query:
        print(f"🔍 Vector Searching for: {intent.semantic_query}")
        # Chuyển text thành vector
        vector = embed_model.encode(intent.semantic_query).tolist()
        
        # Cú pháp pgvector: <-> là Euclidean distance, <=> là Cosine distance
        # Ta dùng Cosine distance để tìm sự tương đồng
        query += " ORDER BY \"policiesVector\" <=> %s::vector LIMIT 5"
        params.append(str(vector))
    else:
        # Nếu không có keyword cảm xúc, sort theo rating cao nhất
        query += " ORDER BY \"reviewStar\" DESC LIMIT 5"

    try:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        
        results = []
        for r in rows:
            results.append({
                "id": r[0], 
                "title": r[1], 
                "price": float(r[2]), 
                "address": r[3], 
                "rating": float(r[4]) if r[4] else 0,
                "image": r[5] # Trả về ảnh bìa
            })
        return results
    except Exception as e:
        print(f"❌ DB Error: {e}")
        return []
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------
# 4. LOGIC CHÍNH (MAIN LOGIC)
# ---------------------------------------------------------

def run_agent_logic(user_text: str, user_id: str, history: List[Dict] = []) -> Dict[str, Any]:
    """
    Hàm này được gọi từ main.py.
    Input: Câu chat của user.
    Output: JSON cấu trúc trả về cho Frontend.
    """
    
    # --- BƯỚC 1: NLU (HIỂU Ý ĐỊNH) ---
    today = datetime.now().strftime("%Y-%m-%d (%A)")
    history_context = ""
    for msg in history[-6:]: 
        role = "User" if msg['sender'] == 'user' else "Assistant"
        history_context += f"{role}: {msg['text']}\n"
   
    system_prompt = f"""
    Bạn là AI Booking Agent. Hôm nay là {today}.
    
    LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ:
    {history_context}
    
    YÊU CẦU:
    1. Dựa vào lịch sử hội thoại để hiểu ngữ cảnh (Ví dụ: Nếu user nói "ngày 8/1", hãy xem trước đó họ đang chốt khách sạn nào).
    2. Nếu user nói ngày tháng, hãy trích xuất vào 'dates'.
    3. Nếu trong lịch sử đã có tên khách sạn (VD: Vintage Vung Tau), hãy điền vào 'target_hotel_name'.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", # Hoặc model khác tùy bạn chọn trên Groq
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            tools=[{
                "type": "function",
                "function": {
                    "name": "extract_booking_intent",
                    "description": "Trích xuất thông tin tìm kiếm/đặt phòng",
                    "parameters": BookingIntent.model_json_schema()
                }
            }],
            tool_choice={"type": "function", "function": {"name": "extract_booking_intent"}},
            temperature=0.1 # Giữ nhiệt độ thấp để trích xuất chính xác
        )

        # Parse kết quả từ Tool Call
        tool_calls = completion.choices[0].message.tool_calls
        
        if tool_calls:
            args = json.loads(tool_calls[0].function.arguments)
            intent = BookingIntent(**args)
        else:
            # Fallback nếu AI không dùng tool (Chat thường)
            intent = BookingIntent(intent_type="CHAT")

    except Exception as e:
        print(f"❌ Groq Error: {e}")
        # Fallback an toàn
        intent = BookingIntent(intent_type="CHAT")


    # --- BƯỚC 2: XỬ LÝ THEO INTENT ---
    
    # Cấu trúc trả về chuẩn
    response = {
        "agent_response": "",
        "intent": intent.model_dump(), # Trả lại để Frontend điền form
        "data": {
            "hotels": [],
            "booking_link": None
        }
    }

    if intent.intent_type == "SEARCH":
        hotels = search_hotels_rag(intent)
        if not hotels:
            response["agent_response"] = f"Rất tiếc, mình không tìm thấy phòng nào ở {intent.location or 'đây'} với tiêu chí này. Bạn thử đổi yêu cầu xem sao?"
        else:
            if intent.semantic_query:
                response["agent_response"] = f"Dựa trên mong muốn '{intent.semantic_query}', mình tìm thấy {len(hotels)} nơi này cực hợp với bạn:"
            else:
                response["agent_response"] = f"Mình tìm thấy {len(hotels)} lựa chọn tốt nhất cho bạn:"
            
            response["data"]["hotels"] = hotels

    elif intent.intent_type == "BOOK":
        # Kiểm tra xem đã đủ thông tin ngày tháng chưa
        if not intent.dates or not intent.dates.start:
            response["agent_response"] = "Bạn dự định đi vào ngày nào? Cho mình biết ngày check-in và check-out nhé."
        else:
            # Giả lập: Lấy khách sạn đầu tiên tìm thấy hoặc ID user đang xem (Context)
            # Ở đây để đơn giản, ta tìm kiếm lại để lấy 1 hotel ID tượng trưng
            found_hotels = search_hotels_rag(intent)
            if found_hotels:
                top_hotel = found_hotels[0]
                link = create_booking_link(top_hotel['id'], intent.dates, intent.guests_adults)
                
                response["agent_response"] = f"Tuyệt vời! Mình đã chuẩn bị đơn đặt phòng tại **{top_hotel['title']}** cho ngày {intent.dates.start}.\nBạn kiểm tra và thanh toán tại đây nhé:"
                response["data"]["hotels"] = [top_hotel] # Hiện lại card hotel đó
                response["data"]["booking_link"] = link
            else:
                response["agent_response"] = "Mình chưa xác định được khách sạn bạn muốn đặt. Bạn hãy tìm kiếm trước nhé."

    elif intent.intent_type == "RECOMMEND":
        # Phần này có thể mở rộng gọi logic Recommendation System
        response["agent_response"] = "Dựa trên sở thích của bạn, mình nghĩ bạn sẽ thích những nơi này..."
        # Gọi hàm get_recommendations_for_user(user_id) ở đây nếu muốn
        
    else:
        # Chat thường / Support
        response["agent_response"] = "Chào bạn! Mình là Stazy AI. Mình có thể giúp bạn tìm phòng, lọc theo giá, view biển, hoặc đặt chỗ ngay lập tức. Bạn cần gì nào?"

    return response