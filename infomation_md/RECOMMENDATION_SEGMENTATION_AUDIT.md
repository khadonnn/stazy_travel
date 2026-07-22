# RECOMMENDATION SYSTEM - USER SEGMENTATION AUDIT

**Author:** Senior Recommendation System Engineer  
**Date:** 2026-06-18

---

## 1. USER SEGMENTATION SEARCH

### Search: KMeans / GaussianMixture / DBSCAN / Clustering

**NOT FOUND** anywhere in `apps/search-service/src/recommend.py`, `main.py`, `train_svd.py`, `train_real.py`, or any other source file. No clustering algorithm (KMeans, GaussianMixture, DBSCAN) is imported or used in the production recommendation pipeline.

### Search: segment / persona / budget / luxury / mid-range

**FOUND only in mock data generation:**  
**File:** `apps/search-service/generate_mock_interactions.py`  
**Lines:** 145-166  
Uses the terms `budget`, `mid`, and `luxury` for synthetic data generation only. These terms do NOT appear in:

- `apps/search-service/src/recommend.py` (production recommendation engine)
- `apps/search-service/src/search.py`
- `apps/search-service/train_svd.py`
- `apps/search-service/train_real.py`
- `apps/search-service/main.py`

### Search: user profile

**FOUND in production:**  
**File:** `apps/search-service/src/recommend.py`  
**Function:** `build_user_profile()` (lines 737-787)  
This function builds a content-based profile with preferred locations, categories, amenities, and average price. However, it does NOT assign users to any segment or cluster group. It returns a dict of weighted preferences for content-based filtering.

---

## 2. SYNTHETIC DATA GENERATION - DETAILED EVIDENCE

### File: `apps/search-service/generate_mock_interactions.py`

#### User Segment Assignment (Lines 145-151)

```python
# Phân cụm Users
user_segments = {}
n_budget, n_mid = len(users) // 3, len(users) // 3
for i, u in enumerate(users):
    if i < n_budget: user_segments[u['id']] = 'budget'
    elif i < n_budget + n_mid: user_segments[u['id']] = 'mid'
    else: user_segments[u['id']] = 'luxury'
```

- Users are split into 3 equal groups: first 1/3 are `budget`, next 1/3 are `mid`, last 1/3 are `luxury`
- Assignment is based on **enumeration order**, not on price range or any user attribute
- This is a **deterministic index-based split** with `random.seed(42)` for reproducibility

#### Hotel Segment Assignment (Lines 153-160)

```python
# Phân cụm Hotels
hotel_segments = {}
hotel_list = sorted(hotels, key=lambda h: h.get('price', 0))
n_h_budget, n_h_mid = len(hotels) // 3, len(hotels) // 3
for i, h in enumerate(hotel_list):
    if i < n_h_budget: hotel_segments[h['id']]] = 'budget'
    elif i < n_h_budget + n_h_mid: hotel_segments[h['id']] = 'mid'
    else: hotel_segments[h['id']] = 'luxury'
```

- Hotels are sorted by **price ascending**, then split into 3 equal groups
- Lowest 1/3 price → `budget`, middle → `mid`, highest → `luxury`
- This is the only place where actual hotel attributes (price) determine segment

#### Preference Matrix (Lines 162-166)

```python
preference_matrix = {
    ('budget', 'budget'): 0.8, ('budget', 'mid'): 0.15, ('budget', 'luxury'): 0.05,
    ('mid', 'budget'): 0.2, ('mid', 'mid'): 0.6, ('mid', 'luxury'): 0.2,
    ('luxury', 'budget'): 0.05, ('luxury', 'mid'): 0.15, ('luxury', 'luxury'): 0.8,
}
```

This 3×3 preference matrix controls which user-hotel pairs are likely to generate interactions:

- **Budget users** are 80% likely to interact with budget hotels (diagonal)
- **Mid users** are 60% likely to interact with mid hotels
- **Luxury users** are 80% likely to interact with luxury hotels
- Cross-segment interactions are low probability (5-20%)

#### Rating Distribution Per Segment (Lines 78-100)

```python
def compute_rating(user_seg, hotel_seg):
    if user_seg == hotel_seg:
        base_score_map = {
            "budget": 3.5,
            "mid": 4.0,
            "luxury": 4.5
        }
        base_score = base_score_map[user_seg]
    elif user_seg == "mid" or hotel_seg == "mid":
        base_score = 3.5
    else:
        base_score = 2.5

    noise = np.random.normal(0, 0.5)
    rating = np.clip(base_score + noise, 1.0, 5.0)
    return round(float(rating), 1)
```

Different rating distributions are assigned:

- **Budget users** rating their own segment: mean ≈ 3.5
- **Mid users** rating their own segment: mean ≈ 4.0
- **Luxury users** rating their own segment: mean ≈ 4.5
- Cross-segment: mean ≈ 2.5 (budget→luxury or luxury→budget)
- All with Gaussian noise N(0, 0.5²)

---

## 3. SVD TRAINING PIPELINE - COMPLETE TRACE

### Pipeline A: Offline Training (`apps/search-service/train_svd.py`)

**Function:** `main()` (line 271)

#### Step 1: Load Data (`prepare_training_data`, line 35)

**File:** `apps/search-service/train_svd.py`  
**Lines:** 36-109  
**Input files:**

- `jsons/__interactions.json` (implicit signals)
- `jsons/__reviews.json` (explicit ratings)

#### Step 2: Convert Interactions to Scores (Lines 49-93)

```python
signal_weights = {
    "VIEW": 0.5,
    "CLICK_BOOK_NOW": 2.0,
    "ADD_TO_WISHLIST": 3.0,
    "RATE_POSITIVE": 4.5,
    "BOOK": 5.0,
    "RATE_NEGATIVE": -3.0,
}
```

- Implicit signals are mapped to numeric scores
- Explicit ratings override implicit scores for same (user, hotel) pairs
- **No segmentation input** - the training data is the raw (userId, hotelId, score) triple

#### Step 3: Merge & Build DataFrame (Lines 83-97)

```python
rating_map = {}  # (userId, hotelId) -> score
for rec in implicit_records:
    key = (rec["userId"], rec["hotelId"])
    rating_map[key] = rec["score"]

for rec in explicit_records:
    key = (rec["userId"], rec["hotelId"])
    rating_map[key] = rec["score"]  # explicit overrides implicit

records = [{"userId": k[0], "hotelId": k[1], "score": v} for k, v in rating_map.items()]
df = pd.DataFrame(records)
```

#### Step 4: Hyperparameter Tuning (Lines 114-156)

```python
param_grid = {
    'n_factors': [50, 100, 150],
    'n_epochs': [20, 30],
    'lr_all': [0.005, 0.01],
    'reg_all': [0.02, 0.1]
}
gs = GridSearchCV(SVD, param_grid, measures=['rmse', 'mae'], cv=3, n_jobs=-1)
gs.fit(data)
```

#### Step 5: Train Final SVD (Lines 161-188)

```python
algo_optimized = SVD(
    n_factors=best_params['n_factors'],
    n_epochs=best_params['n_epochs'],
    lr_all=best_params['lr_all'],
    reg_all=best_params['reg_all'],
    random_state=42
)
algo_optimized.fit(full_trainset)
```

### Pipeline B: Real Database Training (`apps/search-service/train_real.py`)

**Function:** `train_and_save()` (line 33)  
**Input source:** PostgreSQL database queries

```python
interactions_query = """
SELECT "userId", "hotelId", type, rating, timestamp
FROM interactions ORDER BY timestamp ASC
"""
df_inter = pd.read_sql(interactions_query, engine)

reviews_query = """
SELECT "userId", "hotelId", rating, "createdAt"
FROM reviews WHERE rating IS NOT NULL AND rating > 0 ORDER BY "createdAt" ASC
"""
df_reviews = pd.read_sql(reviews_query, engine)
```

**Score generation logic (Lines 102-129):**

```python
def calculate_score(row):
    if row.get('rating') and pd.notna(row['rating']):
        return float(row['rating'])
    if row['type'] == 'BOOK': return 5
    if row['type'] == 'CLICK_BOOK_NOW': return 4
    if row['type'] == 'LIKE': return 3
    if row['type'] == 'VIEW': return 1
    return 1
```

**Final SVD training (Lines 178-181):**

```python
algo = SVD(random_state=42)
algo.fit(trainset)
```

**No segmentation awareness in either training pipeline.**

---

## 4. RECOMMENDATION PIPELINE - CLASSIFICATION

### Pipeline Architecture

**File:** `apps/search-service/src/recommend.py`  
**Function:** `get_recommendations_for_user()` (line 1362)

#### Step 1: Intent Detection (`detect_intent`, line 511)

- Analyzes user's recent interactions (from PostgreSQL realtime or JSON fallback)
- Identifies session destination using priority cascade (high-intent > recency > long-term)
- Returns destination + confidence score + multiplier
- **No segmentation check** - only destination analysis

#### Step 2: Candidate Retrieval (`retrieve_session_aware_candidates`, line 813)

- Fetches destination-specific hotels + global fillers
- **No segmentation filter** - all hotels are potential candidates

#### Step 3: Hybrid Scoring (Lines 1062-1116 for SVD strategy)

```python
# SVD score
svd_pred = algo.predict(user_id, hotel.get("id"))
svd_score = svd_pred.est

# Content score
content_score = compute_content_score(user_profile, hotel, session_dest, dest_multiplier)

# Hybrid: 60% SVD + 40% Content
SVD_WEIGHT = 0.6
CONTENT_WEIGHT_SVD = 0.4
hybrid_before_boost = SVD_WEIGHT * svd_normalized + CONTENT_WEIGHT_SVD * content_score

# Destination boost
destination_boost = _destination_boost_multiplier(hotel.get('destination', ''), session_dest, dest_multiplier)
hybrid_score = hybrid_before_boost * destination_boost
```

**No segmentation weighting - same formula for ALL users.**

#### Step 4: Diversity Reranking (line 979)

- Groups scored candidates by destination
- Round-robin per destination to ensure variety
- Session destination gets reserved slots
- **No segmentation consideration**

### Available Strategies (line 1305)

```python
STRATEGY_MAP = {
    'svd': svd_recommend,
    'user_cf': user_based_cf_recommend,
    'item_cf': item_based_cf_recommend,
    'content': content_recommend,
    'popular': popular_recommend,
}
```

All strategies treat all users identically. Strategy selection is by request parameter, not by user segment.

---

## 5. FINAL VERDICT

### Classification: **Category B - Synthetic user groups exist only during data generation. No segmentation is used during recommendation.**

**Confidence Score: 100%**

| Question                                      | Answer             | Evidence                                                                      |
| --------------------------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| KMeans/DBSCAN/GMM used?                       | ❌ NOT FOUND       | No clustering imports in any source file                                      |
| Users assigned to groups at runtime?          | ❌ NO              | `user_segments` only exists in `generate_mock_interactions.py`                |
| Budget/mid/luxury in recommend.py?            | ❌ NOT FOUND       | These terms do not appear in the recommendation engine                        |
| Preference matrix used during SVD training?   | ❌ NO              | `train_svd.py` and `train_real.py` train on raw (userId, hotelId, score) only |
| Preference matrix used during recommendation? | ❌ NO              | `recommend.py` uses SVD latent factors + content scoring, no segmentation     |
| Segment-specific models trained?              | ❌ NOT FOUND       | Only one SVD model is trained for all users                                   |
| Segment-aware weighting in hybrid scoring?    | ❌ NOT FOUND       | All users get SVD_WEIGHT=0.6, CONTENT_WEIGHT_SVD=0.4                          |
| Different rating distributions for segments?  | ✅ YES (mock only) | `generate_mock_interactions.py:78-100` different base scores per segment      |
| Synthetic segments in mock data?              | ✅ YES             | `generate_mock_interactions.py:145-166`                                       |

### Detailed Explanation

**What the system does:**

1. During **synthetic data generation** (`generate_mock_interactions.py`), users are artificially divided into `budget`, `mid`, and `luxury` groups. A preference matrix controls which user-hotel pairs generate interactions. `compute_rating()` assigns different rating distributions per group. This creates synthetic data with built-in segment-specific patterns.

2. During **SVD training** (`train_svd.py` or `train_real.py`), these segment labels are **completely discarded**. The training data is simply `(userId, hotelId, score)` triples. The SVD model learns latent factors that may implicitly capture some segment behavior (since the synthetic data has group patterns), but no explicit segmentation is provided.

3. During **recommendation** (`recommend.py`), users receive recommendations through a hybrid SVD + content-based scoring pipeline. Weighted feature scoring (destination, price, amenities, location) plus SVD predictions - all **completely segment-agnostic**. The same weights (SVD_WEIGHT=0.6, CONTENT_WEIGHT_SVD=0.4) apply to every user.

**What the system does NOT do:**

- No KMeans, GaussianMixture, or DBSCAN clustering at any point
- No user profiling that assigns segment labels
- No segment-specific recommendation models
- No segment-aware weighting or boosting
- No online user segmentation (e.g., "this user behaves like a budget traveler")
- No persona detection or traveler type classification

The SVD model may learn segment-like latent factors from the synthetic data patterns, but this is an implicit emergent property of matrix factorization, not an explicit segmentation strategy. The system makes no attempt to identify or leverage user segments during the recommendation phase.
</write_to_file>
<task_progress>

- [x] Searched for KMeans, GaussianMixture, DBSCAN, clustering in all source files
- [x] Searched for segment, persona, budget, luxury, mid-range, user profile
- [x] Read generate_mock_interactions.py for synthetic user/hotel segmentation
- [x] Read generate_data.py for synthetic hotel generation
- [x] Read generate_users.py for user generation
- [x] Read train_svd.py for SVD training pipeline
- [x] Read train_real.py for database-based SVD training
- [x] Read evaluate.py for evaluation framework
- [x] Read src/recommend.py for hybrid scoring pipeline (complete 1556 lines)
- [x] Verified production recommendation engine has no segmentation logic
- [x] Determined classification as Category B with all evidence
- [x] Produced comprehensive audit report
      </task_progress>
      </write_to_file>
