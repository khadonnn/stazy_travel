# src/recommend.py
# Multi-Strategy Recommendation Engine with Session-Aware Candidate Retrieval
# Architecture: detect_intent() → retrieve session-aware candidates → hybrid scoring → diversity reranking
# Strategies: svd (default), user_cf, item_cf, content, popular

import os
import pickle
import random
import json
import time
import hashlib
import numpy as np
from collections import Counter, defaultdict
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
                        'SELECT id, "userId", "hotelId", type, rating, timestamp '
                        'FROM interactions WHERE "userId" = :uid ORDER BY timestamp DESC'
                    ),
                    {"uid": user_id}
                )
            else:
                result = conn.execute(
                    sql_text(
                        'SELECT id, "userId", "hotelId", type, rating, timestamp '
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
                "id": str(row[0]),
                "userId": row[1],
                "hotelId": row[2],
                "type": row[3],
                "rating": float(row[4]) if row[4] else None,
                "timestamp": row[5].isoformat() if row[5] else "",
            })
        
        print(f"✅ [Recommend] Loaded {len(interactions)} realtime interactions from PostgreSQL")
        return interactions
        
    except Exception as e:
        print(f"⚠️ [Recommend] PostgreSQL query failed: {e}, falling back to JSON")
        return get_all_interactions()

# =========================================================
# SESSION-AWARE CACHE (key includes userId + normalized destination + interaction fingerprint hash + intent bucket)
# =========================================================
_recommendation_cache = {}  # key -> cache entry metadata + result
CACHE_TTL = 3 * 60  # 3 minutes (shorter to stay realtime)

def _parse_timestamp_epoch(timestamp_value) -> float:
    if not timestamp_value:
        return 0.0
    if isinstance(timestamp_value, (int, float)):
        return float(timestamp_value)
    try:
        timestamp_text = str(timestamp_value)[:19]
        return time.mktime(time.strptime(timestamp_text, "%Y-%m-%dT%H:%M:%S"))
    except Exception:
        return 0.0


def _get_recent_interactions(user_id: str, limit: int = 5) -> list:
    interactions = get_realtime_interactions(user_id)
    user_inters = [i for i in interactions if i.get('userId') == user_id]
    user_inters.sort(key=lambda x: _parse_timestamp_epoch(x.get('timestamp', 0)), reverse=True)
    return user_inters[:limit]


def _get_interaction_fingerprint_hash(user_id: str, limit: int = 5) -> str:
    recent = _get_recent_interactions(user_id, limit)
    # Use the LATEST interaction (any type) as the fingerprint.
    # Previously we preferred non-VIEW which caused VIEW clicks to never
    # change the fingerprint, resulting in stale cache hits.
    if not recent:
        return "empty"

    latest = recent[0]

    # Include interaction id for uniqueness and stronger invalidation
    iid = latest.get('id') or latest.get('interactionId') or ''
    hotel_id = latest.get('hotelId')
    itype = latest.get('type')
    ts = latest.get('timestamp')
    fingerprint_source = f"{iid}:{hotel_id}:{itype}:{ts}"
    return hashlib.sha1(str(fingerprint_source).encode('utf-8')).hexdigest()


def _get_latest_interaction_bucket(user_id: str) -> int:
    recent = _get_recent_interactions(user_id, 1)
    if not recent:
        return 0
    latest_epoch = _parse_timestamp_epoch(recent[0].get('timestamp'))
    return int(latest_epoch // 60) if latest_epoch > 0 else 0


def _get_intent_snapshot(intent: dict, latest_bucket: int) -> dict:
    if not intent:
        return {
            'destination': 'none',
            'confidence': 0.0,
            'source': 'none',
            'intent_bucket': latest_bucket,
        }
    return {
        'destination': normalize_dest(intent.get('destination', '')) or 'none',
        'confidence': float(intent.get('confidence', 0.0) or 0.0),
        'source': intent.get('source', 'none') or 'none',
        'intent_bucket': latest_bucket,
    }


def _cache_metadata_key(user_id: str, destination: str = None, fingerprint_hash: str = "", intent_bucket: int = 0) -> str:
    dest_part = normalize_dest(destination or '') or 'none'
    return f"{user_id}::{dest_part}::{fingerprint_hash}::{intent_bucket}"


def _find_latest_cache_entry_for_user(user_id: str):
    latest_entry = None
    latest_ts = -1.0
    latest_key = None
    for key, entry in _recommendation_cache.items():
        if entry.get('userId') != user_id:
            continue
        entry_ts = entry.get('timestamp', 0.0)
        if entry_ts > latest_ts:
            latest_entry = entry
            latest_key = key
            latest_ts = entry_ts
    return latest_key, latest_entry


def _get_cached(user_id: str, current_destination: str = None, current_fingerprint_hash: str = "", current_intent: dict = None, current_intent_bucket: int = 0):
    current_key = _cache_metadata_key(user_id, current_destination, current_fingerprint_hash, current_intent_bucket)
    entry = _recommendation_cache.get(current_key)
    if entry:
        cached_intent = entry.get('intentSnapshot', {})
        cached_confidence = float(cached_intent.get('confidence', 0.0) or 0.0)
        current_confidence = float((current_intent or {}).get('confidence', 0.0) or 0.0)
        if entry.get('normalizedDestination') != normalize_dest(current_destination or ''):
            print(
                f"[cache-check] userId={user_id} cachedKey={current_key} currentKey={current_key} cacheHit=false reason=STALE_DEST"
            )
            print(f"[cache-invalidation] trigger=DEST_CHANGED userId={user_id}")
            del _recommendation_cache[current_key]
            return None
        if entry.get('fingerprintHash') != current_fingerprint_hash:
            print(
                f"[cache-check] userId={user_id} cachedKey={current_key} currentKey={current_key} cacheHit=false reason=STALE_FP"
            )
            print(f"[cache-invalidation] trigger=INTERACTION_ADDED userId={user_id}")
            del _recommendation_cache[current_key]
            return None
        if abs(cached_confidence - current_confidence) > 0.1 or cached_intent.get('destination') != normalize_dest((current_intent or {}).get('destination', '')):
            print(
                f"[cache-check] userId={user_id} cachedKey={current_key} currentKey={current_key} cacheHit=false reason=STALE_INTENT"
            )
            print(f"[cache-invalidation] trigger=INTENT_SHIFT userId={user_id}")
            del _recommendation_cache[current_key]
            return None
        if time.time() - entry["timestamp"] > CACHE_TTL:
            del _recommendation_cache[current_key]
            print(
                f"[cache-check] userId={user_id} cachedKey={current_key} currentKey={current_key} cacheHit=false reason=VALID"
            )
            print(f"[cache-invalidation] trigger=INTERACTION_ADDED userId={user_id}")
            return None
        print(f"[cache-check] userId={user_id} cachedKey={current_key} currentKey={current_key} cacheHit=true reason=VALID")
        print(f"[cache] HIT for userId={user_id}, dest={current_destination or 'none'}")
        return entry["result"]

    previous_key, previous_entry = _find_latest_cache_entry_for_user(user_id)
    cached_reason = "VALID"
    cached_key_text = previous_key or "none"
    if previous_entry:
        cached_dest = previous_entry.get('normalizedDestination', 'none')
        current_dest = normalize_dest(current_destination or '') or 'none'
        cached_fp = previous_entry.get('fingerprintHash', 'none')
        cached_intent = previous_entry.get('intentSnapshot', {})
        current_confidence = float((current_intent or {}).get('confidence', 0.0) or 0.0)
        cached_confidence = float(cached_intent.get('confidence', 0.0) or 0.0)
        if cached_dest != current_dest:
            cached_reason = "STALE_DEST"
        elif cached_fp != current_fingerprint_hash:
            cached_reason = "STALE_FP"
        elif abs(cached_confidence - current_confidence) > 0.1 or cached_intent.get('destination', 'none') != current_dest:
            cached_reason = "STALE_INTENT"
        else:
            cached_reason = "VALID"
    print(
        f"[cache-check] userId={user_id} cachedKey={cached_key_text} currentKey={current_key} cacheHit=false reason={cached_reason}"
    )
    if cached_reason != "VALID":
        print(f"[cache-invalidation] trigger={ 'DEST_CHANGED' if cached_reason == 'STALE_DEST' else 'INTERACTION_ADDED' if cached_reason == 'STALE_FP' else 'INTENT_SHIFT' } userId={user_id}")
    return None


def _set_cached(user_id: str, destination: str = None, fingerprint_hash: str = "", intent_bucket: int = 0, intent_snapshot: dict = None, result=None):
    # Do NOT cache empty results
    try:
        if not result:
            print(f"[cache] SKIP caching empty result for user={user_id} dest={destination}")
            return
        if isinstance(result, list) and len(result) == 0:
            print(f"[cache] SKIP caching empty list result for user={user_id} dest={destination}")
            return
    except Exception:
        pass
    key = _cache_metadata_key(user_id, destination, fingerprint_hash, intent_bucket)
    _recommendation_cache[key] = {
        "userId": user_id,
        "normalizedDestination": normalize_dest(destination or '') or 'none',
        "result": result,
        "timestamp": time.time(),
        "fingerprintHash": fingerprint_hash,
        "intentBucket": intent_bucket,
        "intentSnapshot": intent_snapshot or {
            'destination': normalize_dest(destination or '') or 'none',
            'confidence': 0.0,
            'source': 'none',
            'intent_bucket': intent_bucket,
        },
    }

# Hybrid weights
CONTENT_WEIGHT = 0.40
COLLABORATIVE_WEIGHT = 0.30
SENTIMENT_WEIGHT = 0.20
POPULARITY_WEIGHT = 0.10

# Legacy SVD+Content hybrid
SVD_WEIGHT = 0.6
CONTENT_WEIGHT_SVD = 0.4

# Content feature weights (session dest is strongest)
SESSION_DEST_WEIGHT = 0.40     # SESSION destination (strongest signal, 40%)
PRICE_WEIGHT = 0.10
LOCATION_WEIGHT = 0.08
DESTINATION_WEIGHT = 0.10      # Historical destination (weaker)
AMENITY_WEIGHT = 0.15
CATEGORY_WEIGHT = 0.12
REVIEW_WEIGHT = 0.15           # Review star quality

# Intent priority weights
SELECTED_HOTEL_WEIGHT = 1.0    # Primary: explicit selection
RECENCY_WEIGHT_1_3 = 0.8      # Last 1-3 interactions
RECENCY_WEIGHT_4_6 = 0.5      # Interactions 4-6
RECENCY_WEIGHT_7_10 = 0.3     # Interactions 7-10

# Session intent
SELECTED_HOTEL_WINDOW = 5      # Last N high-intent interactions
RECENCY_WINDOW = 15            # Last N interactions for weighted recency
SESSION_DECAY_MINUTES = 120    # Session expires after 2 hours
SESSION_DEST_THRESHOLD = 0.45  # Raised from 0.30 — prevents weak signals from dominating
MIN_HIGH_INTENT = 3            # Minimum high-intent interactions to trigger priority 1

# Confidence-based destination multipliers (prevent recommendation collapse)
MULTIPLIER_STRONG = 1.6
MULTIPLIER_MEDIUM = 1.4
MULTIPLIER_WEAK = 1.2

# High-intent interaction types (explicit selection)
HIGH_INTENT_TYPES = {"CLICK_BOOK_NOW", "ADD_TO_WISHLIST", "BOOK"}

# Interaction type weights
# VIEW increased from 0.2 to 0.5 — user clicking on a hotel page IS a signal
INTERACTION_WEIGHTS = {
    "VIEW": 0.5,
    "CLICK_BOOK_NOW": 2.0,
    "ADD_TO_WISHLIST": 3.0,
    "RATE_POSITIVE": 4.5,
    "BOOK": 5.0,
    "RATE_NEGATIVE": -3.0,
}

# Candidate retrieval limits
DESTINATION_CANDIDATE_LIMIT = 40   # Hotels from session destination
GLOBAL_CANDIDATE_LIMIT = 40        # Global filler hotels for diversity
DIVERSITY_POOL_SIZE = 50           # Top N scored candidates for diversity reranking

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
# INTENT DETECTION: Time-Decay + Priority Cascade
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


def _get_latest_interaction_ts(user_id: str) -> str:
    """Get the timestamp of the user's latest interaction (for fingerprinting)."""
    interactions = get_realtime_interactions(user_id)
    user_inters = [i for i in interactions if i['userId'] == user_id]
    if not user_inters:
        return "0"
    sorted_inters = sorted(user_inters, key=lambda x: x.get('timestamp', ''), reverse=True)
    return sorted_inters[0].get('timestamp', '0')


def detect_intent(user_id: str) -> dict:
    """
    Detect intent with priority cascade.
    
    Priority 1: High-intent interactions (CLICK_BOOK_NOW, WISHLIST, BOOK)
    Priority 2: Weighted recency (all interaction types, time-decayed)
    Priority 3: Long-term profile (weakest)
    
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
                print(f"[intent] ⏰ Session expired: {minutes_since:.0f}min since last interaction")
                return None
        except:
            pass
    
    # =========================================================
    # PRIORITY 0a: SINGLE-CLICK EXPLORATION DETECTION
    # If the latest interaction points to a destination different from
    # the majority of recent history, the user is actively exploring
    # a NEW destination. This catches single-click destination switches.
    # =========================================================
    latest = user_inters_sorted[0]
    latest_hotel = hotels.get(latest.get('hotelId'))
    if latest_hotel:
        latest_dest = latest_hotel.get('destination', '')
        if latest_dest:
            older = user_inters_sorted[1:10]
            if len(older) >= 2:
                older_dest_counts = defaultdict(int)
                for inter in older:
                    h = hotels.get(inter.get('hotelId'))
                    if h:
                        d = h.get('destination', '')
                        if d:
                            older_dest_counts[d] += 1
                if older_dest_counts:
                    sorted_older = sorted(older_dest_counts.items(), key=lambda x: -x[1])
                    old_dest, old_count = sorted_older[0]
                    latest_norm = normalize_dest(latest_dest)
                    old_norm = normalize_dest(old_dest)
                    if latest_norm != old_norm and old_count / len(older) >= 0.4:
                        latest_epoch = _parse_timestamp_epoch(latest.get('timestamp'))
                        mins_ago = (now_ts - latest_epoch) / 60 if latest_epoch > 0 else 999
                        if mins_ago < 10:
                            print(
                                f"[intent] 🔍 EXPLORATION: \"{latest_dest}\" "
                                f"(latest click is NEW dest vs old majority=\"{old_dest}\" "
                                f"{old_count}/{len(older)}). confidence=0.70"
                            )
                            return {
                                'destination': latest_dest,
                                'confidence': 0.7,
                                'source': 'exploration',
                                'multiplier': MULTIPLIER_MEDIUM,
                            }

    # =========================================================
    # PRIORITY 0b: RECENT SHIFT DETECTION
    # If 2+ of last 3 interactions point to same destination
    # (any type), the user is actively exploring NOW.
    # This catches the case where user clicks 3 hotels at a new destination.
    # =========================================================
    last3 = user_inters_sorted[:3]
    if len(last3) >= 2:
        recent_dest_counts = defaultdict(int)
        for inter in last3:
            h = hotels.get(inter.get('hotelId'))
            if h:
                d = h.get('destination', '')
                if d:
                    recent_dest_counts[d] += 1
        if recent_dest_counts:
            sorted_recent = sorted(recent_dest_counts.items(), key=lambda x: -x[1])
            recent_dest, recent_count = sorted_recent[0]
            if recent_count >= 2:
                ratio = recent_count / len(last3)
                print(
                    f"[intent] ⚡ RECENT SHIFT: \"{recent_dest}\" "
                    f"({recent_count}/{len(last3)} = {ratio:.0%} of last 3) "
                    f"confidence={ratio * 0.95:.2f}"
                )
                return {
                    'destination': recent_dest,
                    'confidence': ratio * 0.95,
                    'source': 'recent-shift',
                    'multiplier': MULTIPLIER_STRONG,
                }

    # =========================================================
    # PRIORITY 1: High-intent interactions (highest priority, time-decayed)
    # =========================================================
    high_intent = [i for i in user_inters_sorted if i.get('type') in HIGH_INTENT_TYPES]
    selected_hotels = high_intent[:SELECTED_HOTEL_WINDOW]
    
    if len(selected_hotels) >= MIN_HIGH_INTENT:
        dest_scores = defaultdict(float)
        for inter in selected_hotels:
            hotel = hotels.get(inter['hotelId'])
            if hotel:
                raw_dest = hotel.get('destination', '')
                if raw_dest:
                    dn = normalize_dest(raw_dest)
                    tdw = _time_decay_weight(inter.get('timestamp', ''), now_ts)
                    dest_scores[dn] += tdw
        
        if dest_scores:
            top_dest = max(dest_scores, key=dest_scores.get)
            total_score = sum(dest_scores.values())
            ratio = dest_scores[top_dest] / total_score
            
            if ratio >= 0.5:
                multiplier = MULTIPLIER_STRONG
                print(
                    f"[intent] 🎯 HIGH-INTENT: \"{top_dest}\" "
                    f"(score={dest_scores[top_dest]:.2f}/{total_score:.2f} = {ratio:.0%}) "
                    f"source=selected confidence={ratio * 0.9:.2f} multiplier={multiplier:.2f}x"
                )
                return {
                    'destination': top_dest,
                    'confidence': ratio * 0.9,
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
        raw_dest = hotel.get('destination', '')
        if not raw_dest:
            continue
        dest = normalize_dest(raw_dest)
        recency_weight = get_recency_weight(i)
        tdw = _time_decay_weight(inter.get('timestamp', ''), now_ts)
        type_weight = INTERACTION_WEIGHTS.get(inter.get('type', ''), 1.0)
        combined_weight = max(0, type_weight) * recency_weight * tdw
        weighted_scores[dest] += combined_weight
        total_weight += combined_weight
    
    if weighted_scores and total_weight > 0:
        top_dest = max(weighted_scores, key=weighted_scores.get)
        ratio = weighted_scores[top_dest] / total_weight
        
        if ratio >= SESSION_DEST_THRESHOLD:
            multiplier = MULTIPLIER_MEDIUM
            print(
                f"[intent] 📍 WEIGHTED RECENCY: \"{top_dest}\" "
                f"(weighted ratio={ratio:.0%}) confidence={ratio:.2f} "
                f"multiplier={multiplier:.2f}x"
            )
            return {
                'destination': top_dest,
                'confidence': ratio,
                'source': 'recency',
                'multiplier': multiplier
            }
        
        # Log distribution for debugging
        sorted_dists = sorted(weighted_scores.items(), key=lambda x: -x[1])[:5]
        dist_str = ", ".join(f"{d}={s:.2f}" for d, s in sorted_dists)
        print(f"[intent] No dominant destination. Distribution: {dist_str} (total={total_weight:.2f})")
    
    # =========================================================
    # PRIORITY 3: Long-term Profile (lowest priority)
    # =========================================================
    all_dest_counts = defaultdict(int)
    for inter in user_inters:
        hotel = hotels.get(inter['hotelId'])
        if hotel:
            raw_dest = hotel.get('destination', '')
            if raw_dest:
                d = normalize_dest(raw_dest)
                all_dest_counts[d] += 1
    
    if all_dest_counts:
        top_dest = max(all_dest_counts, key=all_dest_counts.get)
        ratio = all_dest_counts[top_dest] / len(user_inters)
        
        if ratio >= SESSION_DEST_THRESHOLD * 2:  # Higher threshold for long-term
            multiplier = MULTIPLIER_WEAK
            print(
                f"[intent] 📊 LONG-TERM: \"{top_dest}\" ({ratio:.0%}) "
                f"confidence={ratio * 0.3:.2f} multiplier={multiplier:.2f}x"
            )
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

    for inter in user_inters:
        hotel = hotels.get(inter['hotelId'])
        if not hotel:
            continue
        w = INTERACTION_WEIGHTS.get(inter.get('type', ''), 1.0)
        w = max(0, w)

        dest = hotel.get('destination', '')
        if dest:
            destination_counts[normalize_dest(dest)] += w

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


# =========================================================
# SESSION-AWARE CANDIDATE RETRIEVAL
# When intent exists: fetch destination hotels FIRST + global fillers
# When no intent: fetch top-rated globally
# =========================================================
def normalize_dest(dest: str) -> str:
    """Normalize Vietnamese destination for comparison (handles diacritics)."""
    import unicodedata
    d = (dest or "").lower()
    d = unicodedata.normalize("NFD", d)
    d = "".join(c for c in d if unicodedata.category(c) != "Mn")
    d = d.replace("đ", "d")
    d = " ".join(d.split())
    return d.strip()

def _destination_boost_multiplier(hotel_destination: str, session_destination: str, default_multiplier: float) -> float:
    if not session_destination:
        return 1.0
    if normalize_dest(hotel_destination or '') == normalize_dest(session_destination):
        return default_multiplier
    return 1.0


def retrieve_session_aware_candidates(session_destination: str = None) -> list:
    """
    Retrieve candidates based on session intent.
    
    When session destination exists:
      1. Fetch hotels from detected destination (priority)
      2. Fetch global filler hotels (for diversity)
      3. Merge + dedupe (destination first = higher priority)
    
    When no session intent:
      Fetch top-rated hotels globally
    """
    all_hotels = get_all_hotels()
    if not all_hotels:
        return []
    
    # Only consider APPROVED hotels (if status field exists)
    approved = [h for h in all_hotels if h.get('status', 'APPROVED') == 'APPROVED']
    if not approved:
        approved = all_hotels  # Fallback if no status field in JSON
    
    if session_destination:
        session_norm = normalize_dest(session_destination)
        
        # Destination-specific candidates (highest priority) — uses normalize_dest for matching
        dest_hotels = [
            h for h in approved
            if normalize_dest(h.get('destination', '')) == session_norm
        ]
        
        # Sort destination hotels by review quality
        dest_hotels.sort(
            key=lambda h: (h.get('reviewStar', 0) * h.get('reviewCount', 0)),
            reverse=True
        )
        dest_hotels = dest_hotels[:DESTINATION_CANDIDATE_LIMIT]
        
        # Global filler candidates (for diversity)
        dest_ids = {h.get('id') for h in dest_hotels}
        global_hotels = [
            h for h in approved
            if h.get('id') not in dest_ids
        ]
        global_hotels.sort(
            key=lambda h: (h.get('reviewStar', 0) * h.get('reviewCount', 0)),
            reverse=True
        )
        global_hotels = global_hotels[:GLOBAL_CANDIDATE_LIMIT]
        
        print(
            f"[candidates] Session dest=\"{session_destination}\": "
            f"{len(dest_hotels)} from destination + {len(global_hotels)} global fillers"
        )
        
        # Merge: destination first (higher priority), then global fillers
        seen_ids = set()
        merged = []
        for h in dest_hotels + global_hotels:
            hid = h.get('id')
            if hid not in seen_ids:
                seen_ids.add(hid)
                merged.append(h)
        
        return merged
    
    # No session destination → fetch top-rated globally
    global_hotels = sorted(
        approved,
        key=lambda h: (h.get('reviewStar', 0) * h.get('reviewCount', 0)),
        reverse=True
    )[:DESTINATION_CANDIDATE_LIMIT + GLOBAL_CANDIDATE_LIMIT]
    
    print(f"[candidates] No intent: loaded {len(global_hotels)} top-rated hotels globally")
    return global_hotels


# =========================================================
# HYBRID SCORING WITH SESSION INTENT
# =========================================================
def compute_content_score(
    user_profile: dict,
    hotel: dict,
    session_destination: str = None,
    dest_multiplier: float = 1.0,
) -> float:
    """
    Content-based similarity with session-aware scoring:
    - SESSION destination gets STRONGEST boost (40%)
    - Review quality contributes
    - Historical preferences contribute
    """
    if not user_profile:
        return 0.5

    scores = []
    hotel_dest = hotel.get('destination', '')
    hotel_dest_norm = normalize_dest(hotel_dest) if hotel_dest else ''

    # SESSION DESTINATION BOOST (strongest signal - 40% weight)
    if session_destination:
        if hotel_dest_norm and hotel_dest_norm == normalize_dest(session_destination):
            scores.append(1.0 * SESSION_DEST_WEIGHT)
        else:
            scores.append(0.05 * SESSION_DEST_WEIGHT)  # Small residual for non-matching
    else:
        # No session intent → use historical destination
        dest_pref = user_profile.get('preferred_destinations', {})
        if hotel_dest and dest_pref:
            max_dest_count = max(dest_pref.values()) if dest_pref else 1
            dest_score = dest_pref.get(hotel_dest_norm, 0) / max_dest_count
            scores.append(dest_score * DESTINATION_WEIGHT)
        else:
            scores.append(0.1 * DESTINATION_WEIGHT)

    # Review quality (15% weight)
    review_star = float(hotel.get('reviewStar', 0))
    review_score = min(1.0, review_star / 5.0)
    scores.append(review_score * REVIEW_WEIGHT)

    # Price match (10% weight)
    avg_price = user_profile['avg_price']
    hotel_price = hotel.get('price', avg_price)
    if avg_price > 0 and hotel_price:
        price_ratio = min(avg_price, hotel_price) / max(avg_price, hotel_price)
        scores.append(price_ratio * PRICE_WEIGHT)
    else:
        scores.append(0.5 * PRICE_WEIGHT)

    # Location match (8% weight)
    hotel_address = hotel.get('address', '')
    hotel_location = hotel_address.split(' Đường ')[-1].split(',')[0] if ' Đường ' in hotel_address else ''
    loc_pref = user_profile['preferred_locations']
    if hotel_location and loc_pref:
        max_loc_count = max(loc_pref.values()) if loc_pref else 1
        loc_score = loc_pref.get(hotel_location, 0) / max_loc_count
        scores.append(loc_score * LOCATION_WEIGHT)
    else:
        scores.append(0.3 * LOCATION_WEIGHT)

    # Amenity overlap (15% weight)
    hotel_amenities = set(hotel.get('amenities', []))
    user_amenities = user_profile['preferred_amenities']
    if hotel_amenities and user_amenities:
        max_amenity_count = max(user_amenities.values()) if user_amenities else 1
        amenity_score = sum(user_amenities.get(a, 0) for a in hotel_amenities) / (len(hotel_amenities) * max_amenity_count)
        scores.append(min(1.0, amenity_score) * AMENITY_WEIGHT)
    else:
        scores.append(0.3 * AMENITY_WEIGHT)

    # Category match (12% weight)
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
# SESSION-AWARE DIVERSITY RERANKING
# Operates on LARGE candidate set (top 50 scored), then slices top_k
# =========================================================
def diversity_rerank(scored_hotels: list, top_k: int = 5, session_destination: str = None) -> list:
    """
    Session-aware diversity reranking:
    - Groups scored candidates by destination
    - Round-robin ensures destination variety
    - Session destination gets priority (at least 1 slot guaranteed)
    - Operates on top 50 scored candidates, then slices top_k
    
    scored_hotels: list of (hotel_dict, score) tuples, already sorted by score desc
    """
    if len(scored_hotels) <= top_k:
        return [h for h, s in scored_hotels]
    
    # Log top 10 before diversity
    before_str = ", ".join(
        f"{h.get('destination', '?')}({s:.2f})"
        for h, s in scored_hotels[:10]
    )
    print(f"[ranking-before] Top 10 scored: {before_str}")
    
    # Group by destination (normalized)
    by_dest = defaultdict(list)
    for h, s in scored_hotels:
        raw_dest = h.get('destination') or ''
        dest = normalize_dest(raw_dest) or 'unknown'
        by_dest[dest].append((h, s))
    
    # Log candidate distribution
    dest_dist = sorted(by_dest.items(), key=lambda x: -len(x[1]))
    dist_str = ", ".join(f"{d}={len(hotels)}" for d, hotels in dest_dist)
    print(f"[candidates] Destination distribution: {dist_str}")
    
    # Sort destinations: session destination first, then by best score
    session_dest_norm = normalize_dest(session_destination) if session_destination else None
    
    dest_keys = sorted(
        by_dest.keys(),
        key=lambda d: (
            0 if d == session_dest_norm else 1,  # Session dest first
            -by_dest[d][0][1]  # Then by best score
        )
    )
    
    # Round-robin: take 1 from each destination until top_k
    result = []
    dest_ptrs = {d: 0 for d in dest_keys}
    
    # First pass: reserve up to ceil(top_k/2) slots for session destination
    # to ensure intent is strongly reflected in results.
    # For top_k=4: reserve up to 2 slots. For top_k=5: reserve up to 3.
    if session_dest_norm and session_dest_norm in by_dest:
        dest_hotels = by_dest[session_dest_norm]
        reserve = min(max(1, (top_k + 1) // 2), len(dest_hotels), top_k)
        for i in range(reserve):
            result.append(dest_hotels[i][0])
        dest_ptrs[session_dest_norm] = reserve
        print(f"[diversity] Reserved {reserve} slots for session dest \"{session_dest_norm}\"")
    
    # Round-robin fill with remaining destinations
    while len(result) < top_k:
        added = False
        for dest in dest_keys:
            if len(result) >= top_k:
                break
            ptr = dest_ptrs.get(dest, 0)
            dest_hotels = by_dest.get(dest, [])
            if ptr < len(dest_hotels):
                result.append(dest_hotels[ptr][0])
                dest_ptrs[dest] = ptr + 1
                added = True
        if not added:
            break
    
    # Log result
    after_str = ", ".join(h.get('destination', '?') for h in result)
    print(f"[ranking-after] Top {top_k} diversified: {after_str}")
    
    return result


# =========================================================
# STRATEGY 1: SVD (Hybrid SVD + Content)
# =========================================================
def svd_recommend(user_id: str, hotels: list, top_k: int = 5,
                  session_dest: str = None, dest_multiplier: float = 1.0) -> list:
    if not algo:
        print("⚠️ [SVD] No model loaded, falling back to popular")
        return popular_recommend(hotels, top_k)

    try:
        algo.trainset.to_inner_uid(user_id)
    except ValueError:
        print(f"👶 [SVD] User {user_id} not in model, falling back to content")
        return content_recommend(user_id, hotels, top_k, session_dest, dest_multiplier)

    print(f"🤖 [SVD] User {user_id} → Hybrid SVD + Content scoring.")
    user_profile = build_user_profile(user_id)

    if session_dest:
        print(f"🎯 [SVD] Session destination: \"{session_dest}\" multiplier={dest_multiplier:.2f}x")

    predictions = []
    for hotel in hotels:
        svd_pred = algo.predict(user_id, hotel.get("id"))
        svd_score = svd_pred.est

        content_score = compute_content_score(user_profile, hotel, session_dest, dest_multiplier)
        svd_normalized = (svd_score - 1) / 4

        hybrid_before_boost = SVD_WEIGHT * svd_normalized + CONTENT_WEIGHT_SVD * content_score
        destination_boost = _destination_boost_multiplier(hotel.get('destination', ''), session_dest, dest_multiplier)
        hybrid_score = hybrid_before_boost * destination_boost

        # Detailed logs for verification
        try:
            hid = hotel.get('id')
            print(f"[SCORE] hotel={hid} dest=\"{hotel.get('destination', '?')}\" svd={svd_normalized:.3f} content={content_score:.3f} hybrid={hybrid_before_boost:.3f} boost={destination_boost:.2f} final={hybrid_score:.3f}")
            print(f"[SVD] hotel={hid} score={svd_normalized:.3f}")
            print(f"[CONTENT] hotel={hid} score={content_score:.3f}")
            print(f"[HYBRID] hotel={hid} final={hybrid_score:.3f}")
        except Exception:
            pass

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
def user_based_cf_recommend(user_id: str, hotels: list, top_k: int = 5,
                            session_dest: str = None, dest_multiplier: float = 1.0) -> list:
    uim = _build_user_item_matrix()
    usim = _get_user_similarity()
    if uim is None or usim is None:
        return popular_recommend(hotels, top_k)

    user_idx_map = uim['user_idx']
    hotel_list = uim['hotel_list']
    matrix = uim['matrix']

    if user_id not in user_idx_map:
        return content_recommend(user_id, hotels, top_k, session_dest, dest_multiplier)

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


def item_based_cf_recommend(user_id: str, hotels: list, top_k: int = 5,
                            session_dest: str = None, dest_multiplier: float = 1.0) -> list:
    uim = _build_user_item_matrix()
    isim = _get_item_similarity()
    if uim is None or isim is None:
        return popular_recommend(hotels, top_k)

    user_idx_map = uim['user_idx']
    hotel_list = uim['hotel_list']
    matrix = uim['matrix']

    if user_id not in user_idx_map:
        return content_recommend(user_id, hotels, top_k, session_dest, dest_multiplier)

    uid_idx = user_idx_map[user_id]
    user_ratings = matrix[uid_idx]
    rated_indices = np.where(user_ratings > 0)[0]
    if len(rated_indices) == 0:
        return content_recommend(user_id, hotels, top_k, session_dest, dest_multiplier)

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


def content_recommend(user_id: str, hotels: list, top_k: int = 5,
                      session_dest: str = None, dest_multiplier: float = 1.0) -> list:
    print(f"👶 [Content] User {user_id} → Content-based.")
    
    user_profile = build_user_profile(user_id)
    if not user_profile:
        return popular_recommend(hotels, top_k)
    
    # Score each hotel with content-based scoring
    scored = []
    for hotel in hotels:
        score = compute_content_score(user_profile, hotel, session_dest, dest_multiplier)
        # Apply session destination multiplicative boost (normalized)
        if session_dest and normalize_dest(hotel.get('destination', '')) == normalize_dest(session_dest):
            score = min(1.0, score * dest_multiplier)
        scored.append((hotel, score))
    
    scored.sort(key=lambda x: x[1], reverse=True)
    
    # Use diversity reranking on top pool
    pool = scored[:DIVERSITY_POOL_SIZE]
    return diversity_rerank(pool, top_k, session_dest)


def popular_recommend(hotels: list, top_k: int = 5,
                      session_dest: str = None, dest_multiplier: float = 1.0) -> list:
    print("🎲 [Popular] Fallback → Top-rated hotels.")
    sorted_hotels = sorted(hotels, key=lambda h: (h.get('reviewStar', 0) * h.get('reviewCount', 0)), reverse=True)
    
    if session_dest:
        dest_norm = normalize_dest(session_dest)
        dest_hotels = [h for h in sorted_hotels if normalize_dest(h.get('destination', '')) == dest_norm]
        other_hotels = [h for h in sorted_hotels if h not in dest_hotels]
        combined = dest_hotels + other_hotels
        return combined[:top_k]
    
    return sorted_hotels[:top_k]


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
# STRATEGY DISPATCHER WITH SESSION-AWARE PIPELINE
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
    strategy: str = 'svd',
    external_destination: str = None,
    external_confidence: float = None,
) -> list:
    """
    Session-aware recommendation pipeline:
    
    1. detect_intent() → identify session destination
       (with external override from client if provided)
    2. retrieve_session_aware_candidates() → fetch destination + global hotels
    3. hybrid scoring (SVD 60% + content 40%) with session boost
    4. diversity_rerank() on top 50 scored → slice top_k
    5. return final recommendations
    
    Cache key includes userId + destination + interaction fingerprint.
    """
    try:
        print(f"\n🎯 [Recommend] User={user_id} | Strategy={strategy} | Top-K={top_k}")

        # =========================================================
        # STEP 1: Detect intent FIRST (before candidate generation)
        # =========================================================
        intent = detect_intent(user_id)
        session_dest = None
        intent_source = None
        dest_multiplier = 1.0

        # Priority: external_destination from client overrides local detect_intent
        # when detect_intent fails or returns a weaker signal
        if external_destination:
            if intent:
                intent_norm = normalize_dest(intent['destination'])
                ext_norm = normalize_dest(external_destination)
                if intent_norm == ext_norm:
                    # Both agree — use the stronger multiplier
                    session_dest = intent['destination']
                    intent_source = intent['source']
                    dest_multiplier = intent['multiplier']
                    print(
                        f"[intent] Agreed: client + local both point to \"{session_dest}\" "
                        f"source={intent_source} multiplier={dest_multiplier:.2f}x"
                    )
                else:
                    # Client says different destination — trust client (user is actively clicking there)
                    session_dest = external_destination
                    intent_source = 'client-override'
                    dest_multiplier = MULTIPLIER_STRONG
                    print(
                        f"[intent] ⚠️ Client override: \"{external_destination}\" "
                        f"(local detected \"{intent['destination']}\"). "
                        f"Using client destination. multiplier={dest_multiplier:.2f}x"
                    )
            else:
                # No local intent detected — use client's hint
                session_dest = external_destination
                intent_source = 'client-hint'
                dest_multiplier = MULTIPLIER_MEDIUM
                print(
                    f"[intent] Client hint: \"{external_destination}\" "
                    f"(no local intent). multiplier={dest_multiplier:.2f}x"
                )
        elif intent:
            session_dest = intent['destination']
            intent_source = intent['source']
            dest_multiplier = intent['multiplier']
            print(
                f"[intent] Session={session_dest} source={intent_source} "
                f"confidence={intent['confidence']:.2f} multiplier={dest_multiplier:.2f}x"
            )

        # Get full cache state for user
        fingerprint_hash = _get_interaction_fingerprint_hash(user_id)
        intent_bucket = _get_latest_interaction_bucket(user_id)
        current_intent_snapshot = _get_intent_snapshot(intent, intent_bucket)

        # Check cache using the full user state snapshot
        cached = _get_cached(
            user_id,
            session_dest,
            fingerprint_hash,
            current_intent_snapshot,
            intent_bucket,
        )
        if cached is not None:
            print(f"[recommend] === RETURNING CACHED RESULT ===")
            return cached

        # =========================================================
        # STEP 2: Retrieve session-aware candidates
        # Intent MUST influence candidate retrieval FIRST
        # =========================================================
        candidates = retrieve_session_aware_candidates(session_dest)
        
        if not candidates:
            print("[recommend] No candidates found")
            return []

        if session_dest:
            session_norm = normalize_dest(session_dest)
            candidate_counts = Counter(normalize_dest(h.get('destination', '')) or 'unknown' for h in candidates)
            session_count = candidate_counts.get(session_norm, 0)
            filler_count = len(candidates) - session_count
            top_candidates = ", ".join(
                f"{dest}={count}"
                for dest, count in candidate_counts.most_common(5)
            )
            print(
                f'[candidates] BEFORE scoring session="{session_dest}" session_count={session_count} '
                f'global_fillers={filler_count} top={top_candidates}'
            )
        
        print(f"[recommend] Total candidates: {len(candidates)}")

        # =========================================================
        # STEP 3: Generate scored candidates using strategy
        # =========================================================
        strategy_fn = STRATEGY_MAP.get(strategy, svd_recommend)
        
        if strategy in ('svd', 'user_cf', 'item_cf', 'content', 'popular'):
            # For SVD: score ALL candidates with hybrid, then diversity rerank
            if strategy == 'svd' and algo:
                # Score all candidates
                user_profile = build_user_profile(user_id)
                scored = []
                
                for hotel in candidates:
                    svd_pred = algo.predict(user_id, hotel.get("id"))
                    svd_score = svd_pred.est
                    content_score = compute_content_score(user_profile, hotel, session_dest, dest_multiplier)
                    svd_normalized = (svd_score - 1) / 4
                    hybrid_before_boost = SVD_WEIGHT * svd_normalized + CONTENT_WEIGHT_SVD * content_score
                    destination_boost = _destination_boost_multiplier(hotel.get('destination', ''), session_dest, dest_multiplier)
                    hybrid_score = hybrid_before_boost * destination_boost
                    # Logs for verification
                    try:
                        hid = hotel.get('id')
                        print(f"[SCORE] hotel={hid} dest=\"{hotel.get('destination', '?')}\" svd={svd_normalized:.3f} content={content_score:.3f} hybrid={hybrid_before_boost:.3f} boost={destination_boost:.2f} final={hybrid_score:.3f}")
                        print(f"[SVD] hotel={hid} score={svd_normalized:.3f}")
                        print(f"[CONTENT] hotel={hid} score={content_score:.3f}")
                        print(f"[HYBRID] hotel={hid} final={hybrid_score:.3f}")
                    except Exception:
                        pass
                    
                    scored.append((hotel, hybrid_score))
                
                scored.sort(key=lambda x: x[1], reverse=True)
                
                # Log top scores
                for i, (h, s) in enumerate(scored[:3]):
                    print(f"   #{i+1}: {h.get('title', 'N/A')[:30]} | Score={s:.3f} | Dest={h.get('destination', '?')}")
                
                # =========================================================
                # STEP 4: Diversity rerank on top 50, then slice top_k
                # =========================================================
                pool = scored[:DIVERSITY_POOL_SIZE]
                results = diversity_rerank(pool, top_k, session_dest)
            else:
                # For other strategies: use the strategy function directly
                results = strategy_fn(user_id, candidates, top_k, session_dest, dest_multiplier)
        else:
            results = popular_recommend(candidates, top_k, session_dest, dest_multiplier)

        # Cache the result
        _set_cached(user_id, session_dest, fingerprint_hash, intent_bucket, current_intent_snapshot, results)
        
        # Log final result
        final_dests = [h.get('destination', '?') for h in results]
        print(
            f"[recommend] === DONE: {len(results)} hotels returned, "
            f"destinations={final_dests} ==="
        )

        return results

    except Exception as e:
        print(f"❌ Recommendation error: {e}")
        import traceback
        traceback.print_exc()
        all_h = hotel_vectors or get_all_hotels()
        return random.sample(all_h, min(top_k, len(all_h)))