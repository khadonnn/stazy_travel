import os
import json
import psycopg2
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from groq import Groq
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# 1. CẤU HÌNH HỆ THỐNG
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("⚠️ Warning: Missing GROQ_API_KEY.")
client = Groq(api_key=GROQ_API_KEY)

DATABASE_URL = os.getenv("DATABASE_URL")

print("⏳ Loading Embedding Model...")
embed_model = SentenceTransformer("distiluse-base-multilingual-cased-v1")

# ---------------------------------------------------------
# 2. DATA MODELS (Thêm trường target_hotel_name)
# ---------------------------------------------------------
class DateRange(BaseModel):
    start: Optional[str] = Field(None, description="Ngày check-in (YYYY-MM-DD)")
    end: Optional[str] = Field(None, description="Ngày check-out (YYYY-MM-DD)")

class BookingIntent(BaseModel):
    intent_type: str = Field(..., description="Loại ý định: 'SEARCH', 'BOOK', 'RECOMMEND', 'CHAT'")
    location: Optional[str] = Field(None, description="Địa điểm")
    price_max: Optional[int] = Field(None, description="Ngân sách tối đa")
    dates: Optional[DateRange] = Field(None, description="Thời gian")
    guests_adults: Optional[int] = Field(2, description="Số người lớn")
    semantic_query: Optional[str] = Field(None, description="Từ khóa cảm xúc")
    # 🔥 THÊM TRƯỜNG NÀY ĐỂ BẮT TÊN KHÁCH SẠN CỤ THỂ
    target_hotel_name: Optional[str] = Field(None, description="Tên cụ thể của khách sạn muốn đặt (nếu có)")

# ---------------------------------------------------------
# 3. HELPER FUNCTIONS
# ---------------------------------------------------------

def get_db_connection():
    db_url = DATABASE_URL
    if db_url and "?" in db_url:
        db_url = db_url.split("?")[0]
    return psycopg2.connect(db_url)

def create_booking_link(slug_or_id, dates: Optional[DateRange], adults=2):
    """
    Tạo link thanh toán, tự động điền ngày nếu thiếu.
    """
    # 1. Xử lý ngày check-in (Start Date)
    # Nếu có ngày thì lấy, nếu không thì mặc định là NGÀY MAI
    if dates and dates.start:
        start_str = dates.start
    else:
        start_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    # 2. Xử lý ngày check-out (End Date) - 🔥 FIX LỖI end=None TẠI ĐÂY
    # Nếu có ngày về thì lấy
    if dates and dates.end:
        end_str = dates.end
    else:
        # Nếu KHÔNG có ngày về (None), tự động cộng thêm 1 ngày từ ngày start
        try:
            start_date_obj = datetime.strptime(start_str, "%Y-%m-%d")
            end_str = (start_date_obj + timedelta(days=1)).strftime("%Y-%m-%d")
        except ValueError:
            # Fallback nếu format ngày bị sai
            end_str = ""

    # 3. Trả về đường dẫn tương đối (Bắt đầu bằng /) để không bị lỗi Port
    # Kết quả sẽ là: /checkout?hotelId=46&start=2026-01-26&end=2026-01-27&adults=2
    return f"/checkout?hotelId={slug_or_id}&start={start_str}&end={end_str}&adults={adults}"

def search_hotels_rag(intent: BookingIntent) -> List[Dict]:
    conn = get_db_connection()
    cur = conn.cursor()
    
    query = """
        SELECT id, title, price, address, "reviewStar", "featuredImage", slug
        FROM hotels 
        WHERE 1=1
    """
    params = []
    
    # 🔥 LOGIC TÌM CHÍNH XÁC KHI USER CHỐT ĐƠN
    if intent.target_hotel_name:
        # Tìm gần đúng tên khách sạn (Case insensitive)
        print(f"🎯 Trying to book specific hotel: {intent.target_hotel_name}")
        query += " AND title ILIKE %s"
        params.append(f"%{intent.target_hotel_name}%")
    else:
        # Logic tìm kiếm thông thường
        if intent.location:
            query += " AND (address ILIKE %s OR title ILIKE %s)"
            params.extend([f"%{intent.location}%", f"%{intent.location}%"])
        
        if intent.price_max:
            actual_price = intent.price_max * 1000000 if intent.price_max < 1000 else intent.price_max
            query += " AND price <= %s"
            params.append(actual_price)

    # Sắp xếp
    if intent.semantic_query and not intent.target_hotel_name:
        vector = embed_model.encode(intent.semantic_query).tolist()
        query += " ORDER BY \"policiesVector\" <=> %s::vector LIMIT 5"
        params.append(str(vector))
    else:
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
                "image": r[5] if r[5] else "https://placehold.co/600x400?text=No+Image",
                "slug": r[6] if len(r) > 6 and r[6] else str(r[0])
            })
        return results
    except Exception as e:
        print(f"❌ SQL Error: {e}")
        return []
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------
# 4. MAIN LOGIC
# ---------------------------------------------------------

def run_agent_logic(user_text: str, user_id: str) -> Dict[str, Any]:
    today = datetime.now().strftime("%Y-%m-%d (%A)")
    
    # 🔥 CẬP NHẬT PROMPT ĐỂ AI BẮT ĐƯỢC TÊN KHÁCH SẠN
    system_prompt = f"""
    Bạn là AI Booking Agent. Hôm nay là {today}.
    Nhiệm vụ:
    1. Nếu user tìm kiếm, set intent='SEARCH'.
    2. Nếu user muốn đặt/chốt phòng, set intent='BOOK'.
    3. QUAN TRỌNG: Nếu user nhắc tên khách sạn cụ thể (VD: "chốt khách sạn A", "đặt chỗ B"), hãy trích xuất tên đó vào trường 'target_hotel_name'.
    4. Xử lý thời gian tương đối thành ngày YYYY-MM-DD.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            tools=[{
                "type": "function",
                "function": {
                    "name": "extract_booking_intent",
                    "description": "Trích xuất thông tin",
                    "parameters": BookingIntent.model_json_schema()
                }
            }],
            tool_choice={"type": "function", "function": {"name": "extract_booking_intent"}},
            temperature=0.1
        )

        tool_calls = completion.choices[0].message.tool_calls
        if tool_calls:
            args = json.loads(tool_calls[0].function.arguments)
            intent = BookingIntent(**args)
            print(f"🤖 Intent: {intent.intent_type} | Target Hotel: {intent.target_hotel_name}")
        else:
            intent = BookingIntent(intent_type="CHAT")

    except Exception as e:
        print(f"❌ Groq Error: {e}")
        intent = BookingIntent(intent_type="CHAT")

    response = {
        "agent_response": "",
        "intent": intent.model_dump(),
        "data": {"hotels": [], "booking_link": None}
    }

    if intent.intent_type == "SEARCH":
        hotels = search_hotels_rag(intent)
        if not hotels:
            response["agent_response"] = f"Không tìm thấy phòng ở {intent.location}."
        else:
            response["agent_response"] = f"Tìm thấy {len(hotels)} lựa chọn cho bạn:"
            response["data"]["hotels"] = hotels

    elif intent.intent_type == "BOOK":
        # Tìm khách sạn (Ưu tiên theo tên cụ thể user vừa nói)
        found_hotels = search_hotels_rag(intent)
        
        if found_hotels:
            # Lấy khách sạn khớp nhất (đầu tiên)
            top_hotel = found_hotels[0]
            
            # Tạo link (Code mới đã tự fix ngày và link tương đối)
            identifier = top_hotel.get('slug') or top_hotel.get('id')
            link = create_booking_link(identifier, intent.dates, intent.guests_adults)
            
            # Kiểm tra xem tên khách sạn tìm được có khớp ý user không
            response["agent_response"] = f"Tuyệt vời! Mình đã tạo đơn đặt phòng tại **{top_hotel['title']}**.\nBạn hoàn tất thanh toán nhé:"
            response["data"]["hotels"] = [top_hotel]
            response["data"]["booking_link"] = link
        else:
            if intent.target_hotel_name:
                response["agent_response"] = f"Xin lỗi, mình không tìm thấy khách sạn nào tên là **'{intent.target_hotel_name}'** trong hệ thống. Bạn kiểm tra lại tên nhé."
            else:
                response["agent_response"] = "Mình chưa rõ bạn muốn đặt khách sạn nào. Hãy tìm kiếm và nói tên khách sạn cụ thể nhé."

    elif intent.intent_type == "RECOMMEND":
        response["agent_response"] = "Dựa trên sở thích của bạn, mình gợi ý..."
        # Logic recommend...
        
    else:
        response["agent_response"] = "Mình có thể giúp bạn tìm phòng và đặt chỗ. Bạn cần gì?"

    return response