from typing import Any, Dict, Optional

DEFAULT_FOOD_PER_PERSON_PER_DAY = 300000
DEFAULT_TRANSPORT_COST = 500000


def _coerce_int(value: Optional[Any], default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def estimate_trip_cost(
    hotel_price: Optional[Any],
    trip_days: Optional[int],
    trip_nights: Optional[int],
    adults: int = 2,
) -> Dict[str, int]:
    days = _coerce_int(trip_days, 0)
    nights = _coerce_int(trip_nights, 0)

    if days <= 0 and nights > 0:
        days = nights + 1
    if nights <= 0 and days > 0:
        nights = max(days - 1, 0)

    hotel_rate = _coerce_int(hotel_price, 0)
    hotel_cost = hotel_rate * nights
    food_cost = max(adults, 0) * DEFAULT_FOOD_PER_PERSON_PER_DAY * max(days, 0)
    transport_cost = DEFAULT_TRANSPORT_COST
    total_cost = hotel_cost + food_cost + transport_cost

    return {
        "hotel": hotel_cost,
        "food": food_cost,
        "transport": transport_cost,
        "total": total_cost,
    }


def build_cost_context(
    cost_estimation: Dict[str, int],
    budget: Optional[int] = None,
    trip_days: Optional[int] = None,
    trip_nights: Optional[int] = None,
    adults: int = 2,
    hotel_name: Optional[str] = None,
) -> str:
    lines = ["[TRIP COST ESTIMATION]"]

    if hotel_name:
        lines.append(f"Hotel tham chieu: {hotel_name}")
    if trip_days is not None:
        lines.append(f"So ngay: {trip_days}")
    if trip_nights is not None:
        lines.append(f"So dem: {trip_nights}")
    lines.append(f"So nguoi lon: {max(adults, 0)}")
    lines.append(f"Chi phi phong: {cost_estimation['hotel']:,} VND")
    lines.append(f"Chi phi an uong: {cost_estimation['food']:,} VND")
    lines.append(f"Chi phi di chuyen: {cost_estimation['transport']:,} VND")
    lines.append(f"Tong chi phi uoc tinh: {cost_estimation['total']:,} VND")

    if budget is not None:
        within_budget = cost_estimation["total"] <= budget
        exceeded_amount = max(cost_estimation["total"] - budget, 0)
        lines.append(f"Budget tong chuyen di: {budget:,} VND")
        lines.append(f"Within budget: {str(within_budget).lower()}")
        lines.append(f"Exceeded amount: {exceeded_amount:,} VND")

    return "\n".join(lines)