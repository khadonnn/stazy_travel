import os
import json
import psycopg2
import traceback #  In lỗi chi tiết để debug
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from groq import Groq
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# IMPORT REDIS CLIENT
from src.utils.redis_client import get_redis_client

# ---------------------------------------------------------
# 1. CẤU HÌNH HỆ THỐNG
# ---------------------------------------------------------
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)
DATABASE_URL = os.getenv("DATABASE_URL")

print("⏳ Loading Embedding Model...")
# Model này phải khớp với model bạn dùng để tạo vector trong DB
embed_model = SentenceTransformer("distiluse-base-multilingual-cased-v1")

# ---------------------------------------------------------
# 2. REDIS SETUP (AN TOÀN)
# ---------------------------------------------------------
try:
    r = get_redis_client()
    r.ping()
    REDIS_AVAILABLE = True
    print("✅ [Agent] Redis connected.")
except Exception as e:
    print(f"⚠️ [Agent] Redis failed: {e}")
    REDIS_AVAILABLE = False

HISTORY_TTL = 1800 # 30 phút

def save_message_to_context(user_id, role, content):
    if not REDIS_AVAILABLE: return
    try:
        key = f"chat:history:{user_id}"
        message_obj = {"role": role, "content": content}
        r.rpush(key, json.dumps(message_obj))
        r.ltrim(key, -20, -1) # Chỉ giữ 20 tin nhắn gần nhất
        r.expire(key, HISTORY_TTL)
    except Exception:
        pass

def get_chat_history(user_id):
    if not REDIS_AVAILABLE: return []
    try:
        key = f"chat:history:{user_id}"
        raw_history = r.lrange(key, 0, -1)
        return [json.loads(msg) for msg in raw_history]
    except Exception:
        return []

# ---------------------------------------------------------
# 3. DATA MODELS
# ---------------------------------------------------------
class DateRange(BaseModel):
    start: Optional[str] = Field(None, description="Ngày check-in (YYYY-MM-DD)")
    end: Optional[str] = Field(None, description="Ngày check-out (YYYY-MM-DD)")

class BookingIntent(BaseModel):
    intent_type: str = Field(..., description="Loại ý định: 'SEARCH', 'BOOK', 'RECOMMEND', 'CHAT'")
    location: Optional[str] = Field(None, description="Địa điểm")
    price_max: Optional[int] = Field(None, description="Ngân sách tối đa")
    dates: Optional[DateRange] = Field(None, description="Thời gian")
    
    #  QUAN TRỌNG: Để None để code biết đường hỏi lại nếu thiếu
    guests_adults: Optional[int] = Field(None, description="Số người lớn") 
    
    semantic_query: Optional[str] = Field(None, description="Từ khóa cảm xúc (VD: hồ bơi, view đẹp)")
    target_hotel_name: Optional[str] = Field(None, description="Tên cụ thể khách sạn user muốn chốt")

# ---------------------------------------------------------
# 4. HELPER FUNCTIONS
# ---------------------------------------------------------
def get_db_connection():
    db_url = DATABASE_URL
    if db_url and "?" in db_url:
        db_url = db_url.split("?")[0]
    return psycopg2.connect(db_url)

def create_booking_link(slug_or_id, dates: Optional[DateRange], adults=2):
    # Hàm này chỉ được gọi khi đã có đủ ngày tháng
    start_str = dates.start
    end_str = dates.end
    
    # Đảm bảo adults có giá trị (fallback là 2 nếu vẫn None)
    final_adults = adults if adults else 2
    
    return f"/checkout?hotelId={slug_or_id}&start={start_str}&end={end_str}&adults={final_adults}"

def search_hotels_rag(intent: BookingIntent) -> List[Dict]:
    conn = get_db_connection()
    cur = conn.cursor()
    # Lấy thêm slug để tạo link
    query = """SELECT id, title, price, address, "reviewStar", "featuredImage", slug FROM hotels WHERE 1=1"""
    params = []
    
    # 1. Logic lọc theo tên cụ thể (Ưu tiên cao nhất)
    if intent.target_hotel_name:
        print(f"🎯 Tìm chính xác: {intent.target_hotel_name}")
        query += " AND title ILIKE %s"
        params.append(f"%{intent.target_hotel_name}%")
    else:
        # 2. Logic tìm kiếm chung
        if intent.location:
            query += " AND (address ILIKE %s OR title ILIKE %s)"
            params.extend([f"%{intent.location}%", f"%{intent.location}%"])
        if intent.price_max:
            actual_price = intent.price_max * 1000000 if intent.price_max < 1000 else intent.price_max
            query += " AND price <= %s"
            params.append(actual_price)

    # 3. Logic Vector Search (Tìm theo tiện ích/cảm xúc)
    if intent.semantic_query and not intent.target_hotel_name:
        print(f"🔍 Vector Search: {intent.semantic_query}")
        try:
            vector = embed_model.encode(intent.semantic_query).tolist()
            query += " ORDER BY \"policiesVector\" <=> %s::vector LIMIT 5"
            params.append(str(vector))
        except Exception as e:
            print(f"⚠️ Lỗi Vector: {e}")
            query += " ORDER BY price ASC LIMIT 5"
    else:
        # Mặc định sắp xếp giá thấp đến cao
        query += " ORDER BY price ASC LIMIT 5"

    try:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        results = []
        for r in rows:
            results.append({
                "id": r[0], "title": r[1], "price": float(r[2]), "address": r[3],
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
# 5. MAIN LOGIC (QUAN TRỌNG NHẤT)
# ---------------------------------------------------------

def run_agent_logic(user_text: str, user_id: str) -> Dict[str, Any]:
    today = datetime.now().strftime("%Y-%m-%d (%A)")
    
    # A. Đọc lịch sử
    chat_history = get_chat_history(user_id)
    history_text = ""
    for msg in chat_history:
        r = "User" if msg['role'] == 'user' else "AI"
        history_text += f"{r}: {msg['content']}\n"

    # B. System Prompt (Đã tối ưu để hỏi thiếu thông tin)
    system_prompt = f"""
    Bạn là AI Booking Agent. Hôm nay là {today}.
    
    LỊCH SỬ HỘI THOẠI:
    {history_text}
    
    NHIỆM VỤ:
    1. 'target_hotel_name': 
       - Nếu user nói "chốt cái rẻ nhất", "cái đầu tiên", hãy nhìn vào LỊCH SỬ để tìm tên khách sạn và điền vào đây.
       - Nếu user chỉ tìm kiếm ("tìm khách sạn có hồ bơi"), ĐỂ TRỐNG.
    
    2. 'dates' & 'guests_adults':
       - CHỈ trích xuất nếu user nói cụ thể (VD: "ngày mai", "cho 2 người").
       - NẾU KHÔNG CÓ TRONG CÂU NÓI HOẶC LỊCH SỬ GẦN NHẤT -> ĐỂ NULL. 
       - TUYỆT ĐỐI KHÔNG TỰ BỊA "ngày mai" hay "2 người".
    
    3. 'semantic_query':
       - Nếu user hỏi tiện ích (hồ bơi, bồn tắm, view đẹp), điền vào đây.
    
    4. Xử lý Search:
       - Nếu user đưa ra tiêu chí mới ("có hồ bơi") mà không nhắc địa điểm, hãy TỰ LẤY ĐỊA ĐIỂM TỪ LỊCH SỬ (VD: Vũng Tàu).
    """

    messages_payload = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text}
    ]

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages_payload, 
            tools=[{
                "type": "function",
                "function": {
                    "name": "extract_booking_intent",
                    "description": "Extract info",
                    "parameters": BookingIntent.model_json_schema()
                }
            }],
            tool_choice="auto",
            temperature=0.1
        )

        tool_calls = completion.choices[0].message.tool_calls
        if tool_calls:
            args = json.loads(tool_calls[0].function.arguments)
            intent = BookingIntent(**args)
            print(f"🤖 Intent: {intent.intent_type} | Target: {intent.target_hotel_name} | Query: {intent.semantic_query}")
        else:
            ai_chat_content = completion.choices[0].message.content
            intent = BookingIntent(intent_type="CHAT")
            
    except Exception as e:
        print(f"❌ Groq Error: {e}")
        print(traceback.format_exc()) # In lỗi chi tiết
        intent = BookingIntent(intent_type="CHAT")

    response = {
        "agent_response": "",
        "intent": intent.model_dump(),
        "data": {"hotels": [], "booking_link": None}
    }

    # --- C. XỬ LÝ LOGIC NGHIỆP VỤ ---
    
    # 1. LOGIC SEARCH
    if intent.intent_type == "SEARCH":
        hotels = search_hotels_rag(intent)
        if not hotels:
            response["agent_response"] = f"Tiếc quá, mình không tìm thấy phòng nào ở {intent.location or 'đây'}."
        else:
            response["agent_response"] = f"Mình tìm thấy {len(hotels)} lựa chọn phù hợp:"
            response["data"]["hotels"] = hotels

    # 2. LOGIC BOOKING (KIỂM TRA THÔNG TIN TRƯỚC KHI TẠO LINK)
    elif intent.intent_type == "BOOK":
        missing_info = []
        
        # Check ngày
        if not intent.dates or not intent.dates.start:
            missing_info.append("ngày check-in")
        
        # Check số người (nếu AI trả về None)
        if intent.guests_adults is None:
            missing_info.append("số lượng người")

        if missing_info:
            #  NẾU THIẾU -> HỎI LẠI NGAY
            missing_str = " và ".join(missing_info)
            response["agent_response"] = f"Để mình đặt phòng giúp bạn, bạn cho mình biết **{missing_str}** với nhé?"
        else:
            #  ĐỦ THÔNG TIN -> TẠO LINK
            found_hotels = search_hotels_rag(intent)
            
            if found_hotels:
                # Nếu target_hotel_name hoạt động đúng, found_hotels[0] là cái user muốn
                top_hotel = found_hotels[0]
                identifier = top_hotel.get('slug') or top_hotel.get('id')
                print(f"🔍 DEBUG DATA: Title='{top_hotel['title']}' | Identifier='{identifier}'")
                # Auto điền ngày về nếu thiếu (mặc định +1 ngày)
                if not intent.dates.end:
                    try:
                        s = datetime.strptime(intent.dates.start, "%Y-%m-%d")
                        intent.dates.end = (s + timedelta(days=1)).strftime("%Y-%m-%d")
                    except:
                        pass

                link = create_booking_link(identifier, intent.dates, intent.guests_adults)
                
                response["agent_response"] = f"Thông tin đã đủ! Mình đã tạo đơn cho **{top_hotel['title']}**.\nNgày: {intent.dates.start} đến {intent.dates.end} ({intent.guests_adults or 2} khách)."
                response["data"]["hotels"] = [top_hotel]
                response["data"]["booking_link"] = link
            else:
                 response["agent_response"] = f"Xin lỗi, mình không tìm thấy khách sạn **{intent.target_hotel_name}**."

    # 3. LOGIC CHAT THƯỜNG
    else:
        if 'ai_chat_content' in locals() and ai_chat_content:
             response["agent_response"] = ai_chat_content
        else:
             response["agent_response"] = "Mình có thể giúp bạn tìm phòng. Bạn cần gì?"

    # D. Lưu lịch sử
    save_message_to_context(user_id, "user", user_text)
    save_message_to_context(user_id, "assistant", response["agent_response"])

    return response