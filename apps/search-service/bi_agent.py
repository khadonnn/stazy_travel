import os
import json
import random
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import psycopg2
from dotenv import load_dotenv
from groq import Groq


# ---------------------------------------------------------
# 1. SYSTEM CONFIG
# ---------------------------------------------------------
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
BI_MODEL_NAME = os.getenv("BI_MODEL_NAME", "llama-3.3-70b-versatile")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Session memory: stores last N Q&A per admin user
_session_memory: Dict[str, List[Dict[str, Any]]] = {}
MAX_MEMORY = 5


# ---------------------------------------------------------
# 2. DATA ACCESS
# ---------------------------------------------------------
def get_db_connection():
    db_url = DATABASE_URL
    if not db_url:
        raise RuntimeError("Missing DATABASE_URL")
    if "?" in db_url:
        db_url = db_url.split("?")[0]
    return psycopg2.connect(db_url)


def _mock_daily_metrics(days: int = 7) -> List[Dict[str, Any]]:
    base = datetime.now().date()
    # Deterministic mock data for safe fallback when DB is unavailable.
    revenue_pattern = [12000000, 13500000, 11800000, 16200000, 17400000, 20500000, 18800000]
    booking_pattern = [18, 21, 17, 24, 26, 31, 29]

    rows: List[Dict[str, Any]] = []
    for i in range(days):
        d = (base - timedelta(days=(days - 1 - i))).isoformat()
        rows.append(
            {
                "date": d,
                "revenue": revenue_pattern[i % len(revenue_pattern)],
                "bookings": booking_pattern[i % len(booking_pattern)],
            }
        )
    return rows


def _mock_hourly_activity() -> List[Dict[str, Any]]:
    return [
        {"hour": 8, "bookings": 3},
        {"hour": 10, "bookings": 5},
        {"hour": 12, "bookings": 8},
        {"hour": 14, "bookings": 12},
        {"hour": 16, "bookings": 10},
        {"hour": 18, "bookings": 7},
        {"hour": 20, "bookings": 6},
        {"hour": 21, "bookings": 4},
    ]


def _mock_customer_segments() -> List[Dict[str, Any]]:
    return [
        {"segment": "new", "bookings": 43},
        {"segment": "returning", "bookings": 57},
    ]


def _mock_hotel_stats() -> Dict[str, Any]:
    return {
        "total_hotels": 255,
        "hotels_with_bookings": 120,
        "booking_rate_pct": 47.1,
        "top_hotels": [
            {"id": 114, "title": "Muong Thanh Luxury", "bookings": 31, "revenue": 46500000},
            {"id": 23, "title": "Vinpearl Resort", "bookings": 28, "revenue": 61600000},
            {"id": 193, "title": "Dalat Palace", "bookings": 24, "revenue": 38400000},
            {"id": 97, "title": "Fusion Resort", "bookings": 21, "revenue": 44100000},
            {"id": 173, "title": "Amanoi Resort", "bookings": 18, "revenue": 54000000},
        ],
        "category_distribution": [
            {"category": "resort", "count": 85, "bookings": 320},
            {"category": "hotel", "count": 95, "bookings": 410},
            {"category": "villa", "count": 45, "bookings": 180},
            {"category": "homestay", "count": 30, "bookings": 171},
        ],
    }


def _mock_user_access_stats(days: int = 7) -> Dict[str, Any]:
    return {
        "total_unique_users": 200,
        "active_users_7d": 156,
        "new_users_7d": 23,
        "returning_users_7d": 133,
        "avg_bookings_per_user": 5.4,
        "top_users": [
            {"userId": "user_001", "bookings": 12, "total_spent": 18000000},
            {"userId": "user_002", "bookings": 10, "total_spent": 22000000},
            {"userId": "user_003", "bookings": 9, "total_spent": 13500000},
        ],
        "daily_active_users": [
            {"date": (datetime.now().date() - timedelta(days=i)).isoformat(), "users": random.randint(30, 80)}
            for i in range(days - 1, -1, -1)
        ],
    }


def fetch_hotel_stats(days: int = 30) -> Dict[str, Any]:
    """Fetch hotel statistics from DB (all time, since demo data is from 2024)."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute('SELECT COUNT(*)::int FROM hotels')
        total_hotels = cur.fetchone()[0]

        # Hotels with bookings (all time)
        cur.execute('SELECT COUNT(DISTINCT "hotelId")::int FROM bookings')
        hotels_with_bookings = cur.fetchone()[0]

        booking_rate = round(hotels_with_bookings / total_hotels * 100, 1) if total_hotels > 0 else 0

        # Top hotels by booking count
        cur.execute("""
            SELECT h.id, h.title, COUNT(b.id)::int AS bookings,
                   COALESCE(SUM(b."totalAmount"), 0)::float AS revenue
            FROM bookings b
            JOIN hotels h ON h.id = b."hotelId"
            GROUP BY h.id, h.title
            ORDER BY bookings DESC LIMIT 5
        """)
        top_hotels = [{"id": r[0], "title": r[1], "bookings": r[2], "revenue": float(r[3])} for r in cur.fetchall()]

        # Category distribution
        cur.execute("""
            SELECT COALESCE(h.category, 'unknown') AS category,
                   COUNT(DISTINCT h.id)::int AS count,
                   COUNT(b.id)::int AS bookings
            FROM hotels h
            LEFT JOIN bookings b ON b."hotelId" = h.id
            GROUP BY category ORDER BY bookings DESC
        """)
        category_distribution = [{"category": r[0], "count": r[1], "bookings": r[2]} for r in cur.fetchall()]

        cur.close()
        conn.close()

        return {
            "total_hotels": total_hotels,
            "hotels_with_bookings": hotels_with_bookings,
            "booking_rate_pct": booking_rate,
            "top_hotels": top_hotels,
            "category_distribution": category_distribution,
            "source": "db",
        }

    except Exception as e:
        print(f"[BI] Hotel stats failed, fallback to mock: {e}")
        data = _mock_hotel_stats()
        data["source"] = "mock"
        return data


def fetch_user_access_stats(days: int = 7) -> Dict[str, Any]:
    """Fetch user access/booking statistics from DB."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Total users from users table
        cur.execute('SELECT COUNT(*)::int FROM users')
        total_users = cur.fetchone()[0]

        # Users who have bookings (all time, since demo data is from 2024)
        cur.execute('SELECT COUNT(DISTINCT "userId")::int FROM bookings')
        active_users = cur.fetchone()[0]

        # Users with only 1 booking (approximate "new" users)
        cur.execute("""
            SELECT COUNT(*)::int FROM (
                SELECT "userId" FROM bookings GROUP BY "userId" HAVING COUNT(*) = 1
            ) sub
        """)
        single_booking_users = cur.fetchone()[0]

        # Users with > 1 booking (returning)
        cur.execute("""
            SELECT COUNT(*)::int FROM (
                SELECT "userId" FROM bookings GROUP BY "userId" HAVING COUNT(*) > 1
            ) sub
        """)
        returning_users = cur.fetchone()[0]

        # Average bookings per user
        cur.execute('SELECT AVG(cnt)::float FROM (SELECT "userId", COUNT(*)::int AS cnt FROM bookings GROUP BY "userId") sub')
        avg_bookings = round(float(cur.fetchone()[0] or 0), 1)

        # Top users by booking count
        cur.execute("""
            SELECT "userId", COUNT(*)::int AS bookings,
                   COALESCE(SUM("totalAmount"), 0)::float AS total_spent
            FROM bookings GROUP BY "userId" ORDER BY bookings DESC LIMIT 5
        """)
        top_users = [{"userId": str(r[0]), "bookings": r[1], "total_spent": float(r[2])} for r in cur.fetchall()]

        # Daily active users (last 30 days with data, not just NOW - 7)
        cur.execute("""
            SELECT DATE("createdAt") AS day, COUNT(DISTINCT "userId")::int AS users
            FROM bookings GROUP BY day ORDER BY day DESC LIMIT 30
        """)
        daily_active = [{"date": r[0].isoformat(), "users": r[1]} for r in cur.fetchall()]
        daily_active.reverse()

        cur.close()
        conn.close()

        return {
            "total_unique_users": total_users,
            "active_users_7d": active_users,
            "new_users_7d": single_booking_users,
            "returning_users_7d": returning_users,
            "avg_bookings_per_user": avg_bookings,
            "top_users": top_users,
            "daily_active_users": daily_active,
            "source": "db",
        }

    except Exception as e:
        print(f"[BI] User access stats failed, fallback to mock: {e}")
        data = _mock_user_access_stats(days)
        data["source"] = "mock"
        return data


def fetch_bi_snapshot(days: int = 7) -> Dict[str, Any]:
    """
    Fetch BI snapshot from DB. If DB schema is unavailable, fallback to mock data.
    Expected keys:
      - daily_metrics: [{date, revenue, bookings}]
      - hourly_activity: [{hour, bookings}]
      - customer_segments: [{segment, bookings}]
      - source: db|mock
    """
    daily_metrics: List[Dict[str, Any]] = []
    hourly_activity: List[Dict[str, Any]] = []
    customer_segments: List[Dict[str, Any]] = []

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Try recent data first, fallback to all data if none found
        cur.execute(
            """
            SELECT DATE("createdAt") AS day,
                   COALESCE(SUM("totalAmount"), 0) AS revenue,
                   COUNT(*) AS bookings
            FROM bookings
            WHERE "createdAt" >= NOW() - INTERVAL %s
            GROUP BY day
            ORDER BY day ASC
            """,
            (f"{days} day",),
        )
        for row in cur.fetchall():
            daily_metrics.append({
                "date": row[0].isoformat() if row[0] else None,
                "revenue": float(row[1] or 0),
                "bookings": int(row[2] or 0),
            })

        # If no recent data, get last N days with data
        if not daily_metrics:
            cur.execute("""
                SELECT DATE("createdAt") AS day,
                       COALESCE(SUM("totalAmount"), 0) AS revenue,
                       COUNT(*) AS bookings
                FROM bookings
                GROUP BY day ORDER BY day DESC LIMIT %s
            """, (days,))
            rows = cur.fetchall()
            rows.reverse()
            for row in rows:
                daily_metrics.append({
                    "date": row[0].isoformat() if row[0] else None,
                    "revenue": float(row[1] or 0),
                    "bookings": int(row[2] or 0),
                })

        # Hourly activity (all time if no recent)
        cur.execute("""
            SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour,
                   COUNT(*)::int AS bookings
            FROM bookings
            GROUP BY hour ORDER BY bookings DESC LIMIT 8
        """)
        for row in cur.fetchall():
            hourly_activity.append({"hour": int(row[0]), "bookings": int(row[1])})

        # Customer segments (all time)
        cur.execute("""
            SELECT
                CASE
                    WHEN "userId" IN (
                        SELECT "userId" FROM bookings GROUP BY "userId" HAVING COUNT(*) > 1
                    ) THEN 'returning'
                    ELSE 'new'
                END AS segment,
                COUNT(*)::int AS bookings
            FROM bookings GROUP BY segment ORDER BY bookings DESC
        """)
        for row in cur.fetchall():
            customer_segments.append({"segment": row[0], "bookings": int(row[1])})

        cur.close()
        conn.close()

        if not daily_metrics:
            raise RuntimeError("No daily data returned")

        return {
            "daily_metrics": daily_metrics,
            "hourly_activity": hourly_activity or _mock_hourly_activity(),
            "customer_segments": customer_segments or _mock_customer_segments(),
            "source": "db",
        }

    except Exception as e:
        print(f"[BI] DB snapshot failed, fallback to mock: {e}")
        return {
            "daily_metrics": _mock_daily_metrics(days),
            "hourly_activity": _mock_hourly_activity(),
            "customer_segments": _mock_customer_segments(),
            "source": "mock",
        }


# ---------------------------------------------------------
# 3. FORECAST (DETERMINISTIC)
# ---------------------------------------------------------
def forecast_next_days(daily_metrics: List[Dict[str, Any]], horizon: int = 3) -> List[Dict[str, Any]]:
    """
    Lightweight forecast using moving average of the latest 3 points.
    """
    if not daily_metrics:
        return []

    revenues = [float(x.get("revenue", 0)) for x in daily_metrics if x.get("revenue") is not None]
    bookings = [int(x.get("bookings", 0)) for x in daily_metrics if x.get("bookings") is not None]

    if not revenues or not bookings:
        return []

    window = 3 if len(revenues) >= 3 else len(revenues)
    rev_avg = sum(revenues[-window:]) / window
    book_avg = sum(bookings[-window:]) / window

    try:
        last_date = datetime.fromisoformat(str(daily_metrics[-1]["date"]))
    except Exception:
        last_date = datetime.now()

    preds: List[Dict[str, Any]] = []
    for i in range(1, horizon + 1):
        d = (last_date + timedelta(days=i)).date().isoformat()
        preds.append(
            {
                "date": d,
                "revenue_forecast": round(rev_avg, 2),
                "bookings_forecast": int(round(book_avg)),
                "method": "moving_average_3",
            }
        )

    return preds


# ---------------------------------------------------------
# 4. BI AGENT
# ---------------------------------------------------------
def _infer_period_days(user_text: str) -> int:
    text = user_text.lower()
    if "30" in text or "thang" in text or "tháng" in text:
        return 30
    if "14" in text or "2 tuan" in text or "2 tuần" in text:
        return 14
    if "hom nay" in text or "hôm nay" in text:
        return 1
    return 7


def _build_fallback_response(snapshot: Dict[str, Any], preds: List[Dict[str, Any]]) -> Dict[str, Any]:
    daily = snapshot.get("daily_metrics", [])
    total_revenue = sum(float(x.get("revenue", 0)) for x in daily)
    total_bookings = sum(int(x.get("bookings", 0)) for x in daily)

    peak_hour = None
    if snapshot.get("hourly_activity"):
        peak = max(snapshot["hourly_activity"], key=lambda x: x.get("bookings", 0))
        peak_hour = peak.get("hour")

    summary = (
        f"Tổng doanh thu kỳ gần nhất: {int(total_revenue):,} VND; "
        f"tổng booking: {total_bookings}."
    )
    if peak_hour is not None:
        summary += f" Khung giờ hoạt động cao: khoảng {peak_hour}:00."

    forecast_text = "Dự báo 3 ngày tới theo moving average 3 ngày gần nhất."
    plan = [
        "Tăng ngân sách ads trước khung giờ cao điểm 2-3 tiếng.",
        "Đẩy ưu đãi ngắn hạn cho nhóm khách mới vào cuối tuần.",
        "Theo dõi conversion theo giờ để tối ưu chiến dịch ngày hôm sau.",
    ]

    return {
        "summary": summary,
        "forecast_text": forecast_text,
        "plan": plan,
        "predictions": preds,
        "data_quality": "mock" if snapshot.get("source") == "mock" else "db",
    }


def _detect_query_type(user_text: str) -> str:
    """Detect intent using LLM when available, fallback to keyword matching."""
    # Quick keyword fallback for obvious cases
    text = user_text.lower()
    action_keywords = ["gửi mail", "send email", "khuyến mãi", "giảm giá", "gửi thông báo", "export", "xuất báo cáo"]
    for kw in action_keywords:
        if kw in text:
            return "action"

    hotel_keywords = ["khách sạn", "khach san", "hotel", "thống kê khách", "tỷ lệ đặt phòng", "category", "phân khúc"]
    user_keywords = ["người dùng", "nguoi dung", "user", "truy cập", "active", "khách hàng", "customer", "top user"]
    for kw in hotel_keywords:
        if kw in text:
            return "hotel"
    for kw in user_keywords:
        if kw in text:
            return "user"

    # Use LLM for ambiguous queries
    if client:
        try:
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                temperature=0,
                messages=[
                    {"role": "system", "content": "Phân loại câu hỏi thành 1 trong 4 loại: general, hotel, user, action. Chỉ trả về 1 từ."},
                    {"role": "user", "content": user_text},
                ],
                max_tokens=10,
            )
            result = (completion.choices[0].message.content or "").strip().lower()
            if result in ("general", "hotel", "user", "action"):
                return result
        except Exception:
            pass

    return "general"


def _detect_anomalies(daily_metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Detect anomalies in daily metrics using simple statistical rules."""
    if len(daily_metrics) < 3:
        return []

    anomalies = []
    revenues = [float(d.get("revenue", 0)) for d in daily_metrics]
    bookings = [int(d.get("bookings", 0)) for d in daily_metrics]

    import numpy as np
    rev_mean, rev_std = np.mean(revenues), np.std(revenues)
    book_mean, book_std = np.mean(bookings), np.std(bookings)

    for i, d in enumerate(daily_metrics):
        rev = float(d.get("revenue", 0))
        book = int(d.get("bookings", 0))
        reasons = []

        if rev_std > 0 and abs(rev - rev_mean) > 2 * rev_std:
            direction = "tăng đột biến" if rev > rev_mean else "giảm đột biến"
            reasons.append(f"Doanh thu {direction} ({int(rev):,} VND vs TB {int(rev_mean):,} VND)")

        if book_std > 0 and abs(book - book_mean) > 2 * book_std:
            direction = "tăng đột biến" if book > book_mean else "giảm đột biến"
            reasons.append(f"Booking {direction} ({book} vs TB {int(book_mean)})")

        # Check for steep daily drops
        if i > 0:
            prev_rev = float(daily_metrics[i - 1].get("revenue", 0))
            if prev_rev > 0 and rev < prev_rev * 0.5:
                reasons.append(f"Doanh thu giảm >50% so với ngày trước ({int(prev_rev):,} → {int(rev):,})")

        if reasons:
            anomalies.append({
                "date": d.get("date"),
                "type": "warning",
                "reasons": reasons,
                "revenue": rev,
                "bookings": book,
            })

    return anomalies


def _compute_growth_rate(current: List[Dict], previous: List[Dict]) -> Dict[str, Any]:
    """Compute growth rate between current and previous period."""
    cur_rev = sum(float(d.get("revenue", 0)) for d in current)
    prev_rev = sum(float(d.get("revenue", 0)) for d in previous)
    cur_book = sum(int(d.get("bookings", 0)) for d in current)
    prev_book = sum(int(d.get("bookings", 0)) for d in previous)

    rev_growth = round((cur_rev - prev_rev) / prev_rev * 100, 1) if prev_rev > 0 else 0
    book_growth = round((cur_book - prev_book) / prev_book * 100, 1) if prev_book > 0 else 0

    return {
        "revenue": {"current": int(cur_rev), "previous": int(prev_rev), "growth_pct": rev_growth},
        "bookings": {"current": cur_book, "previous": prev_book, "growth_pct": book_growth},
    }


def _detect_admin_action(user_text: str) -> Optional[Dict[str, Any]]:
    """Detect if admin wants to perform an action (send email, promo, etc)."""
    text = user_text.lower()

    if any(kw in text for kw in ["gửi mail", "send email", "gửi email"]):
        # Determine target audience
        if "mới" in text or "new" in text:
            target = "new_users"
            label = "khách hàng mới"
        elif "quay lại" in text or "returning" in text:
            target = "returning_users"
            label = "khách hàng quay lại"
        else:
            target = "all_active"
            label = "tất cả khách hàng active"

        return {
            "action_type": "send_email",
            "target": target,
            "label": label,
            "description": f"Gửi email cho {label}",
            "confirmation_text": f"Bạn có muốn gửi email cho {label} không?",
        }

    if any(kw in text for kw in ["giảm giá", "khuyến mãi", "discount", "promo"]):
        return {
            "action_type": "create_promo",
            "target": "all",
            "label": "tất cả khách sạn",
            "description": "Tạo chương trình khuyến mãi",
            "confirmation_text": "Bạn có muốn tạo khuyến mãi cho tất cả khách sạn không?",
        }

    return None


def _update_session_memory(user_id: str, question: str, response_summary: str):
    """Store Q&A in session memory for context."""
    if user_id not in _session_memory:
        _session_memory[user_id] = []
    _session_memory[user_id].append({
        "question": question,
        "summary": response_summary,
        "timestamp": datetime.now().isoformat(),
    })
    # Keep only last N
    _session_memory[user_id] = _session_memory[user_id][-MAX_MEMORY:]


def _get_session_context(user_id: str) -> str:
    """Get recent Q&A history for context."""
    history = _session_memory.get(user_id, [])
    if not history:
        return ""
    lines = [f"- Q: {h['question']} → A: {h['summary'][:100]}" for h in history]
    return "Lịch sử hội thoại gần đây:\n" + "\n".join(lines)


def run_bi_agent_logic(user_text: str, user_id: str = "owner") -> Dict[str, Any]:
    """
    Enhanced BI agent with:
    - LLM-based intent detection
    - Anomaly detection
    - Previous period comparison (growth_rate)
    - Admin action detection
    - Session memory
    """
    period_days = _infer_period_days(user_text)
    query_type = _detect_query_type(user_text)
    snapshot = fetch_bi_snapshot(days=period_days)
    preds = forecast_next_days(snapshot.get("daily_metrics", []), horizon=3)

    # Task 3: Fetch previous period for comparison
    prev_snapshot = fetch_bi_snapshot(days=period_days * 2)
    prev_daily = prev_snapshot.get("daily_metrics", [])[:period_days] if prev_snapshot.get("daily_metrics") else []
    growth_rate = _compute_growth_rate(snapshot.get("daily_metrics", []), prev_daily)

    # Task 1: Anomaly detection
    anomalies = _detect_anomalies(snapshot.get("daily_metrics", []))

    # Task 5: Admin action detection
    admin_action = _detect_admin_action(user_text) if query_type == "action" else None

    # Enrich with hotel or user data based on query type
    hotel_stats = None
    user_stats = None
    if query_type == "hotel":
        hotel_stats = fetch_hotel_stats(days=period_days)
    elif query_type in ("user", "action"):
        user_stats = fetch_user_access_stats(days=period_days)

    # Task 3: Session memory context
    session_context = _get_session_context(user_id)

    prompt_payload = {
        "user_question": user_text,
        "query_type": query_type,
        "period_days": period_days,
        "source": snapshot.get("source", "unknown"),
        "daily_metrics": snapshot.get("daily_metrics", []),
        "hourly_activity": snapshot.get("hourly_activity", []),
        "customer_segments": snapshot.get("customer_segments", []),
        "predictions": preds,
        "hotel_stats": hotel_stats,
        "user_access_stats": user_stats,
        "growth_rate": growth_rate,
        "anomalies": anomalies,
        "session_context": session_context,
        "required_output_schema": {
            "summary": "string",
            "forecast_text": "string",
            "plan": ["string", "string"],
            "confidence_note": "string",
            "insights": {"root_cause": "string", "actionable_suggestion": "string"},
        },
    }

    if not client:
        data = _build_fallback_response(snapshot, preds)
        data["growth_rate"] = growth_rate
        data["anomalies"] = anomalies

        # Contextual: only include relevant data
        if query_type == "general" or query_type == "action":
            data["daily_metrics"] = snapshot.get("daily_metrics", [])
            data["hourly_activity"] = snapshot.get("hourly_activity", [])
            data["customer_segments"] = snapshot.get("customer_segments", [])
            data["predictions"] = preds
            # Only show anomaly/growth for general overview
            if anomalies:
                data["insights"] = {
                    "root_cause": f"Phát hiện {len(anomalies)} ngày bất thường trong dữ liệu.",
                    "actionable_suggestion": "Kiểm tra chi tiết các ngày bất thường và điều chỉnh chiến lược.",
                }

        if admin_action:
            data["admin_action"] = admin_action
        if hotel_stats:
            data["hotel_stats"] = hotel_stats
        if user_stats:
            data["user_access_stats"] = user_stats

        # Build contextual summary
        if query_type == "user" and user_stats:
            data["summary"] = (
                f"Thống kê người dùng {period_days} ngày: "
                f"{user_stats.get('total_unique_users', 0)} tổng user, "
                f"{user_stats.get('new_users_7d', 0)} mới, "
                f"{user_stats.get('returning_users_7d', 0)} quay lại."
            )
        elif query_type == "hotel" and hotel_stats:
            data["summary"] = (
                f"Thống kê khách sạn: "
                f"{hotel_stats.get('total_hotels', 0)} tổng KS, "
                f"{hotel_stats.get('hotels_with_bookings', 0)} có booking, "
                f"tỷ lệ đặt {hotel_stats.get('booking_rate_pct', 0)}%."
            )
        elif query_type == "action" and admin_action:
            data["summary"] = f"Hành động: {admin_action['description']}. {admin_action['confirmation_text']}"

        _update_session_memory(user_id, user_text, data["summary"])

        return {
            "agent_response": data["summary"],
            "intent": {"intent_type": "BI_INSIGHTS", "query_type": query_type, "period_days": period_days},
            "data": data,
        }

    try:
        # Build enhanced system prompt
        system_prompt = (
            "Bạn là BI Analyst cho nền tảng đặt phòng khách sạn. "
            "Chỉ dùng dữ liệu được cung cấp, không tự bịa số. "
            "Trả lời theo JSON schema đã yêu cầu. "
        )
        if anomalies:
            system_prompt += (
                "PHÁT HIỆN BẤT THƯỜNG trong dữ liệu. "
                "Bạn PHẢI thêm field 'insights' với 'root_cause' (giải thích lý do) "
                "và 'actionable_suggestion' (đề xuất hành động cụ thể). "
            )
        if session_context:
            system_prompt += f"\n{session_context}"

        completion = client.chat.completions.create(
            model=BI_MODEL_NAME,
            temperature=0.1,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(prompt_payload, ensure_ascii=False)},
            ],
            response_format={"type": "json_object"},
        )

        content = completion.choices[0].message.content or "{}"
        parsed = json.loads(content)

        summary = parsed.get("summary") or "Chưa có đủ dữ liệu để kết luận rõ ràng."
        forecast_text = parsed.get("forecast_text") or "Dự báo hiện ở mức tham khảo."
        plan = parsed.get("plan") or ["Tăng chất lượng dữ liệu để cải thiện dự báo."]

        result = {
            "summary": summary,
            "forecast_text": forecast_text,
            "plan": plan,
            "confidence_note": parsed.get("confidence_note", "Confidence trung bình"),
            "data_quality": "mock" if snapshot.get("source") == "mock" else "db",
            "growth_rate": growth_rate,
            "anomalies": anomalies,
        }

        # Only include relevant data based on query type
        if query_type == "general" or query_type == "action":
            # General queries get the full overview
            result["daily_metrics"] = snapshot.get("daily_metrics", [])
            result["hourly_activity"] = snapshot.get("hourly_activity", [])
            result["customer_segments"] = snapshot.get("customer_segments", [])
            result["predictions"] = preds
        elif query_type == "user":
            # User queries only get user-related data
            pass  # user_access_stats is already set below
        elif query_type == "hotel":
            # Hotel queries only get hotel-related data
            pass  # hotel_stats is already set below

        # Task 1: Add insights from LLM if anomalies detected
        if anomalies and parsed.get("insights"):
            result["insights"] = parsed["insights"]
        elif anomalies:
            result["insights"] = {
                "root_cause": f"Có {len(anomalies)} ngày bất thường trong dữ liệu.",
                "actionable_suggestion": "Kiểm tra chi tiết và điều chỉnh chiến lược kinh doanh.",
            }

        if hotel_stats:
            result["hotel_stats"] = hotel_stats
        if user_stats:
            result["user_access_stats"] = user_stats
        if admin_action:
            result["admin_action"] = admin_action

        # Task 3: Store in memory
        _update_session_memory(user_id, user_text, summary[:200])

        return {
            "agent_response": summary,
            "intent": {"intent_type": "BI_INSIGHTS", "query_type": query_type, "period_days": period_days},
            "data": result,
        }

    except Exception as e:
        print(f"[BI] Groq error: {e}")
        print(traceback.format_exc())
        data = _build_fallback_response(snapshot, preds)
        data["growth_rate"] = growth_rate
        data["anomalies"] = anomalies
        if hotel_stats:
            data["hotel_stats"] = hotel_stats
        if user_stats:
            data["user_access_stats"] = user_stats
        if admin_action:
            data["admin_action"] = admin_action
        if anomalies:
            data["insights"] = {
                "root_cause": f"Có {len(anomalies)} ngày bất thường.",
                "actionable_suggestion": "Kiểm tra chi tiết và điều chỉnh chiến lược.",
            }
        return {
            "agent_response": data["summary"],
            "intent": {"intent_type": "BI_INSIGHTS", "query_type": query_type, "period_days": period_days},
            "data": data,
        }


# (Old run_bi_agent_logic removed — replaced by enhanced version above)
