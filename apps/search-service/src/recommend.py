# src/recommend.py
# Multi-Strategy Recommendation Engine with Intent Layering
# Strategies: svd (default), user_cf, item_cf, content, popular
# Usage: Called by main.py endpoint /recommend/{user_id}?strategy=svd

import os
import pickle
import random
import json
import time
import numpy as np
from collections import defaultdict
from sklearn.metrics.pairwise import cosine_similarity
from src.db_utils import get_user_interested_categories
import sqlalchemy as sa
from sqlalchemy import create_engine, text as sql_text

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
MODEL_PATH = "jsons/recsys_model.pkl"
HOTELS_FILE = "jsons/__homeStay.json"
INTERACTIONS_FILE = "jsons/__interactions.json"

# PostgreSQL connection (for realtime interactions)
DB_URL = os.getenv("DATABASE_URL", "postgresql://admin:123456@localhost:5432/products")
_pg_engine = None

def _get_pg_engine():
    """Get or create PostgreSQL engine (lazy init)."""
    global _pg_engine
    if _pg_engine is None:
        try:
            _pg_engine = create_engine(DB_URL, pool_pre_ping=True, pool_size=2)
        except Exception as e:
            print(f"⚠️ [Recommend] Cannot connect to PostgreSQL: {e}")
    return _pg_engine

def get_realtime_interactions(user_id: str = None) -> list:
    """
    Read interactions DIRECTLY from PostgreSQL (source of truth).
    Falls back to __interactions.json if DB unavailable.
    """
    engine = _get_pg_engine()
    if engine is None:
        print("⚠️ [Recommend] DB unavailable, falling back to JSON file")
        return get_all_interactions()
    
    try:
        with engine.connect() as conn:
            if user_id:
                result = conn.execute(
                    sql_text(
                        'SELECT "userId", "hotelId", type, rating, timestamp '
                        'FROM interactions WHERE "userId" = :uid ORDER BY timestamp DESC'
                    ),
                    {"uid": user_id}
                )
            else:
                result = conn.execute(
                    sql_text(
                        'SELECT "userId", "hotelId", type, rating, timestamp '
                        'FROM interactions ORDER BY timestamp DESC'
                    )
                )
            rows = result.fetchall()
        
        if not rows:
            print("⚠️ [Recommend] No interactions in PostgreSQL, falling back to JSON")
            return get_all_interactions()
        
        interactions = []
        for row in rows:
            interactions.append({
                "userId": row[0],
                "hotelId": row[1],
                "type": row[2],
                "rating": float(row[3]) if row[3] else None,
                "timestamp": row[4].isoformat() if row[4] else "",
            })
        
        print(f"✅ [Recommend] Loaded {len(interactions)} realtime interactions from PostgreSQL")
        return interactions
        
    except Exception as e:
        print(f"⚠️ [Recommend] PostgreSQL query failed: {e}, falling back to JSON")
        return get_all_interactions()

# Hybrid weights
CONTENT_WEIGHT = 0.40
COLLABORATIVE_WEIGHT = 0.30
SENTIMENT_WEIGHT = 0.20
POPULARITY_WEIGHT = 0.10

# Legacy SVD+Content hybrid
SVD_WEIGHT = 0.6
CONTENT_WEIGHT_SVD = 0.4

# Content feature weights (session dest is strongest)
SESSION_DEST_WEIGHT = 0.35     # SESSION destination (strongest signal)
PRICE_WEIGHT = 0.15
LOCATION_WEIGHT = 0.10
DESTINATION_WEIGHT = 0.10      # Historical destination (weaker)
AMENITY_WEIGHT = 0.15
CATEGORY_WEIGHT = 0.15

# Intent priority weights
SELECTED_HOTEL_WEIGHT = 1.0    # Primary: explicit selection
RECENCY_WEIGHT_1_3 = 0.8      # Last 1-3 interactions
RECENCY_WEIGHT_4_6 = 0.5      # Interactions 4-6
RECENCY_WEIGHT_7_10 = 0.3     # Interactions 7-10

# Session intent
SELECTED_HOTEL_WINDOW = 3      # Last N high-intent interactions
RECENCY_WINDOW = 10            # Last N interactions for weighted recency
SESSION_DECAY_MINUTES = 120    # Session expires after 2 hours (was 30 min)
SESSION_DEST_THRESHOLD = 0.6   # Long-term fallback threshold

# Confidence-based destination multipliers (prevent recommendation collapse)
# Weak:   1.2x (1 high-intent interaction, long-term preference)
# Medium: 1.4x (weighted recency signal)
# Strong: 1.6x (2/3+ high-intent interactions = selected hotels)
MULTIPLIER_STRONG = 1.6
MULTIPLIER_MEDIUM = 1.4
MULTIPLIER_WEAK = 1.2

# High-intent interaction types (explicit selection)
HIGH_INTENT_TYPES = {"CLICK_BOOK_NOW", "ADD_TO_WISHLIST", "BOOK"}

# User-CF parameters
USER_CF_K = 10

# ---------------------------------------------------------
# LOAD MODEL & DATA
# ---------------------------------------------------------
algo = None

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            algo = pickle.load(f)
        print("✅ [Recommend] Loaded SVD model.")
    except Exception as e:
        print(f"❌ [Recommend] Model error: {e}")

_hotels_cache = None
def get_all_hotels():
    global _hotels_cache
    if _hotels_cache is None:
        try:
            with open(HOTELS_FILE, "r", encoding="utf-8") as f:
                _hotels_cache = json.load(f)
        except:
            _hotels_cache = []
    return _hotels_cache

_interactions_cache = None
def get_all_interactions():
    global _interactions_cache
    if _interactions_cache is None:
        try:
            with open(INTERACTIONS_FILE, "r", encoding="utf-8") as f:
                _interactions_cache = json.load(f)
        except:
            _interactions_cache = []
    return _interactions_cache

# Precomputed matrices (lazy init)
_user_item_matrix = None
_user_similarity_df = None
_item_similarity_df = None

def _build_user_item_matrix():
    global _user_item_matrix
    if _user_item_matrix is not None:
        return _user_item_matrix

    interactions = get_all_interactions()
    if not interactions:
        return None

    signal_weights = {
        "VIEW": 0.5, "CLICK_BOOK_NOW": 2.0, "ADD_TO_WISHLIST": 3.0,
        "RATE_POSITIVE": 4.5, "BOOK": 5.0, "RATE_NEGATIVE": -3.0,
    }

    data = defaultdict(lambda: defaultdict(float))
    all_users = set()
    all_hotels = set()

    for inter in interactions:
        uid = inter.get('userId')
        hid = inter.get('hotelId')
        itype = inter.get('type')
        if itype in signal_weights:
            data[uid][hid] = max(data[uid][hid], signal_weights[itype])
            all_users.add(uid)
            all_hotels.add(hid)

    reviews_file = INTERACTIONS_FILE.replace("__interactions.json", "__reviews.json")
    try:
        with open(reviews_file, "r", encoding="utf-8") as f:
            reviews = json.load(f)
        for rev in reviews:
            uid = rev.get('userId')
            hid = rev.get('hotelId')
            rating = float(rev.get('rating', 0))
            if rating > 0:
                data[uid][hid] = rating
                all_users.add(uid)
                all_hotels.add(hid)
    except:
        pass

    user_list = sorted(all_users)
    hotel_list = sorted(all_hotels)
    matrix = np.zeros((len(user_list), len(hotel_list)))
    user_idx = {u: i for i, u in enumerate(user_list)}
    hotel_idx = {h: i for i, h in enumerate(hotel_list)}

    for uid, items in data.items():
        for hid, score in items.items():
            matrix[user_idx[uid]][hotel_idx[hid]] = score

    _user_item_matrix = {
        'matrix': matrix, 'user_list': user_list, 'hotel_list': hotel_list,
        'user_idx': user_idx, 'hotel_idx': hotel_idx
    }
    print(f"✅ [Recommend] Built user-item matrix: {matrix.shape}")
    return _user_item_matrix


def _get_user_similarity():
    global _user_similarity_df
    if _user_similarity_df is not None:
        return _user_similarity_df
    uim = _build_user_item_matrix()
    if uim is None:
        return None
    sim_matrix = cosine_similarity(uim['matrix'])
    _user_similarity_df = {'matrix': sim_matrix, 'user_list': uim['user_list']}
    return _user_similarity_df


def _get_item_similarity():
    global _item_similarity_df
    if _item_similarity_df is not None:
        return _item_similarity_df
    uim = _build_user_item_matrix()
    if uim is None:
        return None
    item_matrix = uim['matrix'].T
    sim_matrix = cosine_similarity(item_matrix)
    _item_similarity_df = {'matrix': sim_matrix, 'hotel_list': uim['hotel_list']}
    return _item_similarity_df


# =========================================================
# INTENT LAYERING: Weighted Recency + Session Decay
# =========================================================

def get_recency_weight(position: int) -> float:
    """Get weight based on position (0 = most recent)."""
    if position < 3:
        return RECENCY_WEIGHT_1_3
    if position < 6:
        return RECENCY_WEIGHT_4_6
    return RECENCY_WEIGHT_7_10


def _time_decay_weight(interaction_ts_str: str, now_ts: float) -> float:
    """
    Time-decay weight for interaction age:
      <5 min    → 1.0  (full weight)
      5-15 min  → 0.8
      15-30 min → 0.6
      30-60 min → 0.4
      60-120 min→ 0.25
      >120 min  → 0.1  (never zero out - old interactions still count)
    """
    if not interaction_ts_str:
        return 0.3
    try:
        inter_ts = time.mktime(
            time.strptime(interaction_ts_str[:19], "%Y-%m-%dT%H:%M:%S")
        )
        minutes_ago = (now_ts - inter_ts) / 60
        if minutes_ago < 5:
            return 1.0
        elif minutes_ago < 15:
            return 0.8
        elif minutes_ago < 30:
            return 0.6
        elif minutes_ago < 60:
            return 0.4
        elif minutes_ago < 120:
            return 0.25
        else:
            return 0.1
    except:
        return 0.3


def detect_intent(user_id: str) -> dict:
    """
    Detect intent with priority cascade.
    
    Reads interactions from PostgreSQL (source of truth) for realtime accuracy.
    Uses time-decay weighting so recent interactions matter more.
    
    Returns: {'destination': str, 'confidence': float, 'source': str, 'multiplier': float}
    """
    interactions = get_realtime_interactions(user_id)
    hotels = {h['id']: h for h in get_all_hotels()}
    
    user_inters = [i for i in interactions if i['userId'] == user_id]
    if not user_inters:
        return None
    
    # Sort by timestamp (most recent first)
    user_inters_sorted = sorted(
        user_inters,
        key=lambda x: x.get('timestamp', ''),
        reverse=True
    )
    
    # SESSION DECAY: Check if latest interaction is stale
    latest_ts_str = user_inters_sorted[0].get('timestamp', '')
    now_ts = time.time()
    if latest_ts_str:
        try:
            latest_ts = time.mktime(
                time.strptime(latest_ts_str[:19], "%Y-%m-%dT%H:%M:%S")
            )
            minutes_since = (now_ts - latest_ts) / 60
            if minutes_since > SESSION_DECAY_MINUTES:
                print(f"[intent] Session expired: {minutes_since:.0f}min since last interaction")
                return None
        except:
            pass
    
    # =========================================================
    # PRIORITY 1: Selected Hotels (highest priority, time-decayed)
    # =========================================================
    high_intent = [i for i in user_inters_sorted if i.get('type') in HIGH_INTENT_TYPES]
    selected_hotels = high_intent[:SELECTED_HOTEL_WINDOW]
    
    if len(selected_hotels) >= 2:
        dest_counts = defaultdict(float)
        for inter in selected_hotels:
            hotel = hotels.get(inter['hotelId'])
            if hotel:
                dest = hotel.get('destination', '')
                if dest:
                    tdw = _time_decay_weight(inter.get('timestamp', ''), now_ts)
                    dest_counts[dest] += tdw
        
        if dest_counts:
            top_dest = max(dest_counts, key=dest_counts.get)
            ratio = dest_counts[top_dest] / len(selected_hotels)
            
            if ratio >= 0.66:
                multiplier = MULTIPLIER_STRONG
                print(f"[intent] 🎯 SELECTED HOTELS: \"{top_dest}\" "
                      f"({dest_counts[top_dest]:.1f}/{len(selected_hotels)} = {ratio:.0%}) "
                      f"→ multiplier={multiplier:.2f}x")
                return {
                    'destination': top_dest,
                    'confidence': ratio * SELECTED_HOTEL_WEIGHT,
                    'source': 'selected',
                    'multiplier': multiplier
                }
    
    # =========================================================
    # PRIORITY 2: Weighted Recency Window (medium priority, time-decayed)
    # =========================================================
    recent = user_inters_sorted[:RECENCY_WINDOW]
    weighted_scores = defaultdict(float)
    total_weight = 0
    
    for i, inter in enumerate(recent):
        hotel = hotels.get(inter['hotelId'])
        if not hotel:
            continue
        dest = hotel.get('destination', '')
        if not dest:
            continue
        recency_weight = get_recency_weight(i)
        tdw = _time_decay_weight(inter.get('timestamp', ''), now_ts)
        combined_weight = recency_weight * tdw
        weighted_scores[dest] += combined_weight
        total_weight += combined_weight
    
    if weighted_scores and total_weight > 0:
        top_dest = max(weighted_scores, key=weighted_scores.get)
        ratio = weighted_scores[top_dest] / total_weight
        
        if ratio >= 0.4:
            multiplier = MULTIPLIER_MEDIUM
            print(f"[intent] 📍 WEIGHTED RECENCY: \"{top_dest}\" "
                  f"(weighted ratio={ratio:.0%}) → multiplier={multiplier:.2f}x")
            return {
                'destination': top_dest,
                'confidence': ratio * RECENCY_WEIGHT_1_3,
                'source': 'recency',
                'multiplier': multiplier
            }
    
    # =========================================================
    # PRIORITY 3: Long-term Profile (lowest priority)
    # =========================================================
    all_dest_counts = defaultdict(int)
    for inter in user_inters:
        hotel = hotels.get(inter['hotelId'])
        if hotel:
            dest = hotel.get('destination', '')
            if dest:
                all_dest_counts[dest] += 1
    
    if all_dest_counts:
        top_dest = max(all_dest_counts, key=all_dest_counts.get)
        ratio = all_dest_counts[top_dest] / len(user_inters)
        
        if ratio >= SESSION_DEST_THRESHOLD:
            multiplier = MULTIPLIER_WEAK
            print(f"[intent] 📊 LONG-TERM: \"{top_dest}\" ({ratio:.0%}) "
                  f"→ multiplier={multiplier:.2f}x")
            return {
                'destination': top_dest,
                'confidence': ratio * 0.3,
                'source': 'longterm',
                'multiplier': multiplier
            }
    
    print(f"[intent] No strong intent signal detected")
    return None


def build_user_profile(user_id: str) -> dict:
    """Build user profile with session-aware destination tracking.
    
    Reads interactions from PostgreSQL (source of truth) for realtime accuracy.
    """
    interactions = get_realtime_interactions(user_id)
    hotels = {h['id']: h for h in get_all_hotels()}

    user_inters = [i for i in interactions if i['userId'] == user_id]
    if not user_inters:
        return None

    location_counts = defaultdict(int)
    category_counts = defaultdict(int)
    amenity_counts = defaultdict(int)
    destination_counts = defaultdict(int)
    prices = []

    weight_map = {
        "VIEW": 0.5, "CLICK_BOOK_NOW": 2.0, "ADD_TO_WISHLIST": 3.0,
        "RATE_POSITIVE": 4.5, "BOOK": 5.0, "RATE_NEGATIVE": -3.0,
    }

    for inter in user_inters:
        hotel = hotels.get(inter['hotelId'])
        if not hotel:
            continue
        w = weight_map.get(inter['type'], 1.0)

        dest = hotel.get('destination', '')
        if dest:
            destination_counts[dest] += w

        address = hotel.get('address', '')
        if ' Đường ' in address:
            location = address.split(' Đường ')[-1].split(',')[0]
            location_counts[location] += w

        category = hotel.get('category', '')
        if category:
            category_counts[category] += w

        for amenity in hotel.get('amenities', []):
            amenity_counts[amenity] += w

        prices.append(hotel.get('price', 0))

    return {
        'preferred_locations': dict(location_counts),
        'preferred_categories': dict(category_counts),
        'preferred_amenities': dict(amenity_counts),
        'preferred_destinations': dict(destination_counts),
        'avg_price': np.mean(prices) if prices else 0,
        'total_interactions': len(user_inters)
    }


# ---------------------------------------------------------
# CONTENT SIMILARITY SCORING WITH SESSION INTENT
# ---------------------------------------------------------
def compute_content_score(
    user_profile: dict,
    hotel: dict,
    session_destination: str = None,
    dest_multiplier: float = 1.0,
) -> float:
    """
    Content-based similarity with INTENT LAYERING:
    - SESSION destination gets STRONGEST boost (multiplicative)
    - Historical destination gets WEAKER boost
    """
    if not user_profile:
        return 0.5

    scores = []
    hotel_dest = hotel.get('destination', '')
    hotel_dest_lower = hotel_dest.lower() if hotel_dest else ''

    # SESSION DESTINATION BOOST (strongest signal, multiplicative)
    if session_destination:
        if hotel_dest_lower == session_destination.lower():
            scores.append(1.0 * SESSION_DEST_WEIGHT)
        else:
            scores.append(0.0 * SESSION_DEST_WEIGHT)
    else:
        # No session intent → use historical destination
        dest_pref = user_profile.get('preferred_destinations', {})
        if hotel_dest and dest_pref:
            max_dest_count = max(dest_pref.values()) if dest_pref else 1
            dest_score = dest_pref.get(hotel_dest, 0) / max_dest_count
            scores.append(dest_score * DESTINATION_WEIGHT)
        else:
            scores.append(0.1 * DESTINATION_WEIGHT)

    # Price match
    avg_price = user_profile['avg_price']
    hotel_price = hotel.get('price', avg_price)
    if avg_price > 0:
        price_ratio = min(avg_price, hotel_price) / max(avg_price, hotel_price)
        scores.append(price_ratio * PRICE_WEIGHT)
    else:
        scores.append(0.5 * PRICE_WEIGHT)

    # Location match
    hotel_address = hotel.get('address', '')
    hotel_location = hotel_address.split(' Đường ')[-1].split(',')[0] if ' Đường ' in hotel_address else ''
    loc_pref = user_profile['preferred_locations']
    if hotel_location and loc_pref:
        max_loc_count = max(loc_pref.values()) if loc_pref else 1
        loc_score = loc_pref.get(hotel_location, 0) / max_loc_count
        scores.append(loc_score * LOCATION_WEIGHT)
    else:
        scores.append(0.3 * LOCATION_WEIGHT)

    # Amenity overlap
    hotel_amenities = set(hotel.get('amenities', []))
    user_amenities = user_profile['preferred_amenities']
    if hotel_amenities and user_amenities:
        max_amenity_count = max(user_amenities.values()) if user_amenities else 1
        amenity_score = sum(user_amenities.get(a, 0) for a in hotel_amenities) / (len(hotel_amenities) * max_amenity_count)
        scores.append(min(1.0, amenity_score) * AMENITY_WEIGHT)
    else:
        scores.append(0.3 * AMENITY_WEIGHT)

    # Category match
    hotel_category = hotel.get('category', '')
    cat_pref = user_profile['preferred_categories']
    if hotel_category and cat_pref:
        max_cat_count = max(cat_pref.values()) if cat_pref else 1
        cat_score = cat_pref.get(hotel_category, 0) / max_cat_count
        scores.append(cat_score * CATEGORY_WEIGHT)
    else:
        scores.append(0.3 * CATEGORY_WEIGHT)

    return sum(scores)


# =========================================================
# STRATEGY 1: SVD (Hybrid SVD + Content)
# =========================================================
def svd_recommend(user_id: str, hotels: list, top_k: int = 5) -> list:
    if not algo:
        print("⚠️ [SVD] No model loaded, falling back to popular")
        return popular_recommend(hotels, top_k)

    try:
        algo.trainset.to_inner_uid(user_id)
    except ValueError:
        print(f"👶 [SVD] User {user_id} not in model, falling back to content")
        return content_recommend(user_id, hotels, top_k)

    print(f"🤖 [SVD] User {user_id} → Hybrid SVD + Content scoring.")
    user_profile = build_user_profile(user_id)

    # Detect session intent
    intent = detect_intent(user_id)
    session_dest = intent['destination'] if intent else None
    dest_multiplier = intent['multiplier'] if intent else 1.0

    if session_dest:
        print(f"🎯 [SVD] Session destination: \"{session_dest}\" ({intent['source']})")

    predictions = []
    for hotel in hotels:
        svd_pred = algo.predict(user_id, hotel.get("id"))
        svd_score = svd_pred.est

        content_score = compute_content_score(user_profile, hotel, session_dest, dest_multiplier)
        svd_normalized = (svd_score - 1) / 4

        hybrid_score = SVD_WEIGHT * svd_normalized + CONTENT_WEIGHT_SVD * content_score

        # MULTIPLICATIVE boost for session destination match
        if session_dest and (hotel.get('destination') or '').lower() == session_dest.lower():
            hybrid_score = min(1.0, hybrid_score * dest_multiplier)

        predictions.append({
            "data": hotel,
            "score": hybrid_score,
            "svd_score": svd_score,
            "content_score": content_score
        })

    predictions.sort(key=lambda x: x["score"], reverse=True)

    for i, p in enumerate(predictions[:3]):
        print(f"   #{i+1}: {p['data'].get('title', 'N/A')[:30]} | "
              f"SVD={p['svd_score']:.2f} | Content={p['content_score']:.3f} | "
              f"Hybrid={p['score']:.3f}")

    return [p["data"] for p in predictions[:top_k]]


# =========================================================
# STRATEGIES 2-5 (User-CF, Item-CF, Content, Popular)
# =========================================================
def user_based_cf_recommend(user_id: str, hotels: list, top_k: int = 5) -> list:
    uim = _build_user_item_matrix()
    usim = _get_user_similarity()
    if uim is None or usim is None:
        return popular_recommend(hotels, top_k)

    user_idx_map = uim['user_idx']
    hotel_list = uim['hotel_list']
    matrix = uim['matrix']

    if user_id not in user_idx_map:
        return content_recommend(user_id, hotels, top_k)

    uid_idx = user_idx_map[user_id]
    sim_scores = usim['matrix'][uid_idx]
    sim_users = [(i, sim_scores[i]) for i in range(len(sim_scores)) if i != uid_idx]
    sim_users.sort(key=lambda x: x[1], reverse=True)
    top_similar = sim_users[:USER_CF_K]

    user_rated = set(np.where(matrix[uid_idx] > 0)[0])
    item_scores = defaultdict(float)
    item_sim_sum = defaultdict(float)

    for neighbor_idx, similarity in top_similar:
        if similarity <= 0:
            continue
        for item_idx in range(len(hotel_list)):
            if item_idx in user_rated:
                continue
            if matrix[neighbor_idx][item_idx] > 0:
                item_scores[item_idx] += similarity * matrix[neighbor_idx][item_idx]
                item_sim_sum[item_idx] += similarity

    final_scores = []
    for item_idx, score_sum in item_scores.items():
        normalized = score_sum / item_sim_sum[item_idx] if item_sim_sum[item_idx] > 0 else 0
        final_scores.append((item_idx, normalized))
    final_scores.sort(key=lambda x: x[1], reverse=True)

    hotels_by_id = {h['id']: h for h in hotels}
    results = []
    for item_idx, score in final_scores[:top_k * 2]:
        hotel_id = hotel_list[item_idx]
        hotel = hotels_by_id.get(hotel_id)
        if hotel:
            results.append(hotel)
        if len(results) >= top_k:
            break

    return results if results else popular_recommend(hotels, top_k)


def item_based_cf_recommend(user_id: str, hotels: list, top_k: int = 5) -> list:
    uim = _build_user_item_matrix()
    isim = _get_item_similarity()
    if uim is None or isim is None:
        return popular_recommend(hotels, top_k)

    user_idx_map = uim['user_idx']
    hotel_list = uim['hotel_list']
    matrix = uim['matrix']

    if user_id not in user_idx_map:
        return content_recommend(user_id, hotels, top_k)

    uid_idx = user_idx_map[user_id]
    user_ratings = matrix[uid_idx]
    rated_indices = np.where(user_ratings > 0)[0]
    if len(rated_indices) == 0:
        return content_recommend(user_id, hotels, top_k)

    item_scores = defaultdict(float)
    item_sim_sum = defaultdict(float)

    for rated_idx in rated_indices:
        user_rating = user_ratings[rated_idx]
        sim_scores = isim['matrix'][rated_idx]
        for candidate_idx in range(len(hotel_list)):
            if candidate_idx in set(rated_indices):
                continue
            if sim_scores[candidate_idx] > 0:
                item_scores[candidate_idx] += sim_scores[candidate_idx] * user_rating
                item_sim_sum[candidate_idx] += sim_scores[candidate_idx]

    final_scores = []
    for item_idx, score_sum in item_scores.items():
        normalized = score_sum / item_sim_sum[item_idx] if item_sim_sum[item_idx] > 0 else 0
        final_scores.append((item_idx, normalized))
    final_scores.sort(key=lambda x: x[1], reverse=True)

    hotels_by_id = {h['id']: h for h in hotels}
    results = []
    for item_idx, score in final_scores[:top_k * 2]:
        hotel_id = hotel_list[item_idx]
        hotel = hotels_by_id.get(hotel_id)
        if hotel:
            results.append(hotel)
        if len(results) >= top_k:
            break

    return results if results else popular_recommend(hotels, top_k)


def content_recommend(user_id: str, hotels: list, top_k: int = 5) -> list:
    print(f"👶 [Content] User {user_id} → Content-based.")
    interested_cats = get_user_interested_categories(user_id)
    if interested_cats:
        scored_hotels = []
        for hotel in hotels:
            match_score = 0
            if hotel.get('category') in interested_cats:
                match_score += 2
            if hotel.get('slug') in interested_cats:
                match_score += 1
            for tag in hotel.get('tags', []):
                if tag in interested_cats:
                    match_score += 1
            if match_score > 0:
                scored_hotels.append((hotel, match_score))
        if scored_hotels:
            scored_hotels.sort(key=lambda x: x[1], reverse=True)
            return [h[0] for h in scored_hotels[:top_k]]
    return popular_recommend(hotels, top_k)


def popular_recommend(hotels: list, top_k: int = 5) -> list:
    print("🎲 [Popular] Fallback → Top-rated hotels.")
    return sorted(hotels, key=lambda h: (h.get('reviewStar', 0) * h.get('reviewCount', 0)), reverse=True)[:top_k]


# =========================================================
# SESSION-AWARE DIVERSITY
# =========================================================
def diverse_recommend(hotels: list, top_k: int = 5, session_destination: str = None) -> list:
    """
    Session-aware diversity:
    - Session active → diversify WITHIN same destination
    - No session → cross-destination diversity
    """
    if session_destination:
        print(f"🌍 [Diverse] Session dest: \"{session_destination}\" → intra-destination")
        same_dest = [h for h in hotels
                     if (h.get('destination') or '').lower() == session_destination.lower()]
        if len(same_dest) >= top_k:
            same_dest.sort(key=lambda h: h.get('reviewStar', 0), reverse=True)
            return same_dest[:top_k]
        others = [h for h in hotels
                  if (h.get('destination') or '').lower() != session_destination.lower()]
        others.sort(key=lambda h: h.get('reviewStar', 0), reverse=True)
        return (same_dest + others)[:top_k]

    print("🌍 [Diverse] Cross-destination diversity")
    by_dest = defaultdict(list)
    for h in hotels:
        dest = h.get('destination') or h.get('address', '').split(',')[-1].strip() or 'unknown'
        by_dest[dest].append(h)
    for dest in by_dest:
        by_dest[dest].sort(key=lambda h: h.get('reviewStar', 0), reverse=True)

    result = []
    dest_keys = sorted(by_dest.keys(), key=lambda d: -max(h.get('reviewStar', 0) for h in by_dest[d]))
    while len(result) < top_k:
        added = False
        for dest in dest_keys:
            if len(result) >= top_k:
                break
            if by_dest[dest]:
                result.append(by_dest[dest].pop(0))
                added = True
        if not added:
            break
    return result[:top_k]


# =========================================================
# SIMILAR HOTELS
# =========================================================
def get_similar_hotels(hotel_id, hotels: list, top_k: int = 5) -> list:
    isim = _get_item_similarity()
    if isim is None:
        target = next((h for h in hotels if str(h.get('id')) == str(hotel_id)), None)
        if not target:
            return popular_recommend(hotels, top_k)
        same_cat = [h for h in hotels
                    if h.get('category') == target.get('category')
                    and str(h.get('id')) != str(hotel_id)]
        return same_cat[:top_k] if same_cat else popular_recommend(hotels, top_k)

    hotel_list = isim['hotel_list']
    hotel_idx_map = {hid: i for i, hid in enumerate(hotel_list)}
    if hotel_id not in hotel_idx_map:
        return popular_recommend(hotels, top_k)

    idx = hotel_idx_map[hotel_id]
    sim_scores = isim['matrix'][idx]
    similar_indices = [(i, sim_scores[i]) for i in range(len(sim_scores)) if i != idx]
    similar_indices.sort(key=lambda x: x[1], reverse=True)

    hotels_by_id = {h['id']: h for h in hotels}
    results = []
    for item_idx, score in similar_indices[:top_k * 2]:
        hid = hotel_list[item_idx]
        hotel = hotels_by_id.get(hid)
        if hotel:
            results.append(hotel)
        if len(results) >= top_k:
            break
    return results if results else popular_recommend(hotels, top_k)


# =========================================================
# STRATEGY DISPATCHER WITH INTENT LAYERING
# =========================================================
STRATEGY_MAP = {
    'svd': svd_recommend,
    'user_cf': user_based_cf_recommend,
    'item_cf': item_based_cf_recommend,
    'content': content_recommend,
    'popular': popular_recommend,
}


def get_recommendations_for_user(
    user_id: str,
    interactions_file_ignored,
    hotel_vectors: list,
    top_k: int = 5,
    strategy: str = 'svd'
) -> list:
    """
    Multi-strategy recommendation with HARD SESSION ROUTING.
    
    When strong session intent detected (2+ high-intent interactions):
      → ONLY candidates from session destination allowed
      → Cross-city diversity is DISABLED
    
    When medium/weak intent:
      → Session destination ranked first, others follow
    
    When no intent:
      → Cross-destination diversity
    """
    try:
        hotels = hotel_vectors or get_all_hotels()
        if not hotels:
            return []

        print(f"\n🎯 [Recommend] User={user_id} | Strategy={strategy} | Top-K={top_k}")

        # =========================================================
        # STEP 1: Detect intent FIRST (before candidate generation)
        # =========================================================
        intent = detect_intent(user_id)
        session_dest = None
        intent_source = None
        dest_multiplier = 1.0

        if intent:
            session_dest = intent['destination']
            intent_source = intent['source']
            dest_multiplier = intent['multiplier']
            print(f"🎯 [Recommend] SESSION DEST: \"{session_dest}\" source={intent_source} multiplier={dest_multiplier}")

        # =========================================================
        # STEP 2: HARD SESSION ROUTING for strong intent
        # =========================================================
        if session_dest and intent_source == 'selected':
            # HARD FILTER: Only hotels from session destination
            session_hotels = [h for h in hotels
                              if (h.get('destination') or '').lower() == session_dest.lower()]
            
            print(f"🔒 [HARD ROUTING] Session=\"{session_dest}\" | "
                  f"Pool: {len(session_hotels)}/{len(hotels)} hotels")
            
            if len(session_hotels) >= top_k:
                # Enough session-destination hotels → use them exclusively
                strategy_fn = STRATEGY_MAP.get(strategy, svd_recommend)
                results = strategy_fn(user_id, session_hotels, top_k)
                if not results:
                    results = sorted(session_hotels, key=lambda h: h.get('reviewStar', 0), reverse=True)[:top_k]
                
                final_dests = [h.get('destination', '') for h in results[:top_k]]
                print(f"✅ [HARD ROUTING] {len(results)} results, all from \"{session_dest}\": {final_dests}")
                return results[:top_k]
            else:
                # Not enough from session dest → session dest first, then fill
                print(f"⚠️ [HARD ROUTING] Only {len(session_hotels)} from \"{session_dest}\", adding fillers")
                strategy_fn = STRATEGY_MAP.get(strategy, svd_recommend)
                all_results = strategy_fn(user_id, hotels, top_k * 3)
                if not all_results:
                    all_results = popular_recommend(hotels, top_k * 3)
                
                same_dest = [h for h in all_results
                             if (h.get('destination') or '').lower() == session_dest.lower()]
                others = [h for h in all_results
                          if (h.get('destination') or '').lower() != session_dest.lower()]
                results = same_dest + others
                final_dests = [h.get('destination', '') for h in results[:top_k]]
                print(f"🔀 [HARD ROUTING] {len(same_dest)} from \"{session_dest}\" + fillers: {final_dests}")
                return results[:top_k]

        # =========================================================
        # STEP 3: Medium intent → soft preference (boost, not filter)
        # =========================================================
        strategy_fn = STRATEGY_MAP.get(strategy, svd_recommend)
        results = strategy_fn(user_id, hotels, top_k * 3)
        if not results:
            results = popular_recommend(hotels, top_k * 3)

        if session_dest and intent_source in ('recency', 'longterm'):
            # Soft preference: session dest first, but allow others
            same_dest = [h for h in results
                         if (h.get('destination') or '').lower() == session_dest.lower()]
            others = [h for h in results
                      if (h.get('destination') or '').lower() != session_dest.lower()]
            results = (same_dest + others)[:top_k * 2]
            final_dests = [h.get('destination', '') for h in results[:top_k]]
            print(f"🔀 [Recommend] Soft preference: \"{session_dest}\": {final_dests}")
        else:
            # No session intent → cross-destination diversity
            diverse_results = diverse_recommend(hotels, top_k)
            seen_ids = set()
            merged = []
            for h in results + diverse_results:
                h_id = h.get('id')
                if h_id not in seen_ids:
                    seen_ids.add(h_id)
                    merged.append(h)
            results = merged[:top_k * 2]
            final_dests = [h.get('destination', '') for h in results[:top_k]]
            print(f"🔀 [Recommend] No session intent → diverse: {final_dests}")

        return results[:top_k]

    except Exception as e:
        print(f"❌ Recommendation error: {e}")
        import traceback
        traceback.print_exc()
        return random.sample(hotel_vectors or get_all_hotels(), min(top_k, len(hotel_vectors or [])))
