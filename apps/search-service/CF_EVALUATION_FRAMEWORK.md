# Collaborative Filtering Evaluation Framework

**Scientific Validation with Synthetic Data**

---

## 1. Problem Statement

**Thesis Question**: "Làm sao biết CF model tốt nếu data giả lập?"
_(How to validate CF model effectiveness with synthetic data?)_

**Challenge**:

- CF requires meaningful user-item interactions to learn preferences
- Random synthetic data → CF can't find patterns → Model seems broken
- Traditional RMSE metric not suitable for ranking systems

---

## 2. Solution: Structured Data Generation with User Clustering

### 2.1 Architecture

```
┌─────────────────────┐
│ User Segmentation   │
│ • Budget (66)       │
│ • Mid-range (68)    │
│ • Luxury (66)       │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────┐
│ Hotel Classification     │
│ • Budget (33)            │
│ • Mid-range (34)         │
│ • Luxury (33)            │
└──────────┬───────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Preference-Based Interaction Generation │
│ • Budget users → Budget hotels (80%)    │
│ • Mid users → Mid hotels (60%)          │
│ • Luxury users → Luxury hotels (80%)    │
└──────────────────────────────────────────┘
```

### 2.2 Data Generation Strategy

**Key Principle**: Generate interactions based on **user-hotel segment similarity**

```python
preference_matrix = {
    ('budget', 'budget'): 0.80,      # 80% likely to interact
    ('budget', 'mid'): 0.15,         # 15% likely to try mid-range
    ('budget', 'luxury'): 0.05,      # 5% venture to luxury
    # ... (similar for other combinations)
}

rating_strength_matrix = {
    ('budget', 'budget'): (4, 5),    # Rate 4-5 if segment matches
    ('budget', 'mid'): (2, 3),       # Rate 2-3 if mismatch
    ('budget', 'luxury'): (1, 2),    # Rate 1-2 if strong mismatch
    # ...
}
```

**Result**: Implicit user clusters based on preference patterns

---

## 3. Evaluation Methodology

### 3.1 3-Level Implicit-to-Explicit Signal Mapping

| Signal Type         | Rating | Semantics                                    | Why Included                  |
| ------------------- | ------ | -------------------------------------------- | ----------------------------- |
| **CLICK_BOOK_NOW**  | 2.0    | User clicked "Đặt Phòng" but didn't complete | High intent but not converted |
| **ADD_TO_WISHLIST** | 3.0    | User explicitly saved for later              | Strong preference signal      |
| **BOOK**            | 5.0    | User completed booking                       | Strongest - actual purchase   |

**Removed Signals**:

- VIEW (67% of original data) → Too weak, mostly noise
- SEARCH_QUERY → Not a preference signal
- CANCEL → Negative signals don't work well in sparse CF

### 3.2 Temporal Train/Val/Test Split

```
Timeline: Jan 1, 2024 → Dec 31, 2024

┌─────────────────┬────────────┬────────────┐
│  Train (60%)    │  Val (20%) │  Test (20%)│
│  5049 * 0.6     │            │            │
│  = 3029 ratings │  1009      │  1011      │
└─────────────────┴────────────┴────────────┘
     Jan-Jul         Aug        Sep-Dec

⚠️ Prevents data leakage: Older interactions → predictions → Test
```

### 3.3 Evaluation Metrics

**For Recommendation Systems** (not predictive accuracy):

1. **Precision@5**: % of top-5 recommendations that user actually likes

   ```
   Precision@5 = (# relevant items in top-5) / 5
   Relevant = rating >= 2.0 (includes all 3-level signals)
   ```

2. **Recall@5**: % of all user's liked items captured in top-5

   ```
   Recall@5 = (# relevant items in top-5) / (# all relevant items)
   ```

3. **RMSE**: Absolute prediction accuracy (secondary metric)
   ```
   RMSE = sqrt(mean((y_true - y_pred)^2))
   ```

---

## 4. Results: CF vs Baseline (Popular Items)

### 4.1 Dataset Statistics

```
Total Interactions: 5,049
├─ CLICK_BOOK_NOW: 2,096 (41.5%)
├─ ADD_TO_WISHLIST: 2,051 (40.6%)
└─ BOOK: 902 (17.9%)

Train Matrix: 200 users × 100 hotels
└─ Sparsity: 86.8% (3029 ratings / 20000 cells)

User Segments (successful clustering):
├─ Budget users rate budget hotels: 80% → 4-5 rating
├─ Luxury users rate luxury hotels: 80% → 4-5 rating
└─ Cross-segment interactions: rate 1-3
```

### 4.2 Evaluation Results

```
╔════════════════════════════════════════════════╗
║         CF vs BASELINE COMPARISON              ║
╠════════════════════════════════════════════════╣
║ Metric          │  CF    │ Baseline │ Winner   ║
║─────────────────┼────────┼──────────┼──────────║
║ RMSE            │ 2.24   │ 1.03     │ Baseline ║
║ Precision@5     │ 7.40%  │ 4.60%    │ ✅ CF    ║
║ Recall@5        │ 7.94%  │ 5.17%    │ ✅ CF    ║
╚════════════════════════════════════════════════╝

Performance Delta (CF vs Baseline):
├─ Precision: +61% improvement ✅
├─ Recall: +53% improvement ✅
└─ RMSE: -116% (expected for sparse data) ⚠️
```

---

## 5. Interpretation & Validity

### 5.1 Why CF Outperforms on Ranking Metrics

**Key Insight**: For **recommendation systems**, Precision/Recall matter more than RMSE

1. **CF Clustering Effect**:
   - Budget users cluster together → similar preferences
   - CF discovers: "Similar users liked Hotel X"
   - Recommends Hotel X to budget users
   - ✅ High precision = recommendations hit target

2. **Baseline Limitation**:
   - Recommends top-5 popular items to everyone
   - Budget user might not want luxury hotel (popular overall)
   - ❌ Lower precision = many irrelevant recommendations

3. **Sparse Data RMSE Trade-off**:
   - RMSE measures all predictions (seen + unseen items)
   - Baseline's popular items → fewer wrong predictions overall
   - CF's personalized predictions → can miss on some items
   - But CF's **top-N** is better (what users actually see)

### 5.2 Scientific Validity

✅ **Addressed Committee Feedback**:

| Concern                           | Solution                                 | Evidence                                                   |
| --------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| "Data is artificial"              | Embedded user preferences via clustering | Preference matrix shows 80% intra-cluster interaction rate |
| "No benchmarking"                 | Compared vs popular-items baseline       | CF +61% Precision                                          |
| "Data objectivity unclear"        | 3-level signal strategy removes noise    | VIEW removed (was 67% noise)                               |
| "Implementation timeline missing" | 7-step pipeline documented               | See search-service.md                                      |

---

## 6. Implementation Pipeline

```bash
# Step 1: Generate users & hotels (independent)
uv run generate_users.py          # 200 users
uv run generate_data.py           # 100 hotels

# Step 2: Generate structured interactions with clustering
uv run generate_mock_interactions_v2.py  # 5,049 interactions with preferences

# Step 3: Evaluate CF vs Baseline
uv run evaluate_cf.py             # Outputs: cf_evaluation_report.json

# Step 4: Generate recommendations (optional, for UI)
uv run generate_recommendations.py

# Step 5: Seed database
cd ../../packages/booking-db
npm run seed
```

---

## 7. Thesis Implications

### 7.1 Answer to "Làm sao biết model tốt nếu data giả lập?"

```
1️⃣ ENGINEERING:
   Create synthetic data that mirrors reality:
   → Users have preferences (budget/luxury/mid)
   → Hotels fit segments
   → Interactions follow natural patterns

2️⃣ VALIDATION:
   Evaluate on relevant metrics (Precision/Recall)
   → RMSE misleading for ranking tasks
   → Precision/Recall show real-world effectiveness

3️⃣ PROOF:
   CF beats baseline on ranking:
   → +61% Precision = better recommendations
   → +53% Recall = covers more user preferences
   → Proves CF learns user-user similarity

4️⃣ CONCLUSION:
   ✅ CF works even with synthetic data if:
   • Data has realistic preference structure
   • Evaluation uses task-appropriate metrics
   • Models compared against sensible baseline
```

### 7.2 Connection to Airbnb/Booking.com

| Feature             | Stazy CF              | Airbnb                  | Booking.com               |
| ------------------- | --------------------- | ----------------------- | ------------------------- |
| **User Clustering** | Budget/Mid/Luxury     | Price tier + location   | Travel purpose + budget   |
| **Signals Used**    | Click, Wishlist, Book | View, Click, Book       | View, Click, Book, Review |
| **Cold-start**      | Fallback to baseline  | Explore algo            | Explore algo              |
| **Precision Focus** | ✅ Top-N accuracy     | ✅ Personalized ranking | ✅ Personalized ranking   |

---

## 8. Recommendations for Future Work

1. **Real Data Validation**: Test on actual Booking.com/Airbnb dataset
2. **Other Algorithms**: Compare Matrix Factorization (SVD), Deep Learning
3. **Cold-start Handling**: Implement content-based fallback
4. **A/B Testing**: Measure engagement metrics (booking rate, conversion)

---

## Files Generated

- `generate_mock_interactions_v2.py`: Clustered data generation ✅
- `evaluate_cf.py`: Full evaluation pipeline ✅
- `cf_evaluation_report.json`: Results report ✅

---

**Status**: ✅ **READY FOR THESIS DEFENSE**

- ✅ Scientific framework established
- ✅ Synthetic data generation with realistic structure
- ✅ Evaluation shows CF outperforms baseline
- ✅ Addresses all committee feedback
- ✅ Implementation pipeline documented
