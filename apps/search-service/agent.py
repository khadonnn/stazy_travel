import os
import json
import re
import unicodedata
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
    trip_days: Optional[int] = None
    trip_nights: Optional[int] = None
    price_min: Optional[int] = None
    price_max: Optional[int] = None
    dates: Optional[DateRange] = None
    guests_adults: Optional[int] = None
    semantic_query: Optional[str] = None
    target_hotel_name: Optional[str] = None
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
    if not text:
        return ""
    normalized = unicodedata.normalize("NFD", str(text))
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").lower()

def _should_force_hotel_search(user_text, routing):
    normalized_text = _strip_accents(user_text or routing.normalized_text or "")
    hotel_query = bool(re.search(r"\b(khach san|hotel|resort)\b", normalized_text))
    search_intent = bool(re.search(r"\b(tim|tìm|search|find|loc|lọc|xem)\b", normalized_text))
    comparison_query = bool(re.search(r"\b(so sanh|so sánh|tot nhat|tốt nhất|re nhat|rẻ nhất|cai nao|khach nao)\b", normalized_text))
    has_structured_filters = routing.location or routing.price_min is not None or routing.price_max is not None or routing.semantic_query
    return hotel_query and has_structured_filters and search_intent and not comparison_query

def _extract_location_price_from_text(normalized_text: str):
    # normalized_text is expected to be output of normalize_query (numbers expanded)
    loc = None
    price = None
    # find a large number (VND) like 1000000
    m = re.search(r"(\d{4,})", normalized_text)
    if m:
        try:
            price = int(m.group(1))
        except:
            price = None
    # try to capture location appearing between keywords and the price
    # examples: "tim khach san nha trang 1000000" or "tim khach san o nha trang 1000000"
    if price:
        before = normalized_text[: m.start()]
        # look for 'khach san' and take following words
        mloc = re.search(r"khach san(?: o| tai)?\s+([a-z\u00C0-\u017F0-9\s]{2,40})$", before)
        if not mloc:
            # alternative: 'tim .* khach san <loc>'
            mloc = re.search(r"tim(?: .*?)khach san(?: o| tai)?\s+([a-z\u00C0-\u017F0-9\s]{2,40})$", before)
        if mloc:
            loc = mloc.group(1).strip()
    return loc, price

def _location_match_sql(use_unaccent: bool):
    if use_unaccent:
        return "(unaccent(address) ILIKE unaccent(%s) OR unaccent(title) ILIKE unaccent(%s))"
    return "(address ILIKE %s OR title ILIKE %s)"

def search_hotels_rag(intent_obj):
    conn = get_db_connection()
    cur = conn.cursor()
    query = 'SELECT id, title, price, address, "reviewStar", "featuredImage", slug, map, description FROM hotels WHERE 1=1'
    params = []
    # For CONSULTATION/RECOMMENDATION/LOCAL_GUIDE/ITINERARY: prioritize location over target_hotel_name
    comparison_intents = {"CONSULTATION", "RECOMMENDATION", "LOCAL_GUIDE", "ITINERARY"}
    print(f"[search_hotels_rag] intent={intent_obj.intent_type} | location={intent_obj.location} | target_hotel={intent_obj.target_hotel_name}")
    has_structured_filters = intent_obj.location or intent_obj.price_min is not None or intent_obj.price_max is not None
    use_unaccent = bool(intent_obj.location)
    if intent_obj.target_hotel_name and intent_obj.intent_type not in comparison_intents and not has_structured_filters:
        query += " AND title ILIKE %s"
        params.append(f"%{intent_obj.target_hotel_name}%")
    else:
        if intent_obj.location:
            query += " AND " + _location_match_sql(use_unaccent)
            params.extend([f"%{intent_obj.location}%", f"%{intent_obj.location}%"])
        if intent_obj.price_min is not None:
            query += " AND price >= %s"
            params.append(_to_vnd(intent_obj.price_min))
        if intent_obj.price_max is not None:
            query += " AND price <= %s"
            params.append(_to_vnd(intent_obj.price_max))
    if intent_obj.semantic_query and not intent_obj.target_hotel_name:
        try:
            vector = embed_model.encode(intent_obj.semantic_query).tolist()
            query += ' ORDER BY "policiesVector" <=> %s::vector LIMIT 5'
            params.append(str(vector))
        except:
            query += " ORDER BY price ASC LIMIT 5"
    else:
        query += " ORDER BY price ASC LIMIT 5"

    def _fallback_rows_without_unaccent():
        fallback_query = 'SELECT id, title, price, address, "reviewStar", "featuredImage", slug, map, description FROM hotels WHERE 1=1'
        fallback_params = []
        if intent_obj.price_min is not None:
            fallback_query += " AND price >= %s"
            fallback_params.append(_to_vnd(intent_obj.price_min))
        if intent_obj.price_max is not None:
            fallback_query += " AND price <= %s"
            fallback_params.append(_to_vnd(intent_obj.price_max))
        cur.execute(fallback_query, tuple(fallback_params))
        fallback_rows = cur.fetchall()
        if not intent_obj.location:
            return fallback_rows

        location_key = _strip_accents(intent_obj.location)
        matched_rows = []
        for rw in fallback_rows:
            searchable_text = _strip_accents(f"{rw[1] or ''} {rw[3] or ''}")
            if location_key in searchable_text or searchable_text in location_key:
                matched_rows.append(rw)
        return matched_rows or fallback_rows

    try:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        if not rows and intent_obj.location:
            try:
                rows = _fallback_rows_without_unaccent()
            except Exception:
                conn.rollback()
                rows = _fallback_rows_without_unaccent()
    except Exception as e:
        # If unaccent() is not available or the primary query fails for any reason,
        # fall back to a plain price-filtered search and Python-side accent-insensitive match.
        print(f"SQL Error: {e}")
        try:
            conn.rollback()
        except:
            pass
        try:
            rows = _fallback_rows_without_unaccent()
        except Exception as fallback_error:
            print(f"SQL Fallback Error: {fallback_error}")
            return []
        results = []
        for rw in rows:
            map_data = None
            if len(rw) > 7 and rw[7]:
                try: map_data = json.loads(rw[7]) if isinstance(rw[7], str) else rw[7]
                except: pass
            results.append({"id": rw[0], "title": rw[1], "price": float(rw[2]), "address": rw[3],
                "rating": float(rw[4]) if rw[4] else 0,
                "image": rw[5] if rw[5] else "https://placehold.co/600x400?text=No+Image",
                "slug": rw[6] if len(rw) > 6 and rw[6] else str(rw[0]),
                "map": map_data, "description": rw[8] if len(rw) > 8 and rw[8] else ""})
        print(f"Found {len(results)} hotels")
        return results
    finally:
        cur.close(); conn.close()

def _llm_generate(system_prompt, user_text, temperature=0.3):
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_text}],
        temperature=temperature)
    return completion.choices[0].message.content

def _build_hotel_context(hotels):
    """Build a context string from real hotel data for LLM prompt"""
    if not hotels:
        return "[DATABASE HOTELS]\n(empty - no hotels found)\n"
    lines = ["[DATABASE HOTELS]"]
    for i, h in enumerate(hotels, 1):
        price_fmt = f"{int(h['price']):,} VND"
        rating_str = f", rating {h['rating']}" if h.get("rating") else ""
        lines.append(f"{i}. {h['title']} - gia {price_fmt}/dem{rating_str} - dia chi: {h['address']}")
    return "\n".join(lines)

def _resolve_itinerary_duration(routing):
    trip_days = routing.trip_days
    trip_nights = routing.trip_nights
    if trip_days is None and trip_nights is not None:
        trip_days = trip_nights + 1
    if trip_nights is None and trip_days is not None:
        trip_nights = max(trip_days - 1, 0)
    return trip_days, trip_nights

def _resolve_itinerary_budget(routing):
    if routing.budget is not None:
        return routing.budget
    if routing.intent_type == "ITINERARY" and routing.price_max is not None:
        return routing.price_max
    return None

def _fallback_itinerary_fields(routing):
    if routing.intent_type != "ITINERARY":
        return routing

    normalized_text = routing.normalized_text or ""

    if routing.trip_days is None:
        match = ITINERARY_DAYS_RE.search(normalized_text)
        if match:
                        routing.trip_days = int(match.group(1))

    if routing.trip_nights is None:
        match = ITINERARY_NIGHTS_RE.search(normalized_text)
        if match:
                        routing.trip_nights = int(match.group(1))

    if routing.budget is None:
        match = ITINERARY_BUDGET_RE.search(normalized_text)
        if match:
            routing.budget = int(match.group(1))
        elif routing.price_max is not None and re.search(r"\b(duoi|khong qua|toi da|budget|ngan sach)\b", normalized_text):
            routing.budget = routing.price_max

    return routing

# --- ENTERPRISE ORCHESTRATOR PIPELINE ---
def run_agent_logic(user_text, user_id):
    today = datetime.now().strftime("%Y-%m-%d (%A)")
    chat_history = get_chat_history(user_id)
    history_text = ""
    for msg in chat_history:
        role = "User" if msg["role"] == "user" else "AI"
        history_text += f"{role}: {msg['content']}\n"

    # STEP 1: Query Normalizer + Intent Router (SINGLE LLM CALL)
    route_prompt = f"""Ban la AI Router cho Stazy. Thuc hien 2 viec:
1. CHUAN HOA cau hoi (sua viet tat: ks->khach san, vtau->Vung Tau, 2tr->2000000)
2. PHAN LOAI intent va TRICH XUAT tham so.
INTENTS: SEARCH, BOOK, FAQ, CONSULTATION, GENERAL, LOCAL_GUIDE, MANAGE_BOOKING, RECOMMENDATION, ITINERARY, REVIEW_SUMMARY, PRICE_EXPLANATION, UPSELL
GIA: trieu=1000000, tren X->price_min, duoi X->price_max, LUON VND
ITINERARY: budget la tong ngan sach chuyen di; price_min/price_max chi dung cho loc gia phong/khach san moi dem. Trich xuat trip_days va trip_nights khi nguoi dung noi so ngay/so dem.
Neu cau co nhieu y -> intent_type = y chinh, secondary_intent = y phu.
LICH SU: {history_text}"""

    ai_content = None
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": route_prompt}, {"role": "user", "content": user_text}],
            tools=[{"type": "function", "function": {"name": "route_query",
                "description": "Normalize and classify intent",
                "parameters": RoutingResult.model_json_schema()}}],
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
        # If user explicitly asked for hotels + a numeric price in text, force SEARCH and try to extract fields
        norm_text = routing.normalized_text or ""
        explicit_price_present = True if re.search(r"(\d{4,})", norm_text) else False
        explicit_hotel_word = True if re.search(r"\b(khach san|hotel|resort)\b", _strip_accents(norm_text)) else False
        if (routing.intent_type != "SEARCH") and ( _should_force_hotel_search(user_text, routing) or (explicit_hotel_word and explicit_price_present) ):
            # attempt to extract missing location/price from normalized text
            loc, price = _extract_location_price_from_text(norm_text)
            if not routing.location and loc:
                routing.location = loc
            if routing.price_max is None and price:
                routing.price_max = price
            routing.intent_type = "SEARCH"
        print(f"Router: {routing.intent_type} | {routing.location} | min:{routing.price_min} max:{routing.price_max}")
    except Exception as e:
        em = str(e).lower()
        if "timeout" in em or "timed out" in em:
            return {"agent_response": "Hệ thống quá tải, vui lòng thử lại sau.", "intent": {"intent_type": "GENERAL"}, "data": {"hotels": [], "booking_link": None}}
        if "rate" in em or "429" in str(e):
            return {"agent_response": "Vượt giới hạn, vui lòng chờ 10 giây.", "intent": {"intent_type": "GENERAL"}, "data": {"hotels": [], "booking_link": None}}
        routing = RoutingResult(normalized_text=user_text, intent_type="GENERAL")

    response = {"agent_response": "", "intent": {"intent_type": routing.intent_type}, "data": {"hotels": [], "booking_link": None}}

    # STEP 2: RAG Retriever for FAQ
    faq_context = ""
    if routing.intent_type == "FAQ":
        faq_context = retrieve_faq_context(routing.normalized_text, top_k=2)

    # STEP 3: Route to handler
    if routing.intent_type == "SEARCH":
        hotels = search_hotels_rag(routing)
        if not hotels:
            lt = routing.location or "day"
            pt = ""
            if routing.price_min and routing.price_max: pt = f" tu {_to_vnd(routing.price_min):,.0f}d den {_to_vnd(routing.price_max):,.0f}d"
            elif routing.price_min: pt = f" tren {_to_vnd(routing.price_min):,.0f}d"
            elif routing.price_max: pt = f" duoi {_to_vnd(routing.price_max):,.0f}d"
            response["agent_response"] = f"Tiếc quá, mình không tìm thấy phòng nào ở {lt}{pt}."
        else:
            response["agent_response"] = f"Minh tim thay {len(hotels)} lua chon phu hop:"
            response["data"]["hotels"] = hotels

    elif routing.intent_type == "BOOK":
        mi = []
        if not routing.dates or not routing.dates.start: mi.append("ngay check-in")
        if routing.guests_adults is None: mi.append("so luong nguoi")
        if mi:
            join_str = " va ".join(mi)
            response["agent_response"] = f"Để mình đặt phòng giúp, bạn cho mình biết **{join_str}** nhé?"
        else:
            fh = search_hotels_rag(routing)
            if fh:
                top = fh[0]
                ident = top.get("slug") or top.get("id")
                if not routing.dates.end:
                    try: routing.dates.end = (datetime.strptime(routing.dates.start, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
                    except: pass
                guests = routing.guests_adults or 2
                response["agent_response"] = f"Đã tạo đơn cho **{top['title']}**.\nNgày: {routing.dates.start} -> {routing.dates.end} ({guests} khách)."
                response["data"]["hotels"] = [top]
                response["data"]["booking_link"] = create_booking_link(ident, routing.dates, routing.guests_adults)
            else:
                response["agent_response"] = f"Xin lỗi, không tìm thấy **{routing.target_hotel_name}**."

    elif routing.intent_type == "CONSULTATION":
        # Search for relevant hotels when location or context is available
        consultation_hotels = search_hotels_rag(routing)
        # Fallback: if no location found but have target_hotel_name, extract location from hotel address
        if (not consultation_hotels or len(consultation_hotels) <= 1) and routing.target_hotel_name and not routing.location:
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute('SELECT address FROM hotels WHERE title ILIKE %s LIMIT 1', (f"%{routing.target_hotel_name}%",))
                row = cur.fetchone()
                cur.close(); conn.close()
                if row and row[0]:
                    # Extract city/region from address (e.g., "Vũng Tàu" from "123 Beach Rd, Vũng Tàu")
                    addr_parts = str(row[0]).split(",")
                    fallback_location = addr_parts[-1].strip() if len(addr_parts) > 1 else addr_parts[0].strip()
                    routing.location = fallback_location
                    print(f"[CONSULTATION] Fallback location from hotel address: {fallback_location}")
                    consultation_hotels = search_hotels_rag(routing)
            except Exception as e:
                print(f"[CONSULTATION] Fallback location error: {e}")
        hotel_ctx = _build_hotel_context(consultation_hotels)
        prompt = compose_prompt("CONSULTATION", history_text, today)
        if hotel_ctx:
            prompt = f"{prompt}\n\n{hotel_ctx}"
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            for msg in reversed(chat_history):
                if "Da goi y cac khach san:" in msg.get("content", ""):
                    response["agent_response"] = "Dựa trên danh sách đã gợi ý:\nRating cao nhất -> Trải nghiệm cao cấp.\nGiá thấp nhất -> Phù hợp ngân sách.\nBạn muốn đặt cái nào?"
                    break
            else:
                response["agent_response"] = "Mình chưa có danh sách khách sạn để tư vấn. Bạn muốn tìm ở đâu?"
        if consultation_hotels:
            response["data"]["hotels"] = consultation_hotels

    elif routing.intent_type == "FAQ":
        prompt = compose_prompt("FAQ", history_text, today, faq_context=faq_context)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = f"Dua tren thong tin:\n\n{faq_context}" if faq_context else "Xin loi, chua co thong tin. Lien he hotline."

    elif routing.intent_type == "GENERAL":
        prompt = compose_prompt("GENERAL", history_text, today)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = ai_content if ai_content else "Mình có thể giúp bạn tìm phòng. Bạn cần gì?"

    elif routing.intent_type == "LOCAL_GUIDE":
        # Search for hotels in the area for map display
        local_hotels = search_hotels_rag(routing)
        hotel_ctx = _build_hotel_context(local_hotels)
        prompt = compose_prompt("LOCAL_GUIDE", history_text, today)
        if hotel_ctx:
            prompt = f"{prompt}\n\n{hotel_ctx}"
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = "Để gợi ý địa điểm quanh khách sạn, bạn cho mình biết khu vực bạn đang xem nhé!"
        if local_hotels:
            response["data"]["hotels"] = local_hotels

    elif routing.intent_type == "MANAGE_BOOKING":
        prompt = compose_prompt("MANAGE_BOOKING", history_text, today)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = "Để quản lý đơn đặt phòng, bạn vào mục Đơn đặt phòng trong tài khoản nhé."

    elif routing.intent_type == "RECOMMENDATION":
        # Search for relevant hotels when location or context is available
        recommendation_hotels = search_hotels_rag(routing)
        hotel_ctx = _build_hotel_context(recommendation_hotels)
        prompt = compose_prompt("RECOMMENDATION", history_text, today)
        if hotel_ctx:
            prompt = f"{prompt}\n\n{hotel_ctx}"
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = "Ban dang plan chuyen di cho dip nao? Cap doi, gia dinh, hay solo?"
        if recommendation_hotels:
            response["data"]["hotels"] = recommendation_hotels

    elif routing.intent_type == "ITINERARY":
        # Search for hotels in the area for map display
        itinerary_hotels = search_hotels_rag(routing)
        itinerary_days, itinerary_nights = _resolve_itinerary_duration(routing)
        itinerary_budget = _resolve_itinerary_budget(routing)
        reference_hotel = itinerary_hotels[0] if itinerary_hotels else None
        cost_estimation = estimate_trip_cost(
            reference_hotel["price"] if reference_hotel else None,
            itinerary_days,
            itinerary_nights,
            adults=routing.guests_adults or 2,
        )
        cost_context = build_cost_context(
            cost_estimation,
            budget=itinerary_budget,
            trip_days=itinerary_days,
            trip_nights=itinerary_nights,
            adults=routing.guests_adults or 2,
            hotel_name=reference_hotel["title"] if reference_hotel else None,
        )
        hotel_ctx = _build_hotel_context(itinerary_hotels)
        prompt = compose_prompt("ITINERARY", history_text, today, extra_context=cost_context)
        if hotel_ctx:
            prompt = f"{prompt}\n\n{hotel_ctx}"
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = "De len lich trinh, ban cho minh biet: di may ngay? Budget khoang bao nhieu?"
        if itinerary_hotels:
            response["data"]["hotels"] = itinerary_hotels
        response["data"]["trip_plan"] = {
            "days": itinerary_days,
            "nights": itinerary_nights,
            "budget": itinerary_budget,
            "within_budget": None if itinerary_budget is None else cost_estimation["total"] <= itinerary_budget,
            "exceeded_amount": None if itinerary_budget is None else max(cost_estimation["total"] - itinerary_budget, 0),
            "cost_estimation": cost_estimation,
        }

    else:
        # For GENERAL and other intents, also try to search if location is present
        other_hotels = []
        if routing.location:
            other_hotels = search_hotels_rag(routing)
        hotel_ctx = _build_hotel_context(other_hotels)
        prompt = compose_prompt(routing.intent_type, history_text, today)
        if hotel_ctx:
            prompt = f"{prompt}\n\n{hotel_ctx}"
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = ai_content if ai_content else "Mình có thể giúp bạn tìm phòng. Bạn cần gì?"
        if other_hotels:
            response["data"]["hotels"] = other_hotels

    save_message_to_context(user_id, "user", user_text)
    save_message_to_context(user_id, "assistant", response["agent_response"])
    return response
