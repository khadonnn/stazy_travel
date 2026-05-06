import os
import json
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

        # Try a common booking schema first.
        cur.execute(
            """
            SELECT DATE("createdAt") AS day,
                   COALESCE(SUM("totalPrice"), 0) AS revenue,
                   COUNT(*) AS bookings
            FROM bookings
            WHERE "createdAt" >= NOW() - INTERVAL %s
            GROUP BY day
            ORDER BY day ASC
            """,
            (f"{days} day",),
        )
        for row in cur.fetchall():
            daily_metrics.append(
                {
                    "date": row[0].isoformat() if row[0] else None,
                    "revenue": float(row[1] or 0),
                    "bookings": int(row[2] or 0),
                }
            )

        cur.execute(
            """
            SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour,
                   COUNT(*)::int AS bookings
            FROM bookings
            WHERE "createdAt" >= NOW() - INTERVAL '7 day'
            GROUP BY hour
            ORDER BY bookings DESC
            LIMIT 8
            """
        )
        for row in cur.fetchall():
            hourly_activity.append({"hour": int(row[0]), "bookings": int(row[1])})

        cur.execute(
            """
            SELECT
                CASE
                    WHEN "userId" IN (
                        SELECT "userId"
                        FROM bookings
                        GROUP BY "userId"
                        HAVING COUNT(*) > 1
                    ) THEN 'returning'
                    ELSE 'new'
                END AS segment,
                COUNT(*)::int AS bookings
            FROM bookings
            WHERE "createdAt" >= NOW() - INTERVAL '30 day'
            GROUP BY segment
            ORDER BY bookings DESC
            """
        )
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


def run_bi_agent_logic(user_text: str, user_id: str = "owner") -> Dict[str, Any]:
    """
    Separate BI agent (independent from agent.py).
    Returns a single BI_INSIGHTS payload with {summary, forecast_text, plan}.
    """
    period_days = _infer_period_days(user_text)
    snapshot = fetch_bi_snapshot(days=period_days)
    preds = forecast_next_days(snapshot.get("daily_metrics", []), horizon=3)

    prompt_payload = {
        "user_question": user_text,
        "period_days": period_days,
        "source": snapshot.get("source", "unknown"),
        "daily_metrics": snapshot.get("daily_metrics", []),
        "hourly_activity": snapshot.get("hourly_activity", []),
        "customer_segments": snapshot.get("customer_segments", []),
        "predictions": preds,
        "required_output_schema": {
            "summary": "string",
            "forecast_text": "string",
            "plan": ["string", "string"],
            "confidence_note": "string",
        },
    }

    if not client:
        data = _build_fallback_response(snapshot, preds)
        return {
            "agent_response": data["summary"],
            "intent": {"intent_type": "BI_INSIGHTS", "period_days": period_days},
            "data": data,
        }

    try:
        completion = client.chat.completions.create(
            model=BI_MODEL_NAME,
            temperature=0.1,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Bạn là BI Analyst cho nền tảng đặt phòng khách sạn. "
                        "Chỉ dùng dữ liệu được cung cấp, không tự bịa số. "
                        "Trả lời theo JSON schema đã yêu cầu."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(prompt_payload, ensure_ascii=False),
                },
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
            "predictions": preds,
            "data_quality": "mock" if snapshot.get("source") == "mock" else "db",
            "daily_metrics": snapshot.get("daily_metrics", []),
            "hourly_activity": snapshot.get("hourly_activity", []),
            "customer_segments": snapshot.get("customer_segments", []),
        }

        return {
            "agent_response": summary,
            "intent": {"intent_type": "BI_INSIGHTS", "period_days": period_days},
            "data": result,
        }

    except Exception as e:
        print(f"[BI] Groq error: {e}")
        print(traceback.format_exc())
        data = _build_fallback_response(snapshot, preds)
        return {
            "agent_response": data["summary"],
            "intent": {"intent_type": "BI_INSIGHTS", "period_days": period_days},
            "data": data,
        }
