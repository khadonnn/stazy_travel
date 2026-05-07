import os
import json
import re
import psycopg2
import traceback
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from groq import Groq
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer, util
from dotenv import load_dotenv
from src.utils.redis_client import get_redis_client

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

def compose_prompt(intent_type, history_text, today, faq_context=""):
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
        intent_module = intent_module.replace("{faq_context}", faq_context or "Khong co thong tin FAQ.")
    return f"{safety}\n\n{personal}\n\n{intent_module}"

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

def search_hotels_rag(intent_obj):
    conn = get_db_connection()
    cur = conn.cursor()
    query = 'SELECT id, title, price, address, "reviewStar", "featuredImage", slug, map, description FROM hotels WHERE 1=1'
    params = []
    if intent_obj.target_hotel_name:
        query += " AND title ILIKE %s"
        params.append(f"%{intent_obj.target_hotel_name}%")
    else:
        if intent_obj.location:
            query += " AND (address ILIKE %s OR title ILIKE %s)"
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
    try:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
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
    except Exception as e:
        print(f"SQL Error: {e}")
        return []
    finally:
        cur.close(); conn.close()

def _llm_generate(system_prompt, user_text, temperature=0.3):
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_text}],
        temperature=temperature)
    return completion.choices[0].message.content

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
        print(f"Router: {routing.intent_type} | {routing.location} | min:{routing.price_min} max:{routing.price_max}")
    except Exception as e:
        em = str(e).lower()
        if "timeout" in em or "timed out" in em:
            return {"agent_response": "He thong qua tai, thu lai sau.", "intent": {"intent_type": "GENERAL"}, "data": {"hotels": [], "booking_link": None}}
        if "rate" in em or "429" in str(e):
            return {"agent_response": "Vuot gioi han, cho 10 giay.", "intent": {"intent_type": "GENERAL"}, "data": {"hotels": [], "booking_link": None}}
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
            response["agent_response"] = f"Tiec qua, minh khong tim thay phong nao o {lt}{pt}."
        else:
            response["agent_response"] = f"Minh tim thay {len(hotels)} lua chon phu hop:"
            response["data"]["hotels"] = hotels

    elif routing.intent_type == "BOOK":
        mi = []
        if not routing.dates or not routing.dates.start: mi.append("ngay check-in")
        if routing.guests_adults is None: mi.append("so luong nguoi")
        if mi:
            join_str = " va ".join(mi)
            response["agent_response"] = f"De minh dat phong giup, ban cho minh biet **{join_str}** nhe?"
        else:
            fh = search_hotels_rag(routing)
            if fh:
                top = fh[0]
                ident = top.get("slug") or top.get("id")
                if not routing.dates.end:
                    try: routing.dates.end = (datetime.strptime(routing.dates.start, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
                    except: pass
                guests = routing.guests_adults or 2
                response["agent_response"] = f"Da tao don cho **{top['title']}**.\nNgay: {routing.dates.start} -> {routing.dates.end} ({guests} khach)."
                response["data"]["hotels"] = [top]
                response["data"]["booking_link"] = create_booking_link(ident, routing.dates, routing.guests_adults)
            else:
                response["agent_response"] = f"Xin loi, khong tim thay **{routing.target_hotel_name}**."

    elif routing.intent_type == "CONSULTATION":
        prompt = compose_prompt("CONSULTATION", history_text, today)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            for msg in reversed(chat_history):
                if "Da goi y cac khach san:" in msg.get("content", ""):
                    response["agent_response"] = "Dua tren danh sach da goi y:\nRating cao nhat -> Trai nghiem cao cap.\nGia thap nhat -> Phu hop ngan sach.\nBan muon dat cai nao?"
                    break
            else:
                response["agent_response"] = "Minh chua co danh sach KS de tu van. Ban muon tim o dau?"

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
            response["agent_response"] = ai_content if ai_content else "Minh co the giup ban tim phong. Ban can gi?"

    elif routing.intent_type == "LOCAL_GUIDE":
        prompt = compose_prompt("LOCAL_GUIDE", history_text, today)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = "De goi y dia diem quanh khach san, ban cho minh biet khu vuc ban dang xem nhe!"

    elif routing.intent_type == "MANAGE_BOOKING":
        prompt = compose_prompt("MANAGE_BOOKING", history_text, today)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = "De quan ly don dat phong, ban vao muc Don dat phong trong tai khoan nhe."

    elif routing.intent_type == "RECOMMENDATION":
        prompt = compose_prompt("RECOMMENDATION", history_text, today)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = "Ban dang plan chuyen di cho dip nao? Cap doi, gia dinh, hay solo?"

    elif routing.intent_type == "ITINERARY":
        prompt = compose_prompt("ITINERARY", history_text, today)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = "De len lich trinh, ban cho minh biet: di may ngay? Budget khoang bao nhieu?"

    else:
        prompt = compose_prompt(routing.intent_type, history_text, today)
        try:
            response["agent_response"] = _llm_generate(prompt, routing.normalized_text)
        except:
            response["agent_response"] = ai_content if ai_content else "Minh co the giup ban tim phong. Ban can gi?"

    save_message_to_context(user_id, "user", user_text)
    save_message_to_context(user_id, "assistant", response["agent_response"])
    return response
