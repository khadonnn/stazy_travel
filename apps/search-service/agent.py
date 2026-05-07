import os
import json
import psycopg2
import traceback
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

HISTORY_TTL = 1800  # 30 phút


def save_message_to_context(user_id, role, content):
    if not REDIS_AVAILABLE:
        return
    try:
        key = f"chat:history:{user_id}"
        message_obj = {"role": role, "content": content}
        r.rpush(key, json.dumps(message_obj))
        r.ltrim(key, -20, -1)
        r.expire(key, HISTORY_TTL)
    except Exception:
        pass


def get_chat_history(user_id):
    if not REDIS_AVAILABLE:
        return []
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
    intent_type: str = Field(
        ..., description="Loại ý định: 'SEARCH', 'BOOK', 'RECOMMEND', 'CHAT'"
    )
    location: Optional[str] = Field(None, description="Địa điểm")
    price_min: Optional[int] = Field(
        None,
        description="Giá tối thiểu VND. 'trên 2 triệu' -> 2000000, 'từ 1 triệu' -> 1000000. LUÔN đơn vị VND.",
    )
    price_max: Optional[int] = Field(
        None,
        description="Giá tối đa VND. 'dưới 2 triệu' -> 2000000, 'khoảng 1 triệu' -> 1000000. LUÔN đơn vị VND.",
    )
    dates: Optional[DateRange] = Field(None, description="Thời gian")
    guests_adults: Optional[int] = Field(None, description="Số người lớn")
    semantic_query: Optional[str] = Field(
        None, description="Từ khóa cảm xúc (VD: hồ bơi, view đẹp)"
    )
    target_hotel_name: Optional[str] = Field(
        None, description="Tên cụ thể khách sạn user muốn chốt"
    )


# ---------------------------------------------------------
# 4. HELPER FUNCTIONS
# ---------------------------------------------------------
def get_db_connection():
    db_url = DATABASE_URL
    if db_url and "?" in db_url:
        db_url = db_url.split("?")[0]
    return psycopg2.connect(db_url)


def create_booking_link(slug_or_id, dates: Optional[DateRange], adults=2):
    start_str = dates.start
    end_str = dates.end
    final_adults = adults if adults else 2
    return f"/checkout?hotelId={slug_or_id}&start={start_str}&end={end_str}&adults={final_adults}"


def _to_vnd(value: Optional[int]) -> Optional[int]:
    """Convert value to VND if it looks like it's in 'triệu' unit (< 1000)."""
    if value is None:
        return None
    return value * 1000000 if value < 1000 else value


def search_hotels_rag(intent: BookingIntent) -> List[Dict]:
    conn = get_db_connection()
    cur = conn.cursor()
    query = """SELECT id, title, price, address, "reviewStar", "featuredImage", slug, map, description FROM hotels WHERE 1=1"""
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

        # 3. Lọc giá: Hỗ trợ CẢ min và max
        if intent.price_min is not None:
            actual_min = _to_vnd(intent.price_min)
            query += " AND price >= %s"
            params.append(actual_min)
            print(f"💰 price_min: {actual_min} VND")

        if intent.price_max is not None:
            actual_max = _to_vnd(intent.price_max)
            query += " AND price <= %s"
            params.append(actual_max)
            print(f"💰 price_max: {actual_max} VND")

    # 4. Logic Vector Search (Tìm theo tiện ích/cảm xúc)
    if intent.semantic_query and not intent.target_hotel_name:
        print(f"🔍 Vector Search: {intent.semantic_query}")
        try:
            vector = embed_model.encode(intent.semantic_query).tolist()
            query += ' ORDER BY "policiesVector" <=> %s::vector LIMIT 5'
            params.append(str(vector))
        except Exception as e:
            print(f"⚠️ Lỗi Vector: {e}")
            query += " ORDER BY price ASC LIMIT 5"
    else:
        query += " ORDER BY price ASC LIMIT 5"

    try:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        results = []
        for r in rows:
            map_data = None
            if len(r) > 7 and r[7]:
                try:
                    if isinstance(r[7], str):
                        map_data = json.loads(r[7])
                    elif isinstance(r[7], dict):
                        map_data = r[7]
                except:
                    pass
            description = r[8] if len(r) > 8 and r[8] else ""
            results.append(
                {
                    "id": r[0],
                    "title": r[1],
                    "price": float(r[2]),
                    "address": r[3],
                    "rating": float(r[4]) if r[4] else 0,
                    "image": r[5]
                    if r[5]
                    else "https://placehold.co/600x400?text=No+Image",
                    "slug": r[6] if len(r) > 6 and r[6] else str(r[0]),
                    "map": map_data,
                    "description": description,
                }
            )
        print(f"📋 Found {len(results)} hotels")
        return results
    except Exception as e:
        print(f"❌ SQL Error: {e}")
        return []
    finally:
        cur.close()
        conn.close()


# ---------------------------------------------------------
# 5. MAIN LOGIC
# ---------------------------------------------------------
def run_agent_logic(user_text: str, user_id: str) -> Dict[str, Any]:
    today = datetime.now().strftime("%Y-%m-%d (%A)")

    # A. Đọc lịch sử
    chat_history = get_chat_history(user_id)
    history_text = ""
    for msg in chat_history:
        r = "User" if msg["role"] == "user" else "AI"
        history_text += f"{r}: {msg['content']}\n"

    # B. System Prompt (Tối ưu + hướng dẫn tiền tệ chi tiết)
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
       - NẾU KHÔNG CÓ -> ĐỂ NULL. TUYỆT ĐỐI KHÔNG TỰ BỊA.

    3. 'semantic_query':
       - Nếu user hỏi tiện ích (hồ bơi, bồn tắm, view đẹp), điền vào đây.

    4. Xử lý Search:
       - Nếu user đưa ra tiêu chí mới mà không nhắc địa điểm, hãy TỰ LẤY ĐỊA ĐIỂM TỪ LỊCH SỬ.

    5. XỬ LÝ GIÁ TIỀN (QUAN TRỌNG - LUÔN ĐƠN VỊ VND):
       - "triệu" = 1000000 (VD: 2 triệu = 2000000)
       - "trên X triệu" / "hơn X triệu" / "từ X triệu đổ lên" -> price_min = X * 1000000, price_max = NULL
       - "dưới X triệu" / "khoảng X triệu đổ lại" / "tối đa X triệu" -> price_max = X * 1000000, price_min = NULL
       - "từ X đến Y triệu" -> price_min = X * 1000000, price_max = Y * 1000000
       - VÍ DỤ: "trên 2 triệu" -> price_min = 2000000, price_max = null
       - VÍ DỤ: "dưới 1 triệu" -> price_max = 1000000, price_min = null
       - TUYỆT ĐỐI trả về giá trị VND (đơn vị đồng), KHÔNG trả về "triệu".
    """

    messages_payload = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_text},
    ]

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages_payload,
            tools=[
                {
                    "type": "function",
                    "function": {
                        "name": "extract_booking_intent",
                        "description": "Extract booking intent from user message",
                        "parameters": BookingIntent.model_json_schema(),
                    },
                }
            ],
            tool_choice="auto",
            temperature=0.1,
        )

        tool_calls = completion.choices[0].message.tool_calls
        if tool_calls:
            args = json.loads(tool_calls[0].function.arguments)
            intent = BookingIntent(**args)
            print(
                f"🤖 Intent: {intent.intent_type} | Loc: {intent.location} | "
                f"Min: {intent.price_min} | Max: {intent.price_max} | "
                f"Query: {intent.semantic_query}"
            )
        else:
            ai_chat_content = completion.choices[0].message.content
            intent = BookingIntent(intent_type="CHAT")

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Groq Error: {error_msg}")
        print(traceback.format_exc())
        # Friendly fallback based on error type
        if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
            return {
                "agent_response": "⏳ Hệ thống AI đang quá tải, vui lòng thử lại sau vài giây.",
                "intent": {"intent_type": "CHAT"},
                "data": {"hotels": [], "booking_link": None},
            }
        elif "rate" in error_msg.lower() or "429" in error_msg:
            return {
                "agent_response": "🚦 Đã vượt quá giới hạn yêu cầu. Vui lòng chờ 10 giây rồi thử lại.",
                "intent": {"intent_type": "CHAT"},
                "data": {"hotels": [], "booking_link": None},
            }
        intent = BookingIntent(intent_type="CHAT")

    response = {
        "agent_response": "",
        "intent": intent.model_dump(),
        "data": {"hotels": [], "booking_link": None},
    }

    # --- C. XỬ LÝ LOGIC NGHIỆP VỤ ---

    # 1. LOGIC SEARCH
    if intent.intent_type == "SEARCH":
        hotels = search_hotels_rag(intent)
        if not hotels:
            location_text = intent.location or "đây"
            price_text = ""
            if intent.price_min and intent.price_max:
                price_text = f" từ {_to_vnd(intent.price_min):,.0f}đ đến {_to_vnd(intent.price_max):,.0f}đ"
            elif intent.price_min:
                price_text = f" trên {_to_vnd(intent.price_min):,.0f}đ"
            elif intent.price_max:
                price_text = f" dưới {_to_vnd(intent.price_max):,.0f}đ"
            response["agent_response"] = (
                f"Tiếc quá, mình không tìm thấy phòng nào ở {location_text}{price_text}."
            )
        else:
            response["agent_response"] = (
                f"Mình tìm thấy {len(hotels)} lựa chọn phù hợp:"
            )
            response["data"]["hotels"] = hotels

    # 2. LOGIC BOOKING
    elif intent.intent_type == "BOOK":
        missing_info = []

        if not intent.dates or not intent.dates.start:
            missing_info.append("ngày check-in")

        if intent.guests_adults is None:
            missing_info.append("số lượng người")

        if missing_info:
            missing_str = " và ".join(missing_info)
            response["agent_response"] = (
                f"Để mình đặt phòng giúp bạn, bạn cho mình biết **{missing_str}** với nhé?"
            )
        else:
            found_hotels = search_hotels_rag(intent)

            if found_hotels:
                top_hotel = found_hotels[0]
                identifier = top_hotel.get("slug") or top_hotel.get("id")
                print(
                    f"🔍 DEBUG: Title='{top_hotel['title']}' | ID='{identifier}'"
                )
                if not intent.dates.end:
                    try:
                        s = datetime.strptime(intent.dates.start, "%Y-%m-%d")
                        intent.dates.end = (s + timedelta(days=1)).strftime(
                            "%Y-%m-%d"
                        )
                    except:
                        pass

                link = create_booking_link(
                    identifier, intent.dates, intent.guests_adults
                )

                response["agent_response"] = (
                    f"Thông tin đã đủ! Mình đã tạo đơn cho **{top_hotel['title']}**.\n"
                    f"Ngày: {intent.dates.start} đến {intent.dates.end} "
                    f"({intent.guests_adults or 2} khách)."
                )
                response["data"]["hotels"] = [top_hotel]
                response["data"]["booking_link"] = link
            else:
                response["agent_response"] = (
                    f"Xin lỗi, mình không tìm thấy khách sạn **{intent.target_hotel_name}**."
                )

    # 3. LOGIC CHAT THƯỜNG
    else:
        if "ai_chat_content" in locals() and ai_chat_content:
            response["agent_response"] = ai_chat_content
        else:
            response["agent_response"] = "Mình có thể giúp bạn tìm phòng. Bạn cần gì?"

    # D. Lưu lịch sử
    save_message_to_context(user_id, "user", user_text)
    save_message_to_context(user_id, "assistant", response["agent_response"])

    return response