import os
import json
from groq import Groq
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# 1. Khởi tạo Groq Client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# --- ĐỊNH NGHĨA MODEL ---
class DateRange(BaseModel):
    start: Optional[str] = Field(None, description="Ngày bắt đầu (YYYY-MM-DD).")
    end: Optional[str] = Field(None, description="Ngày kết thúc (YYYY-MM-DD).")

class BookingIntent(BaseModel):
    # LƯU Ý: Bạn đang bị trùng tên field 'dates'. 
    # Mình đã xóa field 'dates: str' ở cuối và chỉ giữ lại 'dates: DateRange'
    dates: Optional[DateRange] = Field(None, description="Khoảng thời gian đặt phòng, trích xuất start và end date.")
    location: Optional[str] = Field(None, description="Địa điểm, thành phố (VD: Nha Trang, Đà Lạt)")
    min_price: Optional[int] = Field(None, description="Giá thấp nhất (VND)")
    max_price: Optional[int] = Field(None, description="Giá cao nhất (VND)")
    guests_adults: Optional[int] = Field(2, description="Số người lớn")
    guests_children: Optional[int] = Field(0, description="Số trẻ em")
    amenities: Optional[List[str]] = Field(None, description="Các tiện ích yêu cầu (pool, spa, wifi, view biển...)")
    semantic_query: Optional[str] = Field(None, description="Các từ khóa mô tả cảm xúc, không gian (VD: chill, yên tĩnh, lãng mạn)")

booking_tool_schema = {
    "type": "function",
    "function": {
        "name": "extract_booking_info",
        "description": "Trích xuất thông tin đặt phòng.",
        "parameters": BookingIntent.model_json_schema()
    }
}

def analyze_user_query(user_text: str) -> BookingIntent:
    print(f"🚀 [Groq] Đang phân tích: {user_text}")
    
    # 1. Lấy ngày hôm nay
    today = datetime.now().strftime("%Y-%m-%d, Thứ %w") # Thêm thứ trong tuần cho AI khôn hơn (VD: Thứ 7 giá cao hơn)

    try:
        # 2. Gọi Groq API
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    # 🔥 SỬA CHỖ NÀY: Truyền biến today vào string prompt
                    "content": f"""
                    Bạn là AI Booking Agent thông minh.
                    Hôm nay là ngày: {today}.
                    
                    Nhiệm vụ:
                    1. Trích xuất thông tin đặt phòng từ câu nói người dùng.
                    2. Nếu user nói "ngày mai", "tuần sau", "20/7", hãy dựa vào ngày hôm nay để suy ra ngày cụ thể (YYYY-MM-DD).
                    3. Luôn thêm năm hiện tại nếu user không nói năm.
                    """
                },
                {
                    "role": "user",
                    "content": user_text
                }
            ],
            model="llama-3.3-70b-versatile",
            tools=[booking_tool_schema],
            tool_choice={"type": "function", "function": {"name": "extract_booking_info"}},
            temperature=0,
        )

        tool_calls = chat_completion.choices[0].message.tool_calls
        
        if tool_calls:
            args = json.loads(tool_calls[0].function.arguments)
            intent = BookingIntent(**args)
            return intent
        else:
            return BookingIntent(semantic_query=user_text)

    except Exception as e:
        print(f"❌ Lỗi Groq: {e}")
        return BookingIntent(semantic_query=user_text)

if __name__ == "__main__":
    # Test thử các case thời gian tương đối
    test_queries = [
        "Đặt phòng ở Đà Lạt cho ngày mai, đi 2 người.",
        "Tìm khách sạn Nha Trang từ 20/7 đến 25/7 nhé."
    ]
    
    for q in test_queries:
        print(f"\nQUERY: {q}")
        res = analyze_user_query(q)
        # In ra date để kiểm tra xem nó có tính đúng ngày không
        print(f"-> Dates: {res.dates}")