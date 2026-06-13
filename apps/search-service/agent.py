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
    hotel_query = bool(re.search(r"\b(khach san|hotel|resort|phong)\b", normalized_text))
    search_intent = bool(re.search(r"\b(tim|tìm|search|find|loc|lọc|xem)\b", normalized_text))
    comparison_query = bool(re.search(r"\b(so sanh|so sánh|tot nhat|tốt nhất|re nhat|rẻ nhất|cai nao|khach nao)\b", normalized_text))
    has_structured_filters = bool(routing.location or routing.price_min is not None or routing.price_max is not None or routing.semantic_query)
    return hotel_query and has_structured_filters and search_intent and not comparison_query

def _extract_location_price_from_text(normalized_text: str):
    loc = None
    price = None
    clean_text = _strip_accents(normalized_text)
    m = re.search(r"(\d{4,})", clean_text)
    if m:
        try: price = int(m.group(1))
        except: price = None
    if price:
        before = clean_text[: m.start()].strip()
        before = re.sub(r'\s+(duoi|gia|khoang|tam|re hon|chi phi|muc|khoang gia)$', '', before).strip()
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
    for hotel in hotels:
        title = _normalize_hotel_ref(hotel.get("title", ""))
        if title and title in normalized_text:
            return hotel
    best_hotel = None
    max_matches = 0
    for hotel in hotels:
        title = _normalize_hotel_ref(hotel.get("title", ""))
        title_tokens = [t for t in title.split() if len(t) > 1]
        matches = sum(1 for t in title_tokens if t in normalized_text)
        if matches > max_matches:
            max_matches = matches
            best_hotel = hotel
    if max_matches >= 2:
        return best_hotel
    return None

def _resolve_recent_hotel_reference(user_text, user_id):
    last_hotels = get_last_hotels(user_id)
    if not last_hotels: return None
    matched = _any_hotel_name_in_text(user_text, last_hotels)
    if matched: return matched
    return _pick_hotel_from_last_results(user_text, last_hotels)

# --- NEW: Fetch FULL hotel data from DB for context-aware intents ---
def _fetch_hotel_full_data(hotel_id: Optional[int], hotel_name: Optional[str]) -> Dict[str, Any]:
    """Fetch complete hotel data including reviews, description, amenities from the database."""
    resolved_id = hotel_id
    resolved_name = hotel_name
    
    # If we only have name, look up the ID first
    if not resolved_id and resolved_name:
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute('SELECT id FROM hotels WHERE title ILIKE %s LIMIT 1', (f"%{resolved_name}%",))
            row = cur.fetchone()
            if row:
                resolved_id = row[0]
            cur.close()
            conn.close()
        except Exception as e:
            print(f"[_fetch_hotel_full_data] Lookup error: {e}")
    
    if not resolved_id:
        return {}
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Fetch hotel base info
        cur.execute(
            'SELECT id, title, price, address, "reviewStar", "featuredImage", slug, map, description, amenities, "suitableFor" FROM hotels WHERE id = %s LIMIT 1',
            (resolved_id,)
        )
        row = cur.fetchone()
        
        if not row:
            cur.close()
            conn.close()
            return {}
        
        map_data = None
        if len(row) > 7 and row[7]:
            try:
                map_data = json.loads(row[7]) if isinstance(row[7], str) else row[7]
            except:
                pass
        
        amenities = []
        if len(row) > 9 and row[9]:
            try:
                if isinstance(row[9], str):
                    amenities = json.loads(row[9]) if row[9].startswith('[') else [row[9]]
                elif isinstance(row[9], (list, tuple)):
                    amenities = list(row[9])
            except:
                amenities = [str(row[9])]
        
        suitable_for = []
        if len(row) > 10 and row[10]:
            try:
                if isinstance(row[10], str):
                    suitable_for = json.loads(row[10]) if row[10].startswith('[') else [row[10]]
                elif isinstance(row[10], (list, tuple)):
                    suitable_for = list(row[10])
            except:
                suitable_for = [str(row[10])]
        
        # Fetch reviews from the Review table
        review_text = ""
        try:
            cur.execute(
                'SELECT comment FROM "Review" WHERE "hotelId" = %s AND comment IS NOT NULL AND comment != \'\' ORDER BY "createdAt" DESC LIMIT 5',
                (resolved_id,)
            )
            review_rows = cur.fetchall()
            if review_rows:
                review_text = "\n".join([r[0] for r in review_rows if r[0]])
        except Exception as e:
            print(f"[_fetch_hotel_full_data] Review query error: {e}")
            # Try alternative table name casing
            try:
                cur.execute(
                    'SELECT comment FROM review WHERE hotel_id = %s AND comment IS NOT NULL AND comment != \'\' ORDER BY created_at DESC LIMIT 5',
                    (resolved_id,)
                )
                review_rows = cur.fetchall()
                if review_rows:
                    review_text = "\n".join([r[0] for r in review_rows if r[0]])
            except:
                pass
        
        cur.close()
        conn.close()
        
        result = {
            "id": row[0],
            "title": row[1],
            "price": float(row[2]) if row[2] else 0,
            "address": row[3] or "",
            "rating": float(row[4]) if row[4] else 0,
            "image": row[5] or "https://placehold.co/600x400?text=No+Image",
            "slug": row[6] or str(row[0]),
            "map": map_data,
            "description": row[8] or "Chưa có mô tả.",
            "original_hotel_id": resolved_id,
        }
        
        if review_text:
            result["review_text"] = review_text
        else:
            result["review_text"] = "Chưa có đánh giá nào."
        
        if amenities:
            result["amenities"] = amenities
        
        if suitable_for:
            result["suitable_for"] = suitable_for
        
        return result
    except Exception as e:
        print(f"[_fetch_hotel_full_data] Error: {e}")
        return {}

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
    # First check for booking keywords - these take priority
    booking_words = ["đặt", "book", "muốn đặt", "muốn book", "đặt cho", "xác nhận", "confirm", "order"]
    for w in booking_words:
        if w in text: return True
    # Only block booking if the user is explicitly searching or asking
    search_words = ["tìm", "kiếm", "loc", "lọc", "xem", "có phòng không"]
    for w in search_words:
        if w in text: return False
    return False

# --- NEW: EXTRACT CONTEXT FROM FRONTEND PREFIX ---
def _extract_context_info(user_text):
    """
    Extract hotel context from frontend prefix format:
    [Context: User đang xem khách sạn "Hotel Name" tại Address, giá Price, rating X]
    Returns (cleaned_text, hotel_name, hotel_address, hotel_location)
    """
    context_match = re.search(
        r'\[Context:.*?khách sạn\s+"([^"]+)"\s+tại\s+([^\]]+?)\]',
        user_text,
        re.IGNORECASE
    )
    if not context_match:
        return user_text, None, None, None

    hotel_name = context_match.group(1).strip()
    raw_addr_block = context_match.group(2).strip()
    raw_addr_block = re.sub(r'\s*\.\s*Trả.*?$', '', raw_addr_block)

    # Strip price/rating suffix from address
    clean_address = re.sub(r',\s*(giá|price).*$', '', raw_addr_block, flags=re.IGNORECASE).strip()
    # Clean up context prefix from user_text
    cleaned_text = re.sub(r'\[Context:.*?\]\s*\n*\s*', '', user_text, count=1).strip()

    # Extract location from clean address
    addr_parts = [p.strip() for p in clean_address.split(',')]
    non_country = [p for p in addr_parts if p.lower() not in ('việt nam', 'vietnam', 'viet nam')]
    if len(non_country) >= 2:
        location = non_country[-2]
    elif len(non_country) == 1:
        # Try to extract city name from street address like "257 Đường Vũng Tàu"
        city_keywords = [
            'vũng tàu', 'vung tau', 'đà lạt', 'da lat', 'nha trang',
            'đà nẵng', 'da nang', 'hồ chí minh', 'hà nội', 'ha noi',
            'phú quốc', 'phu quoc', 'hội an', 'hoi an', 'huế', 'hue',
            'sapa', 'phong nha', 'cần thơ', 'can tho', 'mũi né', 'mui ne',
        ]
        address_lower = non_country[0].lower()
        found_city = None
        for kw in city_keywords:
            if kw in address_lower:
                found_city = kw.title()
                break
        if found_city:
            location = found_city
        else:
            street_words = non_country[0].split()
            if len(street_words) >= 2:
                last_word = street_words[-1].lower()
                if last_word in ('tàu', 'tau', 'lạt', 'lat', 'trang', 'nẵng', 'nang', 'quốc', 'quoc', 'an'):
                    location = ' '.join(street_words[-2:]).title()
                else:
                    location = street_words[-1].title()
            else:
                location = non_country[0]
    else:
        location = None

    return cleaned_text, hotel_name, clean_address, location


# ============ BEGIN SEARCH_REGEX: Detect SEARCH intent before LLM Router ============
# Groq's function calling is unreliable for Vietnamese text.
# We use regex to catch "tìm khách sạn/phòng ở [địa điểm] [giá]" patterns
# BEFORE the regex chip patterns and BEFORE the LLM Router.
def _detect_search_intent(clean_lower):
    """
    Returns RoutingResult with intent_type='SEARCH' if clean_lower matches
    a search pattern, otherwise returns None.
    """
    # MATCH: "tìm phòng/khách sạn/ks ở [địa điểm]" OR "phòng/ks [địa điểm]"
    # OR "xem phòng/ks [địa điểm]"
    has_search_verb = bool(re.search(r"\b(tim|tìm|kiem|kiếm|search|find|loc|lọc|xem)\b", clean_lower))
    has_hotel_noun = bool(re.search(r"\b(khach san|hotel|resort|phong|ks)\b", clean_lower))
    
    if not has_search_verb and not has_hotel_noun:
        return None
    
    # Extract location
    locations = {
        "vung tau": "Vung Tau", "vũng tàu": "Vung Tau",
        "da nang": "Da Nang", "đà nẵng": "Da Nang",
        "da lat": "Da Lat", "đà lạt": "Da Lat",
        "nha trang": "Nha Trang",
        "ha noi": "Ha Noi", "hà nội": "Ha Noi",
        "tp hcm": "TP.HCM", "hcm": "TP.HCM", "hồ chí minh": "TP.HCM", "tp.hcm": "TP.HCM",
        "phu quoc": "Phu Quoc", "phú quốc": "Phu Quoc",
        "hoi an": "Hoi An", "hội an": "Hoi An",
        "hue": "Hue", "huế": "Hue",
        "sapa": "Sapa", "sa pa": "Sapa",
        "can tho": "Can Tho", "cần thơ": "Can Tho",
        "ben tre": "Ben Tre", "bến tre": "Ben Tre",
        "mui ne": "Mui Ne", "mũi né": "Mui Ne",
        "phong nha": "Phong Nha", "phong nha ke bang": "Phong Nha",
    }
    
    search_location = None
    for loc_key, loc_val in locations.items():
        if loc_key in clean_lower:
            search_location = loc_val
            break
    
    # Try simpler fallback: if user said "ở X" where X is a single word
    if not search_location:
        m = re.search(r"\b(o|tai|ở|tại)\s+(\w+)", clean_lower)
        if m:
            search_location = m.group(2).title()
    
    # Extract price_max: "dưới X triệu", "duoi X trieu", "duoi X", "dưới X"
    search_price_max = None
    price_match = re.search(r"(?:duoi|dưới|dươi|khong qua|toi da|gia re|re|duoi|below)\s*(\d+(?:[.,]\d+)?)(?:\s*(tr|trieu|m|t))?\b", clean_lower)
    if price_match:
        val = float(price_match.group(1).replace(",", "."))
        unit = price_match.group(2)
        if unit and unit.lower() in ("tr", "trieu", "m", "t"):
            search_price_max = int(val * 1000000)
        elif val < 1000:
            search_price_max = int(val * 1000000)  # Assume millions for small numbers
        else:
            search_price_max = int(val)
    else:
        # Also try just number + unit without explicit "duoi" keyword
        # Only if we found a location (to avoid matching random numbers)
        if search_location:
            price_match2 = re.search(r"(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|t)\b", clean_lower)
            if price_match2:
                val = float(price_match2.group(1).replace(",", "."))
                search_price_max = int(val * 1000000)
    
    if search_location or search_price_max:
        routing = RoutingResult(
            normalized_text=normalize_query(clean_lower),
            intent_type="SEARCH",
            location=search_location,
            price_max=search_price_max,
            limit=10,
        )
        print(f"[Agent Search Regex] SEARCH detected: loc={search_location}, price_max={search_price_max}")
        return routing
    
    return None
# ============ END SEARCH_REGEX ============


# --- ENTERPRISE ORCHESTRATOR PIPELINE ---
def run_agent_logic(user_text, user_id):
    today = datetime.now().strftime("%Y-%m-%d (%A)")

    # Extract context info from frontend prefix
    clean_user_text, context_hotel_name, context_address, context_location = _extract_context_info(user_text)

    chat_history = get_chat_history(user_id)
    history_text = ""
    for msg in chat_history:
        role = "User" if msg["role"] == "user" else "AI"
        history_text += f"{role}: {msg['content']}\n"

    booking_state = get_booking_state(user_id)
    extracted_date = _extract_date(clean_user_text)
    extracted_guests = _extract_guests(clean_user_text)

    force_booking = False
    routing = None

    is_explicit_search = bool(re.search(r"\b(tim|tìm|kiếm|search|find|loc|lọc|xem|ks|khách sạn)\b", clean_user_text.lower()))

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
        # FIX: Use clean_user_text to resolve hotel reference (without context prefix)
        # The context prefix contains the CURRENT hotel name, which would match incorrectly
        # when user asks about a DIFFERENT hotel from the search results list
        resolved_hotel = _resolve_recent_hotel_reference(clean_user_text, user_id)

        if _is_explicit_booking_intent(clean_user_text) and resolved_hotel:
            print(f"🎯 [State Guard] BOOK -> {resolved_hotel['title']}")
            routing = RoutingResult(
                normalized_text=normalize_query(user_text),
                intent_type="BOOK",
                target_hotel_name=resolved_hotel["title"],
                hotel_id=resolved_hotel["id"],
                dates=DateRange(start=extracted_date) if extracted_date else None,
                guests_adults=extracted_guests or 2
            )
        else:
            # ============ FIX: Pre-classify known chip patterns via regex BEFORE LLM Router ============
            # LLaMA 3.3 function calling is unreliable for Vietnamese chip questions
            # that reference "khách sạn này" without the explicit hotel name.
            # Regex pre-classification ensures 100% correct intent for known chip patterns.
            # Normalize both patterns and text using strip_accents for robust matching
            clean_lower = _strip_accents(clean_user_text.lower().strip())
            
            # ============ FIX 5: SEARCH regex pre-classification (BEFORE chip patterns) ============
            # Groq function calling for Vietnamese is unreliable, so we use regex to detect
            # "tìm phòng/khách sạn ở [địa điểm]" patterns BEFORE the LLM Router.
            search_routing = _detect_search_intent(clean_lower)
            if search_routing:
                routing = search_routing
            
            # Pattern: "nổi bật", "điểm nổi bật", "review", "đánh giá", "highlights"
            elif any(w in clean_lower for w in ["noi bat", "diem noi bat", "danh gia", "review", "highlights", "nhan xet", "chat luong"]):
                routing = RoutingResult(
                    normalized_text=normalize_query(clean_user_text),
                    intent_type="REVIEW_SUMMARY",
                    target_hotel_name=context_hotel_name,
                )
                print(f"[Agent Pre-Classify] REVIEW_SUMMARY via regex: '{clean_lower[:60]}'")
            
            # Pattern: "quanh đây", "nearby", "gần đây", "xung quanh", "địa điểm tham quan"
            elif any(w in clean_lower for w in ["quanh day", "nearby", "gan day", "xung quanh", "dia diem", "tham quan", "an uong"]):
                routing = RoutingResult(
                    normalized_text=normalize_query(clean_user_text),
                    intent_type="LOCAL_GUIDE",
                    target_hotel_name=context_hotel_name,
                    location=context_location,
                )
                print(f"[Agent Pre-Classify] LOCAL_GUIDE via regex: '{clean_lower[:60]}'")
            
            # Pattern: "lịch trình", "itinerary", "kế hoạch", "chi phí dự kiến"
            # Also match follow-up like "3 ngày", "2 ngày 2 đêm" when we're in itinerary context
            elif any(w in clean_lower for w in ["lich trinh", "itinerary", "ke hoach", "chi phi du kien"]):
                routing = RoutingResult(
                    normalized_text=normalize_query(clean_user_text),
                    intent_type="ITINERARY",
                    target_hotel_name=context_hotel_name,
                    location=context_location,
                    trip_days=3,  # Default to 3 days
                    trip_nights=2,  # Default to 2 nights
                )
                print(f"[Agent Pre-Classify] ITINERARY via regex: '{clean_lower[:60]}'")
            
            # Pattern: số ngày follow-up (e.g. "3 ngày", "2 ngày 1 đêm") khi đang trong context itinerary
            # Check if the message is just a number of days (follow-up to itinerary question)
            # No context_location requirement - works even after context prefix is gone
            elif bool(re.search(r"^(\d+)\s*ngay", clean_lower)) or bool(re.search(r"(\d+)\s*ngay\s+(\d+)\s*dem", clean_lower)):
                days_num = 3
                days_match = re.search(r"(\d+)\s*ngay", clean_lower)
                if days_match:
                    days_num = int(days_match.group(1))
                nights_num = max(days_num - 1, 0)
                routing = RoutingResult(
                    normalized_text=normalize_query(clean_user_text),
                    intent_type="ITINERARY",
                    target_hotel_name=context_hotel_name,
                    location=context_location or "khu vực này",
                    trip_days=days_num,
                    trip_nights=nights_num,
                )
                print(f"[Agent Pre-Classify] ITINERARY (follow-up {days_num} days) via regex: '{clean_lower[:60]}'")
            
            # Pattern: "đáng tiền", "worth", "giá trị"
            elif any(w in clean_lower for w in ["dang tien", "worth", "gia tri"]):
                routing = RoutingResult(
                    normalized_text=normalize_query(clean_user_text),
                    intent_type="PRICE_EXPLANATION",
                    target_hotel_name=context_hotel_name,
                )
                print(f"[Agent Pre-Classify] PRICE_EXPLANATION via regex: '{clean_lower[:60]}'")
            
            # Pattern: "vibe", "không gian", "atmosphere"
            elif any(w in clean_lower for w in ["vibe", "khong gian", "atmosphere"]):
                routing = RoutingResult(
                    normalized_text=normalize_query(clean_user_text),
                    intent_type="PRICE_EXPLANATION",  # Different intent from "phù hợp" below
                    target_hotel_name=context_hotel_name,
                )
                print(f"[Agent Pre-Classify] VIBE via PRICE_EXPLANATION regex: '{clean_lower[:60]}'")
            
            # Pattern: "phù hợp", "couple", "family", "đối tượng", "suitable"
            elif any(w in clean_lower for w in ["phu hop", "couple", "family", "doi tuong", "suitable for"]):
                routing = RoutingResult(
                    normalized_text=normalize_query(clean_user_text),
                    intent_type="UPSELL",  # Different from VIBE → separate fallback
                    target_hotel_name=context_hotel_name,
                )
                print(f"[Agent Pre-Classify] SUITABLE via UPSELL regex: '{clean_lower[:60]}'")
            
            # Pattern: "book", "đặt", "muốn đặt" - explicit booking on a specific hotel from list
            elif bool(re.search(r"\b(dat|book|muon dat|muon book|dat cho)\b", clean_lower)) and context_hotel_name:
                routing = RoutingResult(
                    normalized_text=normalize_query(clean_user_text),
                    intent_type="BOOK",
                    target_hotel_name=context_hotel_name,
                    guests_adults=extracted_guests or 2,
                    dates=DateRange(start=extracted_date) if extracted_date else None,
                )
                print(f"[Agent Pre-Classify] BOOK via regex: '{clean_lower[:60]}'")
            
            # Pattern: "so sánh", "compare", "tương tự" - comparison should force SEARCH
            elif any(w in clean_lower for w in ["so sanh", "compare", "tuong tu"]):
                routing = RoutingResult(
                    normalized_text=normalize_query(clean_user_text),
                    intent_type="GENERAL",  # Will be overridden by force SEARCH below
                    target_hotel_name=context_hotel_name,
                    location=context_location,
                )
                print(f"[Agent Pre-Classify] Comparison intent detected: '{clean_lower[:60]}'")
            
            else:
                # ============ Fallback: Use LLM Router for unrecognized free-text ============
                router_context_parts = []
                if context_hotel_name:
                    router_context_parts.append(f"Khách sạn hiện tại: {context_hotel_name} tại {context_address}")
                if chat_history:
                    last_msgs = chat_history[-3:]
                    history_summary = "; ".join([f"{m['role']}: {m['content'][:100]}" for m in last_msgs])
                    router_context_parts.append(f"Lịch sử gần đây: {history_summary}")
                
                router_extra = ""
                if router_context_parts:
                    router_extra = "\nThông tin bổ sung cho Router:\n" + "\n".join(router_context_parts)
                
                route_prompt = f"""Ban la AI Router cho Stazy. Thuc hien 2 viec:
1. CHUAN HOA cau hoi (sua viet tat: ks->khach san, vtau->Vung Tau, 2tr->2000000)
2. PHAN LOAI intent va TRICH XUAT tham so.

QUAN TRONG: Khi user hoi ve mot khach san cu the (vd: danh gia, diem noi bat, gia ca, khong gian, vi tri, lich trinh dia phuong), phan loai dung intent sau:
- SEARCH: User muon tim kiem khach san/phong theo dia diem, gia ca, budget. Co chua cac tu nhu "tim", "kiem", "xem", "loc". VI DU: "tim phong vung tau duoi 2 trieu", "khach san da nang gia re", "ks ben tre"
- REVIEW_SUMMARY: Hoi ve danh gia, review, diem manh/yếu, chat luong
- PRICE_EXPLANATION: Hoi ve gia ca, co dang tien khong, gia tri
- LOCAL_GUIDE: Hoi ve dia diem tham quan, an uong, hoat dong gan khach san
- ITINERARY: Hoi ve lich trinh du lich, ke hoach tham quan
- GENERAL: Chào hỏi, cam on, cau hoi chung khong lien quan khach san

INTENTS: {', '.join(VALID_INTENTS)}
{router_extra}"""
                try:
                    completion = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[{"role": "system", "content": route_prompt}, {"role": "user", "content": clean_user_text}],
                        tools=[{"type": "function", "name": "route_query", "description": "Normalize and classify intent", "parameters": RoutingResult.model_json_schema()}],
                        tool_choice="auto", temperature=0.1)
                    tc = completion.choices[0].message.tool_calls
                    if tc:
                        routing = RoutingResult(**json.loads(tc[0].function.arguments))
                    else:
                        routing = RoutingResult(normalized_text=user_text, intent_type="GENERAL")

                    routing.normalized_text = normalize_query(routing.normalized_text)
                    routing.intent_type = routing.intent_type if routing.intent_type in VALID_INTENTS else "GENERAL"
                    routing = _fallback_itinerary_fields(routing)
                    print(f"[Agent Router] Intent={routing.intent_type} | Location={routing.location} | Text='{clean_user_text[:80]}'")
                except Exception as e:
                    em = str(e).lower()
                    if "timeout" in em or "timed out" in em:
                        return {"agent_response": "Hệ thống quá tải, vui lòng thử lại sau.", "intent": {"intent_type": "GENERAL"}, "data": {"hotels": [], "booking_link": None}}
                    routing = RoutingResult(normalized_text=user_text, intent_type="GENERAL")

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
    # FIX: Use clean_user_text for hotel reference resolution (without context prefix)
    referenced_hotel = _resolve_recent_hotel_reference(clean_user_text, user_id)

    if referenced_hotel and routing.intent_type != "BOOK":
        routing.target_hotel_name = referenced_hotel.get("title") or routing.target_hotel_name
        routing.hotel_id = referenced_hotel.get("id") or routing.hotel_id
        if not routing.location and referenced_hotel.get("address"):
            routing.location = referenced_hotel.get("address")

    faq_context = ""
    if routing.intent_type == "FAQ":
        faq_context = retrieve_faq_context(routing.normalized_text, top_k=2)

    # --- FORCE SEARCH ONLY FOR COMPARISON/SIMILAR REQUESTS ---
    comparison_request = bool(re.search(
        r"\b(so sánh|so sanh|compare|tương tự|tuong tu|giong|khách sạn.*khác|cùng khu vực)\b",
        clean_user_text.lower(), re.IGNORECASE
    ))
    if context_location and comparison_request and context_hotel_name and routing.intent_type not in ("BOOK", "FAQ"):
        is_booking_request = bool(re.search(r"\b(dat|book|đặt|muon đat|muốn đặt|đặt phòng)\b", clean_user_text.lower(), re.IGNORECASE))
        if not is_booking_request:
            routing.location = context_location
            routing.intent_type = "SEARCH"
            routing.limit = 10
            print(f"[Agent] Force SEARCH for comparison: location={context_location}, hotel={context_hotel_name}")

    if context_location and not routing.location:
        routing.location = context_location
        print(f"[Agent] Injected location from context: {context_location}")

    # ============ FIX 2 & 3: Fetch full hotel data for context-aware intents ============
    # Try to resolve hotel_id from context if not already set
    if not routing.hotel_id and context_hotel_name:
        # Look up hotel in DB by name
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute('SELECT id, title FROM hotels WHERE title ILIKE %s LIMIT 1', (f"%{context_hotel_name}%",))
            row = cur.fetchone()
            if row:
                routing.hotel_id = row[0]
                routing.target_hotel_name = routing.target_hotel_name or row[1]
                print(f"[Agent] Resolved hotel_id={row[0]} from context name: {context_hotel_name}")
            cur.close()
            conn.close()
        except Exception as e:
            print(f"[Agent] Could not resolve hotel_id from context: {e}")

    # Fetch full hotel data for context-aware intents
    hotel_full_data = {}
    if routing.intent_type in ("REVIEW_SUMMARY", "PRICE_EXPLANATION", "LOCAL_GUIDE", "ITINERARY", "UPSELL", "CONSULTATION", "RECOMMENDATION") and (routing.hotel_id or context_hotel_name):
        hotel_full_data = _fetch_hotel_full_data(routing.hotel_id, context_hotel_name)
        print(f"[Agent] Fetched full hotel data for {routing.intent_type}: {hotel_full_data.get('title', 'unknown')}")

    # --- ROUTE HANDLERS ---
    if routing.intent_type == "SEARCH":
        if not routing.limit or routing.limit < 5:
            routing.limit = 10
        hotels = search_hotels_rag(routing)
        if not hotels:
            lt = context_location or routing.location or "đây"
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
            # FIX: Use clean_user_text (without context prefix) to match correct hotel
            recent_hotel = _resolve_recent_hotel_reference(clean_user_text, user_id)
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
                    clear_booking_state(user_id)
                else:
                    response["agent_response"] = f"Đã tạo đơn cho **{top['title']}**.\nVui lòng xác nhận ngày check-in để hoàn tất."
                    response["data"]["hotels"] = [top]
            else:
                response["agent_response"] = f"Xin lỗi, không tìm thấy **{routing.target_hotel_name}**."

    elif routing.intent_type in ("CONSULTATION", "RECOMMENDATION"):
        consult_hotels = search_hotels_rag(routing)
        hotel_ctx = _build_hotel_context(consult_hotels)
        prompt = compose_prompt(routing.intent_type, history_text, today)
        if hotel_ctx: prompt = f"{prompt}\n\n{hotel_ctx}"
        try: response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except: response["agent_response"] = "Dựa trên danh sách đã gợi ý, bạn muốn đặt cái nào?"
        if consult_hotels: response["data"]["hotels"] = consult_hotels

    elif routing.intent_type in ("REVIEW_SUMMARY", "PRICE_EXPLANATION", "LOCAL_GUIDE", "ITINERARY", "UPSELL"):
        # ============ FIX 4: Rich context for specialized intents ============
        extra_ctx = ""
        hotel_display_name = "khách sạn này"
        if hotel_full_data:
            price_fmt = f"{int(hotel_full_data['price']):,} VND" if hotel_full_data.get('price') else "N/A"
            rating_str = f"{hotel_full_data['rating']}/5" if hotel_full_data.get('rating') else "Chưa có"
            hotel_display_name = hotel_full_data['title']
            
            extra_ctx_parts = [
                f"[THONG TIN KHACH SAN (Hợp lệ)]",
                f"Ten: {hotel_full_data['title']}",
                f"Dia chi: {hotel_full_data['address']}",
                f"Gia: {price_fmt}/dem",
                f"Danh gia: {rating_str}",
                f"Mo ta: {hotel_full_data['description']}",
            ]
            
            if hotel_full_data.get('review_text') and hotel_full_data['review_text'] != "Chưa có đánh giá nào.":
                extra_ctx_parts.append(f"Noi dung danh gia:\n{hotel_full_data['review_text']}")
            
            if hotel_full_data.get('amenities'):
                extra_ctx_parts.append(f"Tien ich: {', '.join(hotel_full_data['amenities'])}")
            
            if hotel_full_data.get('suitable_for'):
                extra_ctx_parts.append(f"Phu hop cho: {', '.join(hotel_full_data['suitable_for'])}")
            
            extra_ctx = "\n".join(extra_ctx_parts)
        elif context_hotel_name:
            hotel_display_name = context_hotel_name
            extra_ctx = f"[KHACH SAN HIEN TAI (Hợp lệ để trả lời)]\nTen: {context_hotel_name}\nDia chi: {context_address or 'Khong ro'}\nLuu y: KHACH SAN NAY HOP LE DE TRA LOI CAU HOI CUA NGUOI DUNG."
        
        prompt = compose_prompt(routing.intent_type, history_text, today, extra_context=extra_ctx)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
            print(f"[Agent] {routing.intent_type} generated OK for {hotel_display_name}")
        except Exception as e:
            print(f"[Agent] {routing.intent_type} LLM failed for {hotel_display_name}: {e}")
            # Provide a context-aware fallback instead of generic message
            if routing.intent_type == "REVIEW_SUMMARY":
                fallback_parts = [f"**{hotel_display_name}**"]
                if hotel_full_data:
                    rating = hotel_full_data.get('rating', 0)
                    desc = hotel_full_data.get('description', '')
                    amenities = hotel_full_data.get('amenities', [])
                    suitable = hotel_full_data.get('suitable_for', [])
                    if rating:
                        fallback_parts.append(f"⭐ Đánh giá: {rating}/5")
                    if desc and desc != "Chưa có mô tả.":
                        fallback_parts.append(f"📝 {desc[:200]}")
                    if amenities:
                        fallback_parts.append(f"🏷️ Tiện ích: {', '.join(amenities[:5])}")
                    if suitable:
                        fallback_parts.append(f"👥 Phù hợp: {', '.join(suitable)}")
                else:
                    fallback_parts.append("⭐ Thông tin chi tiết đang được cập nhật.")
                response["agent_response"] = "\n".join(fallback_parts)
            elif routing.intent_type == "PRICE_EXPLANATION":
                if hotel_full_data:
                    price = hotel_full_data.get('price', 0)
                    rating = hotel_full_data.get('rating', 0)
                    response["agent_response"] = f"**{hotel_display_name}** có giá {int(price):,} VND/đêm với rating {rating}/5."
                else:
                    response["agent_response"] = f"**{hotel_display_name}** đang được cập nhật giá."
            elif routing.intent_type == "LOCAL_GUIDE":
                response["agent_response"] = f"📍 Xung quanh **{hotel_display_name}** có nhiều địa điểm tham quan thú vị như chợ, quán ăn, bãi biển. Bạn muốn tìm loại địa điểm nào?"
            elif routing.intent_type == "ITINERARY":
                response["agent_response"] = f"📅 Bạn muốn lên lịch trình tại khu vực **{context_location or 'này'}** trong bao nhiêu ngày?"
            else:
                response["agent_response"] = f"Mình có thể giúp bạn tìm hiểu thêm về **{hotel_display_name}**. Bạn cần gì?"

    elif routing.intent_type in ("FAQ", "MANAGE_BOOKING"):
        # Handle FAQ and other remaining intents with hotel context
        extra_ctx = ""
        if hotel_full_data:
            price_fmt = f"{int(hotel_full_data['price']):,} VND" if hotel_full_data.get('price') else "N/A"
            rating_str = f"{hotel_full_data['rating']}/5" if hotel_full_data.get('rating') else "Chưa có"
            extra_ctx_parts = [
                f"[THONG TIN KHACH SAN (Hợp lệ)]",
                f"Ten: {hotel_full_data['title']}",
                f"Dia chi: {hotel_full_data['address']}",
                f"Gia: {price_fmt}/dem",
                f"Danh gia: {rating_str}",
            ]
            extra_ctx = "\n".join(extra_ctx_parts)
        elif context_hotel_name:
            extra_ctx = f"[KHACH SAN HIEN TAI (Hợp lệ để trả lời)]\nTen: {context_hotel_name}\nDia chi: {context_address or 'Khong ro'}\nLuu y: KHACH SAN NAY HOP LE DE TRA LOI CAU HOI CUA NGUOI DUNG."
        prompt = compose_prompt(routing.intent_type, history_text, today, faq_context=faq_context, extra_context=extra_ctx)
        try: response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except: response["agent_response"] = "Mình có thể giúp bạn tìm phòng. Bạn cần gì?"

    elif routing.intent_type == "GENERAL":
        last_hotels = get_last_hotels(user_id)
        last_hotels_ctx = ""
        if last_hotels:
            lines = ["[DANH SACH KHACH SAN DA TIM THAY TRUOC DO]"]
            for i, h in enumerate(last_hotels, 1):
                price_fmt = f"{int(h['price']):,} VND" if h.get('price') else "N/A"
                lines.append(f"{i}. {h['title']} - {price_fmt}/dem - {h.get('address', '')}")
            last_hotels_ctx = "\n".join(lines)
        # Include current hotel context + full data if available
        ctx_parts = []
        if hotel_full_data:
            price_fmt = f"{int(hotel_full_data['price']):,} VND" if hotel_full_data.get('price') else "N/A"
            rating_str = f"{hotel_full_data['rating']}/5" if hotel_full_data.get('rating') else "Chưa có"
            ctx_parts.append(
                f"[KHACH SAN HIEN TAI (Hợp lệ để trả lời)]\n"
                f"Ten: {hotel_full_data['title']}\n"
                f"Dia chi: {hotel_full_data['address']}\n"
                f"Gia: {price_fmt}/dem\n"
                f"Danh gia: {rating_str}\n"
                f"Mo ta: {hotel_full_data['description']}\n"
                f"Tien ich: {', '.join(hotel_full_data.get('amenities', []))}\n"
                f"Luu y: KHACH SAN NAY HOP LE DE TRA LOI CAU HOI CUA NGUOI DUNG."
            )
        elif context_hotel_name:
            ctx_parts.append(f"[KHACH SAN HIEN TAI (Hợp lệ để trả lời)]\nTen: {context_hotel_name}\nDia chi: {context_address or 'Khong ro'}\nLuu y: KHACH SAN NAY HOP LE DE TRA LOI CAU HOI CUA NGUOI DUNG.")
        if last_hotels_ctx:
            ctx_parts.append(last_hotels_ctx)
        combined_ctx = "\n\n".join(ctx_parts)
        prompt = compose_prompt("GENERAL", history_text, today, extra_context=combined_ctx)
        try: response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except: response["agent_response"] = "Mình có thể giúp bạn tìm phòng. Bạn cần gì?"

    save_message_to_context(user_id, "user", user_text)
    save_message_to_context(user_id, "assistant", response["agent_response"])
    return response