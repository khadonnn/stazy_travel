# src/recommend.py
# Multi-Strategy Recommendation Engine
# Strategies: svd (default), user_cf, item_cf, content, popular
# Usage: Called by main.py endpoint /recommend/{user_id}?strategy=svd

import os
import pickle
import random
import json
import numpy as np
from collections import defaultdict
from sklearn.metrics.pairwise import cosine_similarity
from src.db_utils import get_user_interested_categories

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
MODEL_PATH = "jsons/recsys_model.pkl"
HOTELS_FILE = "jsons/__homeStay.json"
INTERACTIONS_FILE = "jsons/__interactions.json"

# Hybrid weights
SVD_WEIGHT = 0.6
CONTENT_WEIGHT = 0.4

# Content feature weights
PRICE_WEIGHT = 0.3
LOCATION_WEIGHT = 0.3
AMENITY_WEIGHT = 0.2
CATEGORY_WEIGHT = 0.2

# User-CF parameters
USER_CF_K = 10  # Number of similar users

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

# Load hotels data
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

# Load interactions
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

# Precomputed user-item matrix (lazy init)
_user_item_matrix = None
_user_similarity_df = None
_item_similarity_df = None

def _build_user_item_matrix():
    """Build user-item interaction matrix from interactions data."""
    global _user_item_matrix
    if _user_item_matrix is not None:
        return _user_item_matrix

    interactions = get_all_interactions()
    if not interactions:
        return None

    signal_weights = {
        "CLICK_BOOK_NOW": 2.0,
        "ADD_TO_WISHLIST": 3.0,
        "BOOK": 5.0
    }

    # Aggregate: (userId, hotelId) -> weighted score
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

    # Also include explicit ratings from reviews
    reviews_file = INTERACTIONS_FILE.replace("__interactions.json", "__reviews.json")
    try:
        with open(reviews_file, "r", encoding="utf-8") as f:
            reviews = json.load(f)
        for rev in reviews:
            uid = rev.get('userId')
            hid = rev.get('hotelId')
            rating = float(rev.get('rating', 0))
            if rating > 0:
                data[uid][hid] = rating  # Override implicit with explicit
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
        'matrix': matrix,
        'user_list': user_list,
        'hotel_list': hotel_list,
        'user_idx': user_idx,
        'hotel_idx': hotel_idx
    }
    print(f"✅ [Recommend] Built user-item matrix: {matrix.shape}")
    return _user_item_matrix


def _get_user_similarity():
    """Compute user-user cosine similarity matrix."""
    global _user_similarity_df
    if _user_similarity_df is not None:
        return _user_similarity_df

    uim = _build_user_item_matrix()
    if uim is None:
        return None

    sim_matrix = cosine_similarity(uim['matrix'])
    _user_similarity_df = {
        'matrix': sim_matrix,
        'user_list': uim['user_list']
    }
    print(f"✅ [Recommend] Computed user-user similarity: {sim_matrix.shape}")
    return _user_similarity_df


def _get_item_similarity():
    """Compute item-item cosine similarity matrix."""
    global _item_similarity_df
    if _item_similarity_df is not None:
        return _item_similarity_df

    uim = _build_user_item_matrix()
    if uim is None:
        return None

    # Item vectors = columns of user-item matrix (transpose)
    item_matrix = uim['matrix'].T
    sim_matrix = cosine_similarity(item_matrix)
    _item_similarity_df = {
        'matrix': sim_matrix,
        'hotel_list': uim['hotel_list']
    }
    print(f"✅ [Recommend] Computed item-item similarity: {sim_matrix.shape}")
    return _item_similarity_df


# ---------------------------------------------------------
# USER PROFILE BUILDER
# ---------------------------------------------------------
def build_user_profile(user_id: str) -> dict:
    """Build user profile from interaction history."""
    interactions = get_all_interactions()
    hotels = {h['id']: h for h in get_all_hotels()}

    user_inters = [i for i in interactions if i['userId'] == user_id]
    if not user_inters:
        return None

    location_counts = defaultdict(int)
    category_counts = defaultdict(int)
    amenity_counts = defaultdict(int)
    prices = []

    weight_map = {"BOOK": 3.0, "ADD_TO_WISHLIST": 2.0, "CLICK_BOOK_NOW": 1.0}

    for inter in user_inters:
        hotel = hotels.get(inter['hotelId'])
        if not hotel:
            continue
        w = weight_map.get(inter['type'], 1.0)

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
        'avg_price': np.mean(prices) if prices else 0,
        'total_interactions': len(user_inters)
    }


# ---------------------------------------------------------
# CONTENT SIMILARITY SCORING
# ---------------------------------------------------------
def compute_content_score(user_profile: dict, hotel: dict) -> float:
    """Compute content-based similarity between user profile and hotel."""
    if not user_profile:
        return 0.5

    scores = []

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
    """
    SVD-based hybrid recommendation (default strategy).
    Combines SVD collaborative filtering with content-based scoring.
    """
    if not algo:
        print("⚠️ [SVD] No model loaded, falling back to popular")
        return popular_recommend(hotels, top_k)

    # Check if user is in SVD model
    try:
        algo.trainset.to_inner_uid(user_id)
    except ValueError:
        print(f"👶 [SVD] User {user_id} not in model, falling back to content")
        return content_recommend(user_id, hotels, top_k)

    print(f"🤖 [SVD] User {user_id} → Hybrid SVD + Content scoring.")
    user_profile = build_user_profile(user_id)

    predictions = []
    for hotel in hotels:
        svd_pred = algo.predict(user_id, hotel.get("id"))
        svd_score = svd_pred.est

        content_score = compute_content_score(user_profile, hotel)
        svd_normalized = (svd_score - 1) / 4

        hybrid_score = SVD_WEIGHT * svd_normalized + CONTENT_WEIGHT * content_score

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
# STRATEGY 2: User-Based CF (Cosine Similarity)
# =========================================================
def user_based_cf_recommend(user_id: str, hotels: list, top_k: int = 5) -> list:
    """
    User-based Collaborative Filtering.
    Finds K most similar users and recommends their liked hotels.
    """
    uim = _build_user_item_matrix()
    usim = _get_user_similarity()

    if uim is None or usim is None:
        print("⚠️ [User-CF] Cannot build matrix, falling back to popular")
        return popular_recommend(hotels, top_k)

    user_idx_map = uim['user_idx']
    hotel_list = uim['hotel_list']
    hotel_idx_map = uim['hotel_idx']
    matrix = uim['matrix']

    if user_id not in user_idx_map:
        print(f"👶 [User-CF] User {user_id} not in matrix, falling back to content")
        return content_recommend(user_id, hotels, top_k)

    uid_idx = user_idx_map[user_id]
    sim_scores = usim['matrix'][uid_idx]

    # Find K most similar users (exclude self)
    sim_users = [(i, sim_scores[i]) for i in range(len(sim_scores)) if i != uid_idx]
    sim_users.sort(key=lambda x: x[1], reverse=True)
    top_similar = sim_users[:USER_CF_K]

    print(f"👥 [User-CF] User {user_id} → Top-{USER_CF_K} similar users")
    for i, (idx, sim) in enumerate(top_similar[:3]):
        print(f"   #{i+1}: {usim['user_list'][idx]} (sim={sim:.3f})")

    # Aggregate recommendations from similar users
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

    # Normalize and sort
    final_scores = []
    for item_idx, score_sum in item_scores.items():
        normalized = score_sum / item_sim_sum[item_idx] if item_sim_sum[item_idx] > 0 else 0
        final_scores.append((item_idx, normalized))

    final_scores.sort(key=lambda x: x[1], reverse=True)

    # Map back to hotel data
    hotels_by_id = {h['id']: h for h in hotels}
    results = []
    for item_idx, score in final_scores[:top_k * 2]:  # Get extra to filter
        hotel_id = hotel_list[item_idx]
        hotel = hotels_by_id.get(hotel_id)
        if hotel:
            results.append(hotel)
        if len(results) >= top_k:
            break

    if results:
        return results

    print("⚠️ [User-CF] No recommendations found, falling back to popular")
    return popular_recommend(hotels, top_k)


# =========================================================
# STRATEGY 3: Item-Based CF
# =========================================================
def item_based_cf_recommend(user_id: str, hotels: list, top_k: int = 5) -> list:
    """
    Item-based Collaborative Filtering.
    Recommends hotels similar to what the user has already interacted with.
    """
    uim = _build_user_item_matrix()
    isim = _get_item_similarity()

    if uim is None or isim is None:
        print("⚠️ [Item-CF] Cannot build matrix, falling back to popular")
        return popular_recommend(hotels, top_k)

    user_idx_map = uim['user_idx']
    hotel_list = uim['hotel_list']
    hotel_idx_map = uim['hotel_idx']
    matrix = uim['matrix']

    if user_id not in user_idx_map:
        print(f"👶 [Item-CF] User {user_id} not in matrix, falling back to content")
        return content_recommend(user_id, hotels, top_k)

    uid_idx = user_idx_map[user_id]
    user_ratings = matrix[uid_idx]

    # Find hotels user has interacted with
    rated_indices = np.where(user_ratings > 0)[0]
    if len(rated_indices) == 0:
        return content_recommend(user_id, hotels, top_k)

    print(f"🏨 [Item-CF] User {user_id} → Based on {len(rated_indices)} interacted hotels")

    # Score unseen hotels by similarity to rated hotels
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

    # Normalize and sort
    final_scores = []
    for item_idx, score_sum in item_scores.items():
        normalized = score_sum / item_sim_sum[item_idx] if item_sim_sum[item_idx] > 0 else 0
        final_scores.append((item_idx, normalized))

    final_scores.sort(key=lambda x: x[1], reverse=True)

    # Map back to hotel data
    hotels_by_id = {h['id']: h for h in hotels}
    results = []
    for item_idx, score in final_scores[:top_k * 2]:
        hotel_id = hotel_list[item_idx]
        hotel = hotels_by_id.get(hotel_id)
        if hotel:
            results.append(hotel)
        if len(results) >= top_k:
            break

    if results:
        return results

    print("⚠️ [Item-CF] No recommendations found, falling back to popular")
    return popular_recommend(hotels, top_k)


# =========================================================
# STRATEGY 4: Content-Based (Onboarding)
# =========================================================
def content_recommend(user_id: str, hotels: list, top_k: int = 5) -> list:
    """Content-based recommendation using onboarding categories."""
    print(f"👶 [Content] User {user_id} → Content-based (onboarding).")

    interested_cats = get_user_interested_categories(user_id)

    if interested_cats:
        print(f"🎯 User interested in: {interested_cats}")
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


# =========================================================
# STRATEGY 5: Popular (Fallback)
# =========================================================
def popular_recommend(hotels: list, top_k: int = 5) -> list:
    """Fallback: top-rated hotels by reviewStar * reviewCount."""
    print("🎲 [Popular] Fallback → Top-rated hotels.")
    sorted_by_rating = sorted(
        hotels,
        key=lambda h: (h.get('reviewStar', 0) * h.get('reviewCount', 0)),
        reverse=True
    )
    return sorted_by_rating[:top_k]


# =========================================================
# SIMILAR HOTELS (for detail page)
# =========================================================
def get_similar_hotels(hotel_id, hotels: list, top_k: int = 5) -> list:
    """
    Find hotels similar to a given hotel using Item-CF similarity.
    Used for "Khách sạn tương tự" feature on detail page.
    """
    isim = _get_item_similarity()
    if isim is None:
        # Fallback: find hotels in same category
        target = None
        for h in hotels:
            if str(h.get('id')) == str(hotel_id):
                target = h
                break
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

    # Sort by similarity (exclude self)
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
# STRATEGY DISPATCHER
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
    Multi-strategy recommendation dispatcher.
    strategy: 'svd' | 'user_cf' | 'item_cf' | 'content' | 'popular'
    """
    try:
        hotels = hotel_vectors or get_all_hotels()
        if not hotels:
            return []

        # Get strategy function
        strategy_fn = STRATEGY_MAP.get(strategy, svd_recommend)
        print(f"\n🎯 [Recommend] User={user_id} | Strategy={strategy} | Top-K={top_k}")

        results = strategy_fn(user_id, hotels, top_k)

        if not results:
            results = popular_recommend(hotels, top_k)

        return results

    except Exception as e:
        print(f"❌ Recommendation error: {e}")
        import traceback
        traceback.print_exc()
        return random.sample(hotel_vectors or get_all_hotels(), min(top_k, len(hotel_vectors or [])))