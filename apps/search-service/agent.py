import os
import json
import re
import unicodedata
from difflib import SequenceMatcher
import psycopg2
import traceback
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from groq import Groq
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer, util
from dotenv import load_dotenv
from src.utils.redis_client import get_redis_client
from src.services.cost_estimation import estimate_trip_cost, build_cost_context

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)
DATABASE_URL = os.getenv("DATABASE_URL")

print("Loading Embedding Model...")
embed_model = SentenceTransformer("distiluse-base-multilingual-cased-v1")

try:
    r = get_redis_client()
    r.ping()
    REDIS_AVAILABLE = True
    print("[Agent] Redis connected.")
except Exception as e:
    print(f"[Agent] Redis failed: {e}")
    REDIS_AVAILABLE = False

HISTORY_TTL = 1800

def save_message_to_context(user_id, role, content):
    if not REDIS_AVAILABLE: return
    try:
        key = f"chat:history:{user_id}"
        r.rpush(key, json.dumps({"role": role, "content": content}))
        r.ltrim(key, -20, -1)
        r.expire(key, HISTORY_TTL)
    except Exception: pass

def get_chat_history(user_id):
    if not REDIS_AVAILABLE: return []
    try:
        key = f"chat:history:{user_id}"
        return [json.loads(msg) for msg in r.lrange(key, 0, -1)]
    except Exception: return []

def save_last_hotels(user_id, hotels):
    if not REDIS_AVAILABLE: return
    try:
        key = f"chat:last_hotels:{user_id}"
        r.set(key, json.dumps(hotels or []), ex=HISTORY_TTL)
    except Exception: pass

def get_last_hotels(user_id):
    if not REDIS_AVAILABLE: return []
    try:
        key = f"chat:last_hotels:{user_id}"
        raw = r.get(key)
        if not raw: return []
        if isinstance(raw, bytes): raw = raw.decode("utf-8")
        return json.loads(raw)
    except Exception: return []

def save_booking_state(user_id, state):
    if not REDIS_AVAILABLE: return
    try:
        key = f"chat:booking_state:{user_id}"
        r.set(key, json.dumps(state), ex=HISTORY_TTL)
    except Exception: pass

def get_booking_state(user_id):
    if not REDIS_AVAILABLE: return None
    try:
        key = f"chat:booking_state:{user_id}"
        raw = r.get(key)
        if not raw: return None
        if isinstance(raw, bytes): raw = raw.decode("utf-8")
        return json.loads(raw)
    except Exception: return None

def clear_booking_state(user_id):
    if not REDIS_AVAILABLE: return
    try:
        key = f"chat:booking_state:{user_id}"
        r.delete(key)
    except Exception: pass

# --- MODULAR PROMPT LOADER ---
PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "prompts")
FAQ_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "hotel_faq.json")
_faq_data = None

def _load_text_file(filename):
    try:
        with open(os.path.join(PROMPTS_DIR, filename), "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"Prompt not found: {filename}")
        return ""

def _load_faq_data():
    global _faq_data
    if _faq_data is not None: return _faq_data
    try:
        with open(FAQ_DATA_PATH, "r", encoding="utf-8") as f:
            _faq_data = json.load(f)
        return _faq_data
    except:
        _faq_data = []
        return _faq_data

def retrieve_faq_context(user_text, top_k=2):
    faqs = _load_faq_data()
    if not faqs: return ""
    user_lower = user_text.lower()
    keyword_scores = []
    for faq in faqs:
        score = sum(1 for kw in faq.get("keywords", []) if kw.lower() in user_lower)
        if score > 0: keyword_scores.append((score, faq))
    if keyword_scores:
        keyword_scores.sort(key=lambda x: -x[0])
        top_faqs = [f for _, f in keyword_scores[:top_k]]
        return "\n\n".join([f"Q: {f['question']}\nA: {f['answer']}" for f in top_faqs])
    try:
        user_vec = embed_model.encode(user_text)
        faq_texts = [f["question"] + " " + f["answer"] for f in faqs]
        faq_vecs = embed_model.encode(faq_texts)
        cos_scores = util.cos_sim(user_vec, faq_vecs)[0]
        top_indices = cos_scores.argsort(descending=True)[:top_k]
        top_faqs = [faqs[i] for i in top_indices if cos_scores[i] > 0.2]
        if top_faqs:
            return "\n\n".join([f"Q: {f['question']}\nA: {f['answer']}" for f in top_faqs])
    except Exception as e:
        print(f"Embedding failed: {e}")
    return ""

def compose_prompt(intent_type, history_text, today, faq_context="", extra_context=""):
    safety = _load_text_file("safety_prompt.txt")
    personal = f"CONTEXT\nHom nay la {today}.\nLICH SU:\n{history_text}\n"
    intent_map = {
        "SEARCH": "search_consult_prompt.txt", "CONSULTATION": "search_consult_prompt.txt",
        "FAQ": "faq_prompt.txt", "BOOK": "booking_prompt.txt", "GENERAL": "general_prompt.txt",
        "LOCAL_GUIDE": "local_guide_prompt.txt", "MANAGE_BOOKING": "manage_booking_prompt.txt",
        "RECOMMENDATION": "recommendation_prompt.txt", "ITINERARY": "itinerary_prompt.txt",
        "REVIEW_SUMMARY": "review_summary_prompt.txt", "PRICE_EXPLANATION": "price_explanation_prompt.txt",
        "UPSELL": "upsell_prompt.txt",
    }
    module_file = intent_map.get(intent_type, "general_prompt.txt")
    intent_module = _load_text_file(module_file)
    if intent_type == "FAQ":
        intent_module = intent_module.replace("{faq_context}", faq_context or "Không có thông tin FAQ.")
    prompt = f"{safety}\n\n{personal}\n\n{intent_module}"
    if extra_context:
        prompt = f"{prompt}\n\n{extra_context}"
    return prompt

# --- QUERY NORMALIZER ---
VIETNAMESE_ABBR = {
    "ks": "khach san", "vtau": "Vung Tau", "vt": "Vung Tau",
    "dn": "Da Nang", "dlat": "Da Lat", "dl": "Da Lat",
    "nt": "Nha Trang", "sg": "TP.HCM", "hn": "Ha Noi",
    "checkin": "check-in", "checkout": "check-out",
    "ho boi": "ho boi", "an sang": "an sang",
    "view dep": "view dep", "thu cung": "thu cung",
}
PRICE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(tr|trieu|m)", re.IGNORECASE)
PRICE_K_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(k|ngan)", re.IGNORECASE)
ITINERARY_DAYS_RE = re.compile(r"\b(\d+)\s*(?:ngay|day)\b", re.IGNORECASE)
ITINERARY_NIGHTS_RE = re.compile(r"\b(\d+)\s*(?:dem|night)\b", re.IGNORECASE)
ITINERARY_BUDGET_RE = re.compile(
    r"(?:budget|ngan sach|chi phi|tong chi phi|cho|duoi|khong qua|toi da)\D{0,20}(\d{3,})",
    re.IGNORECASE,
)

def normalize_query(text):
    n = text.lower().strip()
    def repl_m(m): return str(int(float(m.group(1).replace(",", ".")) * 1000000))
    def repl_k(m): return str(int(float(m.group(1).replace(",", ".")) * 1000))
    n = PRICE_RE.sub(repl_m, n)
    n = PRICE_K_RE.sub(repl_k, n)
    for abbr, full in VIETNAMESE_ABBR.items():
        n = re.sub(r'\b' + re.escape(abbr) + r'\b', full, n, flags=re.IGNORECASE)
    return n

# --- DATA MODELS ---
VALID_INTENTS = ["SEARCH","BOOK","FAQ","CONSULTATION","GENERAL","LOCAL_GUIDE","MANAGE_BOOKING","RECOMMENDATION","ITINERARY","REVIEW_SUMMARY","PRICE_EXPLANATION","UPSELL"]

class DateRange(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None

class RoutingResult(BaseModel):
    normalized_text: str
    intent_type: str
    location: Optional[str] = None
    budget: Optional[int] = None
    limit: Optional[int] = Field(default=5, description="Số lượng khách sạn người dùng muốn tìm, mặc định là 5")
    trip_days: Optional[int] = None
    trip_nights: Optional[int] = None
    price_min: Optional[int] = None
    price_max: Optional[int] = None
    dates: Optional[DateRange] = None
    guests_adults: Optional[int] = None
    semantic_query: Optional[str] = None
    target_hotel_name: Optional[str] = None
    hotel_id: Optional[int] = None
    secondary_intent: Optional[str] = None

# --- HELPERS ---
def get_db_connection():
    db_url = DATABASE_URL
    if db_url and "?" in db_url: db_url = db_url.split("?")[0]
    return psycopg2.connect(db_url)

def create_booking_link(slug_or_id, dates, adults=2):
    final_adults = adults if adults else 2
    return f"/checkout?hotelId={slug_or_id}&start={dates.start}&end={dates.end}&adults={final_adults}"

def _to_vnd(value):
    if value is None: return None
    return value * 1000000 if value < 1000 else value

def _strip_accents(text):
    if not text: return ""
    text = str(text).replace('đ', 'd').replace('Đ', 'D')
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").lower()

def _should_force_hotel_search(user_text, routing):
    normalized_text = _strip_accents(user_text or routing.normalized_text or "")
    # Thêm 'phong' vào danh sách kiểm tra
    hotel_query = bool(re.search(r"\b(khach san|hotel|resort|phong)\b", normalized_text))
    search_intent = bool(re.search(r"\b(tim|tìm|search|find|loc|lọc|xem)\b", normalized_text))
    comparison_query = bool(re.search(r"\b(so sanh|so sánh|tot nhat|tốt nhất|re nhat|rẻ nhất|cai nao|khach nao)\b", normalized_text))
    has_structured_filters = bool(routing.location or routing.price_min is not None or routing.price_max is not None or routing.semantic_query)
    return hotel_query and has_structured_filters and search_intent and not comparison_query

def _extract_location_price_from_text(normalized_text: str):
    loc = None
    price = None
    
    # BƯỚC QUAN TRỌNG: Lột sạch dấu tiếng Việt trước khi đưa vào Regex để tránh lỗi Unicode
    clean_text = _strip_accents(normalized_text)
    
    m = re.search(r"(\d{4,})", clean_text)
    if m:
        try: price = int(m.group(1))
        except: price = None
        
    if price:
        before = clean_text[: m.start()].strip()
        
        # Lúc này chữ "dưới" đã biến thành "duoi", Regex cắt bỏ chữ nhiễu sẽ hoạt động hoàn hảo
        before = re.sub(r'\s+(duoi|gia|khoang|tam|re hon|chi phi|muc|khoang gia)$', '', before).strip()
        
        # Regex giờ đây chỉ cần tìm các ký tự [a-z0-9] cơ bản, không lo lỗi font chữ nữa
        mloc = re.search(r"(?:khach san|hotel|resort|phong)\s+(?:o\s+|tai\s+)?([a-z0-9\s]{2,40})$", before)
        if not mloc:
            mloc = re.search(r"tim(?:.*?)(?:khach san|hotel|resort|phong)\s+(?:o\s+|tai\s+)?([a-z0-9\s]{2,40})$", before)
        
        if mloc: 
            loc = mloc.group(1).strip()
            
    return loc, price

def _normalize_hotel_ref(text):
    return re.sub(r"\s+", " ", _strip_accents(text or "").strip())

def _pick_hotel_from_last_results(user_text, last_hotels):
    if not last_hotels: return None
    normalized_text = _normalize_hotel_ref(user_text)
    
    if re.search(r"\b(dau tien|first|so 1|số 1|thu 1|thứ 1)\b", normalized_text):
        return last_hotels[0]
    if re.search(r"\b(cuoi cung|last|cuoi|so cuoi|số cuối)\b", normalized_text):
        return last_hotels[-1]
        
    index_match = re.search(r"\b(?:so|số|thu|thứ)\s*(\d+)\b", normalized_text)
    if index_match:
        requested_index = int(index_match.group(1)) - 1
        if 0 <= requested_index < len(last_hotels):
            return last_hotels[requested_index]
            
    best_score = 0.0
    best_hotel = None
    query_tokens = set(normalized_text.split())
    
    for hotel in last_hotels:
        title = _normalize_hotel_ref(hotel.get("title", ""))
        address = _normalize_hotel_ref(hotel.get("address", ""))
        candidate_text = f"{title} {address}".strip()
        if not candidate_text: continue
        
        score = SequenceMatcher(None, normalized_text, candidate_text).ratio()
        if query_tokens:
            candidate_tokens = set(candidate_text.split())
            token_overlap = len(query_tokens & candidate_tokens) / len(query_tokens) if query_tokens else 0
            score = max(score, token_overlap)
        if title and (title in normalized_text or normalized_text in title):
            score = max(score, 1.0)
            
        if score > best_score:
            best_score = score
            best_hotel = hotel
            
    return best_hotel if best_score >= 0.45 else None

def _any_hotel_name_in_text(user_text, hotels):
    normalized_text = _normalize_hotel_ref(user_text)
    
    # Ưu tiên 1: So khớp chính xác 100% (Trường hợp user gõ đúng y xì tên)
    for hotel in hotels:
        title = _normalize_hotel_ref(hotel.get("title", ""))
        if title and title in normalized_text:
            return hotel
            
    # Ưu tiên 2: So khớp mờ (Fuzzy match) - Tìm khách sạn có số lượng từ khóa trùng NHIỀU NHẤT
    best_hotel = None
    max_matches = 0
    
    for hotel in hotels:
        title = _normalize_hotel_ref(hotel.get("title", ""))
        # Tách từ và lấy các từ có 2 ký tự trở lên (để bắt được cả số như 50, 75)
        title_tokens = [t for t in title.split() if len(t) > 1] 
        
        # Đếm xem có bao nhiêu từ của khách sạn này nằm trong câu của user
        matches = sum(1 for t in title_tokens if t in normalized_text)
        
        # Cập nhật nếu tìm thấy khách sạn có số điểm trùng khớp cao hơn
        if matches > max_matches:
            max_matches = matches
            best_hotel = hotel
            
    # Yêu cầu ít nhất khớp 2 từ (để tránh chỉ khớp mỗi chữ "vung" hoặc "tau" của khách sạn khác)
    if max_matches >= 2:
        return best_hotel
        
    return None

def _resolve_recent_hotel_reference(user_text, user_id):
    last_hotels = get_last_hotels(user_id)
    if not last_hotels: return None
    matched = _any_hotel_name_in_text(user_text, last_hotels)
    if matched: return matched
    return _pick_hotel_from_last_results(user_text, last_hotels)

def search_hotels_rag(intent_obj):
    conn = get_db_connection()
    cur = conn.cursor()
    result_limit = intent_obj.limit if (intent_obj.limit and intent_obj.limit > 0) else 10

    query = 'SELECT id, title, price, address, "reviewStar", "featuredImage", slug, map, description FROM hotels WHERE 1=1'
    params = []
    comparison_intents = {"CONSULTATION", "RECOMMENDATION", "LOCAL_GUIDE", "ITINERARY"}
    has_structured_filters = intent_obj.location or intent_obj.price_min is not None or intent_obj.price_max is not None

    if intent_obj.target_hotel_name and intent_obj.intent_type not in comparison_intents and not has_structured_filters:
        query += " AND title ILIKE %s"
        params.append(f"%{intent_obj.target_hotel_name}%")
        query += f" ORDER BY price ASC LIMIT %s"
        params.append(result_limit)
    else:
        if intent_obj.price_min is not None:
            query += " AND price >= %s"
            params.append(_to_vnd(intent_obj.price_min))
        if intent_obj.price_max is not None:
            query += " AND price <= %s"
            params.append(_to_vnd(intent_obj.price_max))
        if intent_obj.location:
            query += " AND (address ILIKE %s OR title ILIKE %s)"
            params.append(f"%{intent_obj.location}%")
            params.append(f"%{intent_obj.location}%")
            
        query += f" ORDER BY price ASC LIMIT %s"
        params.append(result_limit)

    def _fallback_rows_without_unaccent():
        fallback_query = 'SELECT id, title, price, address, "reviewStar", "featuredImage", slug, map, description FROM hotels WHERE 1=1'
        fallback_params = []
        if intent_obj.price_min is not None:
            fallback_query += " AND price >= %s"
            fallback_params.append(_to_vnd(intent_obj.price_min))
        if intent_obj.price_max is not None:
            fallback_query += " AND price <= %s"
            fallback_params.append(_to_vnd(intent_obj.price_max))
        
        fallback_query += " ORDER BY price ASC" 
        cur.execute(fallback_query, tuple(fallback_params))
        fallback_rows = cur.fetchall()
        
        if not intent_obj.location: return fallback_rows[:result_limit]
            
        location_key = _strip_accents(intent_obj.location)
        matched_rows = []
        for rw in fallback_rows:
            searchable_text = _strip_accents(f"{rw[1] or ''} {rw[3] or ''}")
            if location_key in searchable_text: matched_rows.append(rw)
        return matched_rows[:result_limit]

    try:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
    except Exception as e:
        print(f"SQL Error: {e}")
        try: conn.rollback()
        except: pass
        rows = []

    if intent_obj.location and not rows:
        try: rows = _fallback_rows_without_unaccent()
        except Exception as fallback_error:
            print(f"SQL Fallback Error: {fallback_error}")
            rows = []

    results = []
    for rw in rows:
        map_data = None
        if len(rw) > 7 and rw[7]:
            try: map_data = json.loads(rw[7]) if isinstance(rw[7], str) else rw[7]
            except: pass
        results.append({
            "id": rw[0], "title": rw[1], "price": float(rw[2]), "address": rw[3],
            "rating": float(rw[4]) if rw[4] else 0,
            "image": rw[5] if rw[5] else "https://placehold.co/600x400?text=No+Image",
            "slug": rw[6] if len(rw) > 6 and rw[6] else str(rw[0]),
            "map": map_data, "description": rw[8] if len(rw) > 8 and rw[8] else ""
        })
    cur.close(); conn.close()
    return results

def _llm_generate(system_prompt, user_text, temperature=0.3):
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_text}],
        temperature=temperature)
    return completion.choices[0].message.content

def _build_hotel_context(hotels):
    if not hotels: return "[DATABASE HOTELS]\n(empty - no hotels found)\n"
    lines = ["[DATABASE HOTELS]"]
    for i, h in enumerate(hotels, 1):
        price_fmt = f"{int(h['price']):,} VND"
        rating_str = f", rating {h['rating']}" if h.get("rating") else ""
        lines.append(f"{i}. {h['title']} - gia {price_fmt}/dem{rating_str} - dia chi: {h['address']}")
    return "\n".join(lines)

def _resolve_itinerary_duration(routing):
    trip_days = routing.trip_days
    trip_nights = routing.trip_nights
    if trip_days is None and trip_nights is not None: trip_days = trip_nights + 1
    if trip_nights is None and trip_days is not None: trip_nights = max(trip_days - 1, 0)
    return trip_days, trip_nights

def _resolve_itinerary_budget(routing):
    if routing.budget is not None: return routing.budget
    if routing.intent_type == "ITINERARY" and routing.price_max is not None: return routing.price_max
    return None

def _fallback_itinerary_fields(routing):
    if routing.intent_type != "ITINERARY": return routing
    normalized_text = routing.normalized_text or ""
    if routing.trip_days is None:
        match = ITINERARY_DAYS_RE.search(normalized_text)
        if match: routing.trip_days = int(match.group(1))
    if routing.trip_nights is None:
        match = ITINERARY_NIGHTS_RE.search(normalized_text)
        if match: routing.trip_nights = int(match.group(1))
    if routing.budget is None:
        match = ITINERARY_BUDGET_RE.search(normalized_text)
        if match: routing.budget = int(match.group(1))
        elif routing.price_max is not None and re.search(r"\b(duoi|khong qua|toi da|budget|ngan sach)\b", normalized_text):
            routing.budget = routing.price_max
    return routing

def _extract_date(user_text):
    from datetime import date as dt_date
    today = dt_date.today()
    if re.search(r"\bngay mai\b", user_text, re.IGNORECASE):
        tomorrow = today + timedelta(days=1)
        return tomorrow.strftime("%Y-%m-%d")
    m = re.search(r"ng[àa]y\s*(\d{1,2})\s*[/\-]\s*(\d{1,2})", user_text, re.IGNORECASE)
    if m:
        day, month = int(m.group(1)), int(m.group(2))
        if month > 12: day, month = month, day
        year = today.year if month >= today.month or (month == today.month and day >= today.day) else today.year + 1
        return f"{year}-{month:02d}-{day:02d}"
    m = re.search(r"ng[àa]y\s*(\d{1,2})", user_text, re.IGNORECASE)
    if m:
        day = int(m.group(1))
        month = today.month if day >= today.day else today.month + 1
        if month > 12: month = 1
        year = today.year if month >= today.month else today.year + 1
        return f"{year}-{month:02d}-{day:02d}"
    m = re.search(r"(\d{1,2})\s*[/\-]\s*(\d{1,2})", user_text)
    if m:
        day, month = int(m.group(1)), int(m.group(2))
        if month > 12: day, month = month, day
        year = today.year if month >= today.month or (month == today.month and day >= today.day) else today.year + 1
        return f"{year}-{month:02d}-{day:02d}"
    return None

def _extract_guests(user_text):
    m = re.search(r"(\d+)\s*(nguoi|khach|adult|người|khách)", user_text, re.IGNORECASE)
    if m: return int(m.group(1))
    return None

def _is_explicit_booking_intent(user_text):
    text = user_text.lower().strip()
    search_words = ["tìm", "kiếm", "loc", "lọc", "xem", "có phòng không", "giá", "phòng"]
    for w in search_words:
        if w in text: return False
    booking_words = ["đặt", "book", "muốn đặt", "đặt cho", "xác nhận", "confirm", "order"]
    for w in booking_words:
        if w in text: return True
    return False

# --- ENTERPRISE ORCHESTRATOR PIPELINE ---
def run_agent_logic(user_text, user_id):
    today = datetime.now().strftime("%Y-%m-%d (%A)")
    chat_history = get_chat_history(user_id)
    history_text = ""
    for msg in chat_history:
        role = "User" if msg["role"] == "user" else "AI"
        history_text += f"{role}: {msg['content']}\n"
        
    booking_state = get_booking_state(user_id)
    extracted_date = _extract_date(user_text)
    extracted_guests = _extract_guests(user_text)

    force_booking = False
    routing = None

    # Chặn đứng lỗi cướp trạng thái (State Hijacking)
    is_explicit_search = bool(re.search(r"\b(tim|tìm|kiếm|search|find|loc|lọc|xem|ks|khách sạn)\b", user_text.lower()))

    if booking_state and (extracted_date or extracted_guests) and not is_explicit_search:
        print(f"[BOOKING STATE] Resume booking {booking_state['hotel_name']}")
        routing = RoutingResult(
            normalized_text=normalize_query(user_text),
            intent_type="BOOK",
            hotel_id=booking_state["hotel_id"],
            target_hotel_name=booking_state["hotel_name"],
            guests_adults=extracted_guests or 2,
            dates=DateRange(start=extracted_date) if extracted_date else None
        )
        force_booking = True

    if not force_booking:
        resolved_hotel = _resolve_recent_hotel_reference(user_text, user_id)
        
        if _is_explicit_booking_intent(user_text) and resolved_hotel:
            print(f"🎯 [State Guard] Bắt được intent BOOK trực tiếp -> {resolved_hotel['title']}")
            routing = RoutingResult(
                normalized_text=normalize_query(user_text),
                intent_type="BOOK",
                target_hotel_name=resolved_hotel["title"],
                hotel_id=resolved_hotel["id"],
                dates=DateRange(start=extracted_date) if extracted_date else None,
                guests_adults=extracted_guests or 2
            )
        else:
            route_prompt = f"""Ban la AI Router cho Stazy. Thuc hien 2 viec:
1. CHUAN HOA cau hoi (sua viet tat: ks->khach san, vtau->Vung Tau, 2tr->2000000)
2. PHAN LOAI intent va TRICH XUAT tham so.

INTENTS: {', '.join(VALID_INTENTS)}
... (giữ nguyên phần text prompt gốc của bạn để tiết kiệm space) ...
LICH SU: {history_text}"""
            try:
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "system", "content": route_prompt}, {"role": "user", "content": user_text}],
                    tools=[{"type": "function", "function": {"name": "route_query", "description": "Normalize and classify intent", "parameters": RoutingResult.model_json_schema()}}],
                    tool_choice="auto", temperature=0.1)
                tc = completion.choices[0].message.tool_calls
                if tc:
                    routing = RoutingResult(**json.loads(tc[0].function.arguments))
                else:
                    ai_content = completion.choices[0].message.content
                    routing = RoutingResult(normalized_text=user_text, intent_type="GENERAL")
                
                routing.normalized_text = normalize_query(routing.normalized_text)
                routing.intent_type = routing.intent_type if routing.intent_type in VALID_INTENTS else "GENERAL"
                routing = _fallback_itinerary_fields(routing)
                norm_text = routing.normalized_text or ""
                non_search_intents = {"REVIEW_SUMMARY", "PRICE_EXPLANATION", "LOCAL_GUIDE", "ITINERARY", "CONSULTATION", "BOOK", "MANAGE_BOOKING", "FAQ", "RECOMMENDATION"}
                referring_to_current = bool(re.search(r"(khách sạn này|của khách sạn|khách sạn.*này)", user_text, re.IGNORECASE))
                
                if routing.intent_type not in non_search_intents and not referring_to_current:
                    # Bổ sung thêm |phong| vào Regex
                    explicit_hotel_word = bool(re.search(r"\b(khach san|hotel|resort|phong)\b", _strip_accents(norm_text)))
                    explicit_price_present = bool(re.search(r"(\d{4,})", norm_text))
                    
                    if _should_force_hotel_search(user_text, routing) or (explicit_hotel_word and explicit_price_present):
                        loc, price = _extract_location_price_from_text(norm_text)
                        if not routing.location and loc: routing.location = loc
                        if routing.price_max is None and price: routing.price_max = price
                        routing.intent_type = "SEARCH"
                print(f"[Agent Router] Intent={routing.intent_type} | Location={routing.location}")
            except Exception as e:
                em = str(e).lower()
                if "timeout" in em or "timed out" in em:
                    return {"agent_response": "Hệ thống quá tải, vui lòng thử lại sau.", "intent": {"intent_type": "GENERAL"}, "data": {"hotels": [], "booking_link": None}}
                routing = RoutingResult(normalized_text=user_text, intent_type="GENERAL")

        # SAFEGUARD: BOOK overridden to SEARCH if has search words + location
        if routing.intent_type == "BOOK":
            if routing.location and re.search(r"\b(tim|tìm|kiếm|loc|lọc|xem)\b", user_text, re.IGNORECASE):
                routing.intent_type = "SEARCH"
            elif not routing.location and not routing.target_hotel_name:
                if not re.search(r"\b(dat|book|đặt|muon|muốn)\b", user_text, re.IGNORECASE):
                    routing.intent_type = "GENERAL"

        if routing.intent_type == "BOOK" and not force_booking:
            extracted_date = _extract_date(user_text)
            extracted_guests = _extract_guests(user_text)
            last_hotels_for_booking = get_last_hotels(user_id)
            ongoing_booking = False
            if chat_history and last_hotels_for_booking:
                last_ai = next((m for m in reversed(chat_history) if m["role"] == "assistant"), None)
                if last_ai and ("ngay check-in" in last_ai.get("content", "").lower() or "ngay" in last_ai.get("content", "").lower()):
                    ongoing_booking = True
            
            if ongoing_booking and (extracted_date or extracted_guests) and last_hotels_for_booking:
                history_hotel_name = None
                user_messages = [msg for msg in reversed(chat_history) if msg.get("role") == "user"]
                for msg in user_messages:
                    matched = _resolve_recent_hotel_reference(msg.get("content", ""), user_id)
                    if matched:
                        history_hotel_name = matched
                        break
                if not history_hotel_name: history_hotel_name = last_hotels_for_booking[0]
                
                routing.target_hotel_name = history_hotel_name["title"]
                routing.hotel_id = history_hotel_name["id"]
                routing.dates = DateRange(start=extracted_date) if extracted_date else routing.dates
                routing.guests_adults = extracted_guests or routing.guests_adults or 2

    response = {"agent_response": "", "intent": {"intent_type": routing.intent_type}, "data": {"hotels": [], "booking_link": None}}
    referenced_hotel = _resolve_recent_hotel_reference(user_text, user_id)
    
    if referenced_hotel and routing.intent_type != "BOOK":
        routing.target_hotel_name = referenced_hotel.get("title") or routing.target_hotel_name
        routing.hotel_id = referenced_hotel.get("id") or routing.hotel_id
        if not routing.location and referenced_hotel.get("address"):
            routing.location = referenced_hotel.get("address")

    faq_context = ""
    if routing.intent_type == "FAQ":
        faq_context = retrieve_faq_context(routing.normalized_text, top_k=2)

    # --- ROUTE HANDLERS ---
    if routing.intent_type == "SEARCH":
        hotels = search_hotels_rag(routing)
        if not hotels:
            lt = routing.location or "đây"
            response["agent_response"] = f"Tiếc quá, mình không tìm thấy phòng nào ở {lt} phù hợp yêu cầu."
        else:
            response["agent_response"] = f"Minh tim thay {len(hotels)} lua chon phu hop:"
            response["data"]["hotels"] = hotels
            save_last_hotels(user_id, hotels)

    elif routing.intent_type == "BOOK":
        if not routing.dates or not routing.dates.start:
            extracted_date = _extract_date(user_text)
            if extracted_date: routing.dates = DateRange(start=extracted_date)
        if routing.guests_adults is None:
            extracted_guests = _extract_guests(user_text)
            if extracted_guests: routing.guests_adults = extracted_guests
        if not routing.target_hotel_name or len(_normalize_hotel_ref(routing.target_hotel_name)) <= 3:
            recent_hotel = _resolve_recent_hotel_reference(user_text, user_id)
            if recent_hotel:
                routing.target_hotel_name = recent_hotel["title"]
                routing.hotel_id = recent_hotel["id"]

        missing = []
        if not routing.dates or not routing.dates.start: missing.append("ngay check-in")
        if routing.guests_adults is None: missing.append("so luong nguoi")
        if not routing.target_hotel_name or len(_normalize_hotel_ref(routing.target_hotel_name)) <= 3: missing.append("khach san")
        
        if missing:
            join_str = " va ".join(missing)
            response["agent_response"] = f"Để mình đặt phòng giúp, bạn cho mình biết **{join_str}** nhé?"
            
            # CHỈ LƯU TRẠNG THÁI TẠI ĐÂY KHI CHẮC CHẮN ĐANG TRONG LUỒNG BOOK VÀ THIẾU INFO
            if routing.target_hotel_name and routing.hotel_id:
                save_booking_state(user_id, {
                    "hotel_id": routing.hotel_id,
                    "hotel_name": routing.target_hotel_name,
                    "step": "waiting_info"
                })
        else:
            fh = []
            if routing.hotel_id is not None:
                try:
                    conn = get_db_connection()
                    cur = conn.cursor()
                    cur.execute('SELECT id, title, price, address, "reviewStar", "featuredImage", slug, map, description FROM hotels WHERE id = %s LIMIT 1', (routing.hotel_id,))
                    row = cur.fetchone()
                    if row:
                        map_data = json.loads(row[7]) if (len(row) > 7 and row[7] and isinstance(row[7], str)) else row[7]
                        fh = [{"id": row[0], "title": row[1], "price": float(row[2]), "address": row[3], "rating": float(row[4]) if row[4] else 0, "image": row[5] or "https://placehold.co/600x400?text=No+Image", "slug": row[6] or str(row[0]), "map": map_data, "description": row[8] or ""}]
                    cur.close(); conn.close()
                except Exception as e: print(f"[BOOK] Database lookup error: {e}")
            
            if not fh: fh = search_hotels_rag(routing)
            if fh:
                top = fh[0]
                ident = top.get("slug") or top.get("id")
                if routing.dates and routing.dates.start:
                    if not routing.dates.end:
                        try: routing.dates.end = (datetime.strptime(routing.dates.start, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
                        except: pass
                    guests = routing.guests_adults or 2
                    response["agent_response"] = f"Đã tạo đơn cho **{top['title']}**.\nNgày: {routing.dates.start} -> {routing.dates.end} ({guests} khách)."
                    response["data"]["hotels"] = [top]
                    response["data"]["booking_link"] = create_booking_link(ident, routing.dates, routing.guests_adults)
                    
                    clear_booking_state(user_id) # Đặt thành công -> Xóa trạng thái chờ đặt phòng
                else:
                    response["agent_response"] = f"Đã tạo đơn cho **{top['title']}**.\nVui lòng xác nhận ngày check-in để hoàn tất."
                    response["data"]["hotels"] = [top]
            else:
                response["agent_response"] = f"Xin lỗi, không tìm thấy **{routing.target_hotel_name}**."

    # --- KHỐI XỬ LÝ KHÁC (GENERAL, FAQ, ITINERARY...) GIỮ NGUYÊN CODE CŨ CỦA BẠN ---
    elif routing.intent_type in ("CONSULTATION", "RECOMMENDATION"):
        consult_hotels = search_hotels_rag(routing)
        hotel_ctx = _build_hotel_context(consult_hotels)
        prompt = compose_prompt(routing.intent_type, history_text, today)
        if hotel_ctx: prompt = f"{prompt}\n\n{hotel_ctx}"
        try: response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except: response["agent_response"] = "Dựa trên danh sách đã gợi ý, bạn muốn đặt cái nào?"
        if consult_hotels: response["data"]["hotels"] = consult_hotels

    elif routing.intent_type == "GENERAL":
        last_hotels = get_last_hotels(user_id)
        last_hotels_ctx = ""
        if last_hotels:
            lines = ["[DANH SACH KHACH SAN DA TIM THAY TRUOC DO]"]
            for i, h in enumerate(last_hotels, 1):
                price_fmt = f"{int(h['price']):,} VND" if h.get('price') else "N/A"
                lines.append(f"{i}. {h['title']} - {price_fmt}/dem - {h.get('address', '')}")
            last_hotels_ctx = "\n".join(lines)
        prompt = compose_prompt("GENERAL", history_text, today, extra_context=last_hotels_ctx)
        try: response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except: response["agent_response"] = "Mình có thể giúp bạn tìm phòng. Bạn cần gì?"

    else:
        # Fallback chung cho các intent khác của bạn
        try:
            prompt = compose_prompt(routing.intent_type, history_text, today)
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = "Mình có thể giúp bạn đặt phòng khách sạn. Bạn cần gì?"

    save_message_to_context(user_id, "user", user_text)
    save_message_to_context(user_id, "assistant", response["agent_response"])
    return response