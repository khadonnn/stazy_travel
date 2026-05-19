#!/usr/bin/env python3
"""
REAL DATABASE EVALUATION FRAMEWORK
====================================
Evaluates recommendation system performance using real data from PostgreSQL.

Features:
  1. Implicit CF Evaluation (Ranking): Precision@K, Recall@K, NDCG@K
  2. Explicit CF Evaluation (Rating Prediction): RMSE, MAE
  3. SVD Model Evaluation (if model exists)
  4. Saves all results to analytics/ folder
  5. Saves metrics to SystemMetric table in DB

Usage:
  uv run evaluate_real.py --mode implicit
  uv run evaluate_real.py --mode explicit
  uv run evaluate_real.py --mode svd
  uv run evaluate_real.py --mode all
"""

import json
import os
import sys
import argparse
import pickle
import time
from datetime import datetime
from collections import defaultdict

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ANALYTICS_DIR = os.path.join(BASE_DIR, "analytics")

DB_URL = os.getenv("DATABASE_URL", "postgresql://admin:123456@localhost:5432/products")
MODEL_PATH = os.path.join(BASE_DIR, "jsons", "recsys_model.pkl")

# CF Parameters
K_NEIGHBORS_IMPLICIT = 5
K_NEIGHBORS_EXPLICIT = 10
K_RECOMMENDATIONS = 5

# Signal weights (aligned with evaluate.py & recommend.py)
SIGNAL_WEIGHTS = {
    "VIEW": 0.5,
    "CLICK_BOOK_NOW": 2.0,
    "ADD_TO_WISHLIST": 3.0,
    "RATE_POSITIVE": 4.5,
    "BOOK": 5.0,
    "LIKE": 3.0,
    "SHARE": 1.5,
    "RATE_NEGATIVE": -3.0,
    "CANCEL": -2.0,
}


# ---------------------------------------------------------
# SHARED UTILITIES
# ---------------------------------------------------------

def ensure_analytics_dir():
    """Create analytics directory if not exists"""
    os.makedirs(ANALYTICS_DIR, exist_ok=True)


def get_engine():
    """Create SQLAlchemy engine"""
    return create_engine(DB_URL)


def load_json(filepath):
    """Load JSON file"""
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_report(report, filename):
    """Save evaluation report to analytics/ folder"""
    ensure_analytics_dir()
    output_path = os.path.join(ANALYTICS_DIR, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)
    print(f"📄 Report saved to: {output_path}")
    return output_path


def save_to_system_metrics(engine, metrics: dict):
    """Save evaluation metrics to SystemMetric table in DB"""
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO system_metrics 
                ("rmse", "mae", "precisionAt5", "recallAt5", "ndcgAt5",
                 "baselineRmse", "baselineMae", "baselinePrecision", "baselineRecall", "baselineNdcg",
                 "algorithm", "datasetSize", "executionTimeMs", "trainingHistory", "tuningParams", "createdAt")
                VALUES 
                (:rmse, :mae, :precisionAt5, :recallAt5, :ndcgAt5,
                 :baselineRmse, :baselineMae, :baselinePrecision, :baselineRecall, :baselineNdcg,
                 :algorithm, :datasetSize, :executionTimeMs, :trainingHistory, :tuningParams, :createdAt)
            """), {
                "rmse": metrics.get("rmse", 0),
                "mae": metrics.get("mae", 0),
                "precisionAt5": metrics.get("precision_at_k", 0),
                "recallAt5": metrics.get("recall_at_k", 0),
                "ndcgAt5": metrics.get("ndcg_at_k", 0),
                "baselineRmse": metrics.get("baseline_rmse", 0),
                "baselineMae": metrics.get("baseline_mae", 0),
                "baselinePrecision": metrics.get("baseline_precision", 0),
                "baselineRecall": metrics.get("baseline_recall", 0),
                "baselineNdcg": metrics.get("baseline_ndcg", 0),
                "algorithm": metrics.get("algorithm", "User-CF"),
                "datasetSize": metrics.get("dataset_size", 0),
                "executionTimeMs": metrics.get("execution_time_ms", 0),
                "trainingHistory": json.dumps(metrics.get("training_history", [])) if metrics.get("training_history") else None,
                "tuningParams": json.dumps(metrics.get("tuning_params", [])) if metrics.get("tuning_params") else None,
                "createdAt": datetime.now(),
            })
            conn.commit()
        print("✅ Metrics saved to SystemMetric table in DB")
    except Exception as e:
        print(f"⚠️ Could not save to SystemMetric table: {e}")


def temporal_split(data, train_pct=0.6, val_pct=0.2):
    """Temporal split: train/val/test based on timestamp"""
    data = sorted(data, key=lambda x: x.get('timestamp', x.get('createdAt', '')))
    n = len(data)
    n_train = int(n * train_pct)
    n_val = int(n * val_pct)

    train = data[:n_train]
    val = data[n_train:n_train + n_val]
    test = data[n_train + n_val:]

    return train, val, test


def build_user_item_matrix(interactions, user_ids, hotel_ids):
    """Build user-item matrix from interactions"""
    matrix = pd.DataFrame(
        np.nan,
        index=user_ids,
        columns=hotel_ids
    )

    for inter in interactions:
        uid = inter.get('userId')
        hid = inter.get('hotelId')
        value = inter.get('value')

        if uid in user_ids and hid in hotel_ids:
            if pd.isna(matrix.loc[uid, hid]):
                matrix.loc[uid, hid] = value
            else:
                matrix.loc[uid, hid] = (matrix.loc[uid, hid] + value) / 2

    return matrix


def compute_ndcg(predicted_items, relevant_items, k=5):
    """Compute NDCG@K"""
    predicted_at_k = predicted_items[:k]
    relevant_set = set(relevant_items)

    dcg = sum([1.0 / np.log2(i + 2) for i, item in enumerate(predicted_at_k) if item in relevant_set])
    idcg = sum([1.0 / np.log2(i + 2) for i in range(min(k, len(relevant_set)))])

    return dcg / idcg if idcg > 0 else 0.0


# ---------------------------------------------------------
# DATA LOADING FROM DATABASE
# ---------------------------------------------------------

def load_interactions_from_db(engine):
    """Load interactions from PostgreSQL Interaction table"""
    print("\n📦 Loading interactions from database...")
    query = """
    SELECT id, "userId", "hotelId", type, rating, metadata, timestamp
    FROM interactions
    ORDER BY timestamp ASC
    """
    df = pd.read_sql(query, engine)

    if df.empty:
        print("⚠️ No interactions found in database!")
        return []

    # Convert to list of dicts
    interactions = []
    for _, row in df.iterrows():
        interactions.append({
            'id': row['id'],
            'userId': row['userId'],
            'hotelId': row['hotelId'],
            'type': row['type'],
            'rating': row['rating'],
            'timestamp': str(row['timestamp']) if row['timestamp'] else '',
        })

    print(f"   ✅ Loaded {len(interactions)} interactions")

    # Stats
    type_counts = defaultdict(int)
    for inter in interactions:
        type_counts[inter['type']] += 1

    print("   📊 Interaction type distribution:")
    for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        pct = count / len(interactions) * 100
        print(f"      {t}: {count} ({pct:.1f}%)")

    unique_users = len(set(i['userId'] for i in interactions))
    unique_hotels = len(set(i['hotelId'] for i in interactions))
    print(f"   📊 Unique users: {unique_users}, Unique hotels: {unique_hotels}")

    return interactions


def load_reviews_from_db(engine):
    """Load reviews from PostgreSQL Review table"""
    print("\n📦 Loading reviews from database...")
    query = """
    SELECT id, "userId", "hotelId", rating, comment, "bookingId", "createdAt"
    FROM reviews
    ORDER BY "createdAt" ASC
    """
    df = pd.read_sql(query, engine)

    if df.empty:
        print("⚠️ No reviews found in database!")
        return []

    reviews = []
    for _, row in df.iterrows():
        reviews.append({
            'id': row['id'],
            'userId': row['userId'],
            'hotelId': row['hotelId'],
            'rating': int(row['rating']) if row['rating'] else 0,
            'comment': row['comment'],
            'bookingId': row['bookingId'],
            'createdAt': str(row['createdAt']) if row['createdAt'] else '',
        })

    print(f"   ✅ Loaded {len(reviews)} reviews")

    rating_dist = defaultdict(int)
    for rev in reviews:
        rating_dist[rev['rating']] += 1

    print("   📊 Rating distribution:")
    for r in sorted(rating_dist.keys()):
        count = rating_dist[r]
        pct = count / len(reviews) * 100
        print(f"      {r}⭐: {count} ({pct:.1f}%)")

    return reviews


def load_users_from_db(engine):
    """Load user IDs from database"""
    query = 'SELECT id FROM users'
    df = pd.read_sql(query, engine)
    return df['id'].tolist()


def load_hotels_from_db(engine):
    """Load hotel IDs from database"""
    query = 'SELECT id FROM hotels WHERE status = \'APPROVED\''
    df = pd.read_sql(query, engine)
    return df['id'].tolist()


# ---------------------------------------------------------
# SYSTEM A: IMPLICIT CF EVALUATION (Real Data)
# ---------------------------------------------------------

def evaluate_implicit(engine):
    """Evaluate implicit feedback system using real database data"""
    print("\n" + "=" * 70)
    print("🔵 SYSTEM A: IMPLICIT CF EVALUATION (REAL DATABASE)")
    print("=" * 70)

    start_time = time.time()

    # Load data
    interactions_raw = load_interactions_from_db(engine)
    users = load_users_from_db(engine)
    hotels = load_hotels_from_db(engine)

    if not interactions_raw:
        print("❌ No interactions data available for evaluation")
        return None

    print(f"\n📊 Database: {len(users)} users, {len(hotels)} hotels (APPROVED)")

    # Convert implicit signals to ratings
    print("\n[1/5] Converting implicit signals to ratings...")
    interactions = []
    for inter in interactions_raw:
        signal_type = inter.get('type')
        if signal_type not in SIGNAL_WEIGHTS:
            continue

        # If it's a RATING type and has rating value, use the rating
        if signal_type == 'RATING' and inter.get('rating'):
            rating = float(inter['rating'])
        elif signal_type in ('RATE_POSITIVE', 'RATE_NEGATIVE') and inter.get('rating'):
            rating = float(inter['rating'])
        else:
            rating = SIGNAL_WEIGHTS[signal_type]

        interactions.append({
            'userId': inter['userId'],
            'hotelId': inter['hotelId'],
            'value': rating,
            'timestamp': inter.get('timestamp', ''),
            'type': signal_type
        })

    print(f"   ✅ Converted {len(interactions)} interactions")

    signal_counts = defaultdict(int)
    for inter in interactions:
        signal_counts[inter['type']] += 1

    # Validate data
    print("\n[2/5] Validating data integrity...")
    users_set = set(users)
    hotels_set = set(hotels)

    valid_interactions = [
        i for i in interactions
        if i['userId'] in users_set and i['hotelId'] in hotels_set
    ]
    invalid_count = len(interactions) - len(valid_interactions)
    interactions = valid_interactions

    print(f"   ✅ Valid interactions: {len(interactions)}")
    print(f"   ⚠️  Invalid interactions removed: {invalid_count}")

    if len(interactions) < 10:
        print("❌ Too few interactions for meaningful evaluation (< 10)")
        return None

    # Temporal split
    print("\n[3/5] Splitting data (temporal split)...")
    train_interactions, val_interactions, test_interactions = temporal_split(interactions)

    print(f"   ✅ Train: {len(train_interactions)} ({len(train_interactions) / len(interactions) * 100:.1f}%)")
    print(f"   ✅ Val:   {len(val_interactions)} ({len(val_interactions) / len(interactions) * 100:.1f}%)")
    print(f"   ✅ Test:  {len(test_interactions)} ({len(test_interactions) / len(interactions) * 100:.1f}%)")

    # Build matrices
    print("\n[4/5] Building user-item matrices...")
    train_matrix = build_user_item_matrix(train_interactions, users, hotels)
    test_matrix = build_user_item_matrix(test_interactions, users, hotels)

    sparsity_train = train_matrix.isna().sum().sum() / (len(users) * len(hotels)) * 100

    print(f"   ✅ Train matrix: ({len(users)}, {len(hotels)}) | Sparsity: {sparsity_train:.1f}%")

    # Train CF model
    print("\n[5/5] Training implicit CF model & evaluating...")
    train_filled = train_matrix.fillna(0)
    user_similarity = cosine_similarity(train_filled.values)
    user_sim_df = pd.DataFrame(user_similarity, index=train_matrix.index, columns=train_matrix.index)

    # Baseline: top popular items
    item_popularity = train_filled.sum(axis=0).sort_values(ascending=False)
    top_items = item_popularity.head(K_RECOMMENDATIONS).index.tolist()

    # Evaluate
    test_by_user = defaultdict(list)
    for inter in test_interactions:
        test_by_user[inter['userId']].append(inter['hotelId'])

    cf_precisions, cf_recalls, cf_ndcgs = [], [], []
    baseline_precisions, baseline_recalls, baseline_ndcgs = [], [], []
    evaluated_users = 0
    cold_start_users = 0

    for user_id in users:
        test_items = set(test_by_user.get(user_id, []))
        if not test_items:
            continue

        if user_id not in train_matrix.index or train_matrix.loc[user_id].dropna().empty:
            cold_start_users += 1
            continue

        evaluated_users += 1

        # CF predictions
        user_sims = user_sim_df.loc[user_id].drop(user_id)
        top_similar = user_sims.nlargest(K_NEIGHBORS_IMPLICIT).index

        rec_scores = defaultdict(float)
        user_rated = set(train_matrix.loc[user_id].dropna().index)

        for sim_user in top_similar:
            sim = user_sims[sim_user]
            sim_items = train_matrix.loc[sim_user].dropna()
            for item, rating in sim_items.items():
                if item not in user_rated:
                    rec_scores[item] += sim * rating

        cf_rec_items = [item for item, _ in sorted(rec_scores.items(), key=lambda x: x[1], reverse=True)[:K_RECOMMENDATIONS]]

        # CF metrics
        cf_hit = len([i for i in cf_rec_items if i in test_items])
        cf_precisions.append(cf_hit / len(cf_rec_items) if cf_rec_items else 0)
        cf_recalls.append(cf_hit / len(test_items))
        cf_ndcgs.append(compute_ndcg(cf_rec_items, list(test_items), K_RECOMMENDATIONS))

        # Baseline metrics
        bl_hit = len([i for i in top_items if i in test_items])
        baseline_precisions.append(bl_hit / len(top_items))
        baseline_recalls.append(bl_hit / len(test_items))
        baseline_ndcgs.append(compute_ndcg(top_items, list(test_items), K_RECOMMENDATIONS))

    # Results
    elapsed = time.time() - start_time

    cf_avg_p = np.mean(cf_precisions) if cf_precisions else 0
    cf_avg_r = np.mean(cf_recalls) if cf_recalls else 0
    cf_avg_n = np.mean(cf_ndcgs) if cf_ndcgs else 0

    bl_avg_p = np.mean(baseline_precisions) if baseline_precisions else 0
    bl_avg_r = np.mean(baseline_recalls) if baseline_recalls else 0
    bl_avg_n = np.mean(baseline_ndcgs) if baseline_ndcgs else 0

    print(f"\n🔍 Implicit CF Results (Real Data):")
    print(f"   • Users evaluated: {evaluated_users}")
    print(f"   • Cold-start users: {cold_start_users}")
    print(f"   • Precision@{K_RECOMMENDATIONS}: {cf_avg_p:.4f}")
    print(f"   • Recall@{K_RECOMMENDATIONS}:    {cf_avg_r:.4f}")
    print(f"   • NDCG@{K_RECOMMENDATIONS}:       {cf_avg_n:.4f}")

    print(f"\n🔍 Baseline (Top Popular):")
    print(f"   • Precision@{K_RECOMMENDATIONS}: {bl_avg_p:.4f}")
    print(f"   • Recall@{K_RECOMMENDATIONS}:    {bl_avg_r:.4f}")
    print(f"   • NDCG@{K_RECOMMENDATIONS}:       {bl_avg_n:.4f}")

    p_imp = (cf_avg_p - bl_avg_p) / bl_avg_p * 100 if bl_avg_p > 0 else 0
    r_imp = (cf_avg_r - bl_avg_r) / bl_avg_r * 100 if bl_avg_r > 0 else 0
    n_imp = (cf_avg_n - bl_avg_n) / bl_avg_n * 100 if bl_avg_n > 0 else 0

    report = {
        "timestamp": datetime.now().isoformat(),
        "evaluation_type": "implicit_cf_real",
        "data_source": "database",
        "database_url": DB_URL.split("@")[-1] if "@" in DB_URL else DB_URL,
        "execution_time_seconds": round(elapsed, 2),
        "data_stats": {
            "total_interactions": len(interactions),
            "signal_distribution": dict(signal_counts),
            "unique_users": len(set(i['userId'] for i in interactions)),
            "unique_hotels": len(set(i['hotelId'] for i in interactions)),
            "train_count": len(train_interactions),
            "val_count": len(val_interactions),
            "test_count": len(test_interactions),
        },
        "matrix_stats": {
            "shape": [len(users), len(hotels)],
            "sparsity_pct": round(sparsity_train, 2),
        },
        "cf_results": {
            "precision_at_k": round(cf_avg_p, 4),
            "recall_at_k": round(cf_avg_r, 4),
            "ndcg_at_k": round(cf_avg_n, 4),
        },
        "baseline_results": {
            "precision_at_k": round(bl_avg_p, 4),
            "recall_at_k": round(bl_avg_r, 4),
            "ndcg_at_k": round(bl_avg_n, 4),
        },
        "improvement_pct": {
            "precision": round(p_imp, 2),
            "recall": round(r_imp, 2),
            "ndcg": round(n_imp, 2),
        },
    }

    save_report(report, "real_implicit_cf_report.json")

    # Save to DB SystemMetric
    save_to_system_metrics(engine, {
        "rmse": 0,
        "mae": 0,
        "precision_at_k": cf_avg_p,
        "recall_at_k": cf_avg_r,
        "ndcg_at_k": cf_avg_n,
        "baseline_rmse": 0,
        "baseline_mae": 0,
        "baseline_precision": bl_avg_p,
        "baseline_recall": bl_avg_r,
        "baseline_ndcg": bl_avg_n,
        "algorithm": "User-CF (Implicit)",
        "dataset_size": len(interactions),
        "execution_time_ms": int(elapsed * 1000),
    })

    return report


# ---------------------------------------------------------
# SYSTEM B: EXPLICIT CF EVALUATION (Real Data)
# ---------------------------------------------------------

def evaluate_explicit(engine):
    """Evaluate explicit feedback (rating prediction) using real database data"""
    print("\n" + "=" * 70)
    print("🟢 SYSTEM B: EXPLICIT CF EVALUATION (REAL DATABASE)")
    print("=" * 70)

    start_time = time.time()

    # Load data
    reviews = load_reviews_from_db(engine)
    users = load_users_from_db(engine)
    hotels = load_hotels_from_db(engine)

    if not reviews:
        print("❌ No reviews data available for evaluation")
        return None

    users_set = set(users)
    hotels_set = set(hotels)

    # Prepare interactions from reviews
    print("\n[1/5] Preparing explicit rating data...")
    interactions = []
    for rev in reviews:
        if rev['userId'] in users_set and rev['hotelId'] in hotels_set and rev['rating'] > 0:
            interactions.append({
                'userId': rev['userId'],
                'hotelId': rev['hotelId'],
                'value': float(rev['rating']),
                'timestamp': rev.get('createdAt', ''),
                'bookingId': rev.get('bookingId', ''),
            })

    print(f"   ✅ Prepared {len(interactions)} valid ratings")

    if len(interactions) < 10:
        print("❌ Too few ratings for meaningful evaluation (< 10)")
        return None

    rating_dist = defaultdict(int)
    for inter in interactions:
        rating_dist[inter['value']] += 1

    # Temporal split
    print("\n[2/5] Splitting data (temporal split)...")
    train_interactions, val_interactions, test_interactions = temporal_split(interactions)

    print(f"   ✅ Train: {len(train_interactions)} ({len(train_interactions) / len(interactions) * 100:.1f}%)")
    print(f"   ✅ Val:   {len(val_interactions)} ({len(val_interactions) / len(interactions) * 100:.1f}%)")
    print(f"   ✅ Test:  {len(test_interactions)} ({len(test_interactions) / len(interactions) * 100:.1f}%)")

    # Build matrices
    print("\n[3/5] Building rating matrices...")
    train_matrix = build_user_item_matrix(train_interactions, users, hotels)
    sparsity = train_matrix.isna().sum().sum() / (len(users) * len(hotels)) * 100

    print(f"   ✅ Train matrix: ({len(users)}, {len(hotels)}) | Sparsity: {sparsity:.1f}%")

    # Compute user similarity (Pearson correlation via mean-centering)
    print("\n[4/5] Computing user similarity (Pearson)...")
    train_centered = train_matrix.copy()
    for uid in train_centered.index:
        user_mean = train_matrix.loc[uid].mean()
        fill_val = user_mean if pd.notna(user_mean) else 3.0
        train_centered.loc[uid] = train_matrix.loc[uid].fillna(fill_val)

    user_means = train_centered.mean(axis=1)
    train_mc = train_centered.sub(user_means, axis=0)

    user_sim = cosine_similarity(train_mc.values)
    user_sim_df = pd.DataFrame(user_sim, index=train_matrix.index, columns=train_matrix.index)

    print(f"   ✅ User similarity computed: {user_sim_df.shape}")

    # Evaluate
    print("\n[5/5] Evaluating on test set...")
    predictions, actuals = [], []
    evaluated = 0
    cold_start = 0

    for inter in test_interactions:
        uid = inter['userId']
        hid = inter['hotelId']
        actual = inter['value']

        if uid not in train_matrix.index or train_matrix.loc[uid].dropna().empty:
            cold_start += 1
            continue

        evaluated += 1
        user_mean = train_matrix.loc[uid].mean()
        if not pd.notna(user_mean):
            user_mean = 3.0

        if uid in user_sim_df.index:
            user_sims = user_sim_df.loc[uid].drop(uid)
            top_similar = user_sims.nlargest(K_NEIGHBORS_EXPLICIT).index

            w_sum = 0.0
            s_sum = 0.0

            for sim_user in top_similar:
                sim = user_sims[sim_user]
                if sim <= 0:
                    continue
                sim_mean = train_matrix.loc[sim_user].mean()
                rating = train_matrix.loc[sim_user, hid]
                if pd.notna(rating):
                    w_sum += sim * (rating - sim_mean)
                    s_sum += abs(sim)

            if s_sum > 0:
                predicted = user_mean + (w_sum / s_sum)
                predicted = max(1.0, min(5.0, predicted))
            else:
                predicted = user_mean
        else:
            predicted = user_mean

        predictions.append(predicted)
        actuals.append(actual)

    predictions = np.array(predictions)
    actuals = np.array(actuals)

    rmse = np.sqrt(np.mean((predictions - actuals) ** 2))
    mae = np.mean(np.abs(predictions - actuals))

    # Baseline: predict user mean
    bl_preds = []
    bl_actuals = []
    for inter in test_interactions:
        uid = inter['userId']
        if uid in train_matrix.index:
            um = train_matrix.loc[uid].mean()
            bl_preds.append(um if pd.notna(um) else 3.0)
        else:
            bl_preds.append(3.0)
        bl_actuals.append(inter['value'])

    bl_preds = np.array(bl_preds)
    bl_actuals = np.array(bl_actuals)
    bl_rmse = np.sqrt(np.mean((bl_preds - bl_actuals) ** 2))
    bl_mae = np.mean(np.abs(bl_preds - bl_actuals))

    elapsed = time.time() - start_time

    print(f"\n🔍 Explicit CF Results (Real Data):")
    print(f"   • Users evaluated: {evaluated}")
    print(f"   • Cold-start: {cold_start}")
    print(f"   • RMSE: {rmse:.4f}")
    print(f"   • MAE:  {mae:.4f}")

    print(f"\n🔍 Baseline (User Mean):")
    print(f"   • RMSE: {bl_rmse:.4f}")
    print(f"   • MAE:  {bl_mae:.4f}")

    rmse_imp = (bl_rmse - rmse) / bl_rmse * 100 if bl_rmse > 0 else 0
    mae_imp = (bl_mae - mae) / bl_mae * 100 if bl_mae > 0 else 0

    report = {
        "timestamp": datetime.now().isoformat(),
        "evaluation_type": "explicit_cf_real",
        "data_source": "database",
        "database_url": DB_URL.split("@")[-1] if "@" in DB_URL else DB_URL,
        "execution_time_seconds": round(elapsed, 2),
        "data_stats": {
            "total_ratings": len(interactions),
            "rating_distribution": {str(k): v for k, v in sorted(rating_dist.items())},
            "unique_users": len(set(i['userId'] for i in interactions)),
            "unique_hotels": len(set(i['hotelId'] for i in interactions)),
            "train_count": len(train_interactions),
            "test_count": len(test_interactions),
        },
        "matrix_stats": {
            "shape": [len(users), len(hotels)],
            "sparsity_pct": round(sparsity, 2),
        },
        "cf_results": {
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
        },
        "baseline_results": {
            "rmse": round(bl_rmse, 4),
            "mae": round(bl_mae, 4),
        },
        "improvement_pct": {
            "rmse": round(rmse_imp, 2),
            "mae": round(mae_imp, 2),
        },
    }

    save_report(report, "real_explicit_cf_report.json")

    # Save to DB
    save_to_system_metrics(engine, {
        "rmse": rmse,
        "mae": mae,
        "precision_at_k": 0,
        "recall_at_k": 0,
        "ndcg_at_k": 0,
        "baseline_rmse": bl_rmse,
        "baseline_mae": bl_mae,
        "baseline_precision": 0,
        "baseline_recall": 0,
        "baseline_ndcg": 0,
        "algorithm": "User-CF (Explicit - Pearson)",
        "dataset_size": len(interactions),
        "execution_time_ms": int(elapsed * 1000),
    })

    return report


# ---------------------------------------------------------
# SYSTEM C: SVD MODEL EVALUATION (Real Data)
# ---------------------------------------------------------

def evaluate_svd(engine):
    """Evaluate trained SVD model on real database data"""
    print("\n" + "=" * 70)
    print("🟣 SYSTEM C: SVD MODEL EVALUATION (REAL DATABASE)")
    print("=" * 70)

    start_time = time.time()

    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        print(f"❌ SVD model not found at {MODEL_PATH}")
        print("   → Run 'uv run train_real.py' first to train the model")
        return None

    # Load model
    print("\n[1/4] Loading SVD model...")
    with open(MODEL_PATH, "rb") as f:
        algo = pickle.load(f)
    print(f"   ✅ Model loaded: {type(algo).__name__}")

    # Load data
    interactions_raw = load_interactions_from_db(engine)
    reviews = load_reviews_from_db(engine)

    if not interactions_raw and not reviews:
        print("❌ No data available")
        return None

    # Prepare data (same logic as train_real.py)
    print("\n[2/4] Preparing rating data...")

    def calculate_score(row_type, rating):
        if rating:
            return float(rating)
        if row_type == 'BOOK':
            return 5
        if row_type == 'CLICK_BOOK_NOW':
            return 4
        if row_type == 'LIKE':
            return 3
        if row_type == 'VIEW':
            return 1
        return 1

    records = []
    rating_map = {}  # (userId, hotelId) -> score

    for inter in interactions_raw:
        key = (inter['userId'], inter['hotelId'])
        score = calculate_score(inter['type'], inter.get('rating'))
        rating_map[key] = score

    # Override with explicit reviews
    for rev in reviews:
        if rev['rating'] > 0:
            key = (rev['userId'], rev['hotelId'])
            rating_map[key] = float(rev['rating'])

    records = [{"userId": k[0], "hotelId": k[1], "score": v} for k, v in rating_map.items()]
    df = pd.DataFrame(records)

    print(f"   ✅ {len(df)} unique (user, hotel) pairs")

    if len(df) < 10:
        print("❌ Too few records for evaluation")
        return None

    # Evaluate using cross-validation approach
    print("\n[3/4] Evaluating SVD predictions on test set...")

    # Split data temporally
    df_sorted = df.sort_values(by='score')  # Simple split for SVD eval
    n = len(df)
    n_train = int(n * 0.8)
    df_train = df_sorted.iloc[:n_train]
    df_test = df_sorted.iloc[n_train:]

    # Train SVD on train split
    from surprise import Dataset, Reader
    from surprise.model_selection import cross_validate as svd_cross_validate

    reader = Reader(rating_scale=(1, 5))
    train_data = Dataset.load_from_df(df_train[['userId', 'hotelId', 'score']], reader)

    # Cross-validation on full data
    print("   Running 5-fold cross-validation...")
    cv_results = svd_cross_validate(algo, train_data, measures=['rmse', 'mae'], cv=5, verbose=False)

    cv_rmse = np.mean(cv_results['test_rmse'])
    cv_mae = np.mean(cv_results['test_mae'])

    # Evaluate on held-out test set
    predictions = []
    actuals = []

    for _, row in df_test.iterrows():
        pred = algo.predict(row['userId'], row['hotelId'])
        predictions.append(pred.est)
        actuals.append(row['score'])

    predictions = np.array(predictions)
    actuals = np.array(actuals)

    test_rmse = np.sqrt(np.mean((predictions - actuals) ** 2))
    test_mae = np.mean(np.abs(predictions - actuals))

    # Baseline: global mean
    global_mean = df_train['score'].mean()
    bl_preds = np.full_like(actuals, global_mean)
    bl_rmse = np.sqrt(np.mean((bl_preds - actuals) ** 2))
    bl_mae = np.mean(np.abs(bl_preds - actuals))

    elapsed = time.time() - start_time

    print(f"\n🔍 SVD Model Results (Real Data):")
    print(f"   ┌──────────────────────────────────────────────┐")
    print(f"   │ Metric       │ SVD Model │ Baseline │ Improve │")
    print(f"   ├──────────────────────────────────────────────┤")
    print(f"   │ CV RMSE      │ {cv_rmse:.4f}   │    -     │    -    │")
    print(f"   │ CV MAE       │ {cv_mae:.4f}   │    -     │    -    │")
    print(f"   │ Test RMSE    │ {test_rmse:.4f}   │ {bl_rmse:.4f}  │ {(bl_rmse - test_rmse) / bl_rmse * 100:+.1f}%  │")
    print(f"   │ Test MAE     │ {test_mae:.4f}   │ {bl_mae:.4f}  │ {(bl_mae - test_mae) / bl_mae * 100:+.1f}%  │")
    print(f"   └──────────────────────────────────────────────┘")

    report = {
        "timestamp": datetime.now().isoformat(),
        "evaluation_type": "svd_model_real",
        "data_source": "database",
        "database_url": DB_URL.split("@")[-1] if "@" in DB_URL else DB_URL,
        "execution_time_seconds": round(elapsed, 2),
        "model_type": type(algo).__name__,
        "data_stats": {
            "total_records": len(df),
            "train_count": len(df_train),
            "test_count": len(df_test),
            "unique_users": df['userId'].nunique(),
            "unique_hotels": df['hotelId'].nunique(),
        },
        "cross_validation": {
            "cv_rmse": round(cv_rmse, 4),
            "cv_mae": round(cv_mae, 4),
            "folds": 5,
        },
        "test_results": {
            "rmse": round(test_rmse, 4),
            "mae": round(test_mae, 4),
        },
        "baseline_results": {
            "rmse": round(bl_rmse, 4),
            "mae": round(bl_mae, 4),
            "global_mean": round(global_mean, 4),
        },
        "improvement_pct": {
            "rmse": round((bl_rmse - test_rmse) / bl_rmse * 100, 2) if bl_rmse > 0 else 0,
            "mae": round((bl_mae - test_mae) / bl_mae * 100, 2) if bl_mae > 0 else 0,
        },
    }

    save_report(report, "real_svd_evaluation_report.json")

    # Save to DB
    save_to_system_metrics(engine, {
        "rmse": test_rmse,
        "mae": test_mae,
        "precision_at_k": 0,
        "recall_at_k": 0,
        "ndcg_at_k": 0,
        "baseline_rmse": bl_rmse,
        "baseline_mae": bl_mae,
        "baseline_precision": 0,
        "baseline_recall": 0,
        "baseline_ndcg": 0,
        "algorithm": "SVD (Optimized)",
        "dataset_size": len(df),
        "execution_time_ms": int(elapsed * 1000),
    })

    return report


# ---------------------------------------------------------
# COMBINED SUMMARY
# ---------------------------------------------------------

def save_combined_summary(implicit_report, explicit_report, svd_report):
    """Save a combined summary report with all evaluation results"""
    ensure_analytics_dir()

    summary = {
        "timestamp": datetime.now().isoformat(),
        "title": "Real Database Evaluation Summary",
        "data_source": "PostgreSQL Database",
        "database": DB_URL.split("@")[-1] if "@" in DB_URL else DB_URL,
        "evaluations": {}
    }

    if implicit_report:
        summary["evaluations"]["implicit_cf"] = {
            "status": "completed",
            "cf_results": implicit_report.get("cf_results", {}),
            "baseline_results": implicit_report.get("baseline_results", {}),
            "improvement": implicit_report.get("improvement_pct", {}),
            "data_size": implicit_report.get("data_stats", {}).get("total_interactions", 0),
        }

    if explicit_report:
        summary["evaluations"]["explicit_cf"] = {
            "status": "completed",
            "cf_results": explicit_report.get("cf_results", {}),
            "baseline_results": explicit_report.get("baseline_results", {}),
            "improvement": explicit_report.get("improvement_pct", {}),
            "data_size": explicit_report.get("data_stats", {}).get("total_ratings", 0),
        }

    if svd_report:
        summary["evaluations"]["svd_model"] = {
            "status": "completed",
            "cv_results": svd_report.get("cross_validation", {}),
            "test_results": svd_report.get("test_results", {}),
            "baseline_results": svd_report.get("baseline_results", {}),
            "improvement": svd_report.get("improvement_pct", {}),
            "data_size": svd_report.get("data_stats", {}).get("total_records", 0),
        }

    # Print summary table
    print("\n" + "=" * 70)
    print("📊 COMBINED EVALUATION SUMMARY")
    print("=" * 70)

    if implicit_report:
        cf = implicit_report.get("cf_results", {})
        print(f"\n  🔵 Implicit CF (Ranking):")
        print(f"     Precision@{K_RECOMMENDATIONS}: {cf.get('precision_at_k', 0):.4f}")
        print(f"     Recall@{K_RECOMMENDATIONS}:    {cf.get('recall_at_k', 0):.4f}")
        print(f"     NDCG@{K_RECOMMENDATIONS}:       {cf.get('ndcg_at_k', 0):.4f}")

    if explicit_report:
        cf = explicit_report.get("cf_results", {})
        print(f"\n  🟢 Explicit CF (Rating Prediction):")
        print(f"     RMSE: {cf.get('rmse', 0):.4f}")
        print(f"     MAE:  {cf.get('mae', 0):.4f}")

    if svd_report:
        test = svd_report.get("test_results", {})
        cv = svd_report.get("cross_validation", {})
        print(f"\n  🟣 SVD Model:")
        print(f"     CV RMSE:   {cv.get('cv_rmse', 0):.4f}")
        print(f"     Test RMSE: {test.get('rmse', 0):.4f}")
        print(f"     Test MAE:  {test.get('mae', 0):.4f}")

    output_path = os.path.join(ANALYTICS_DIR, "real_evaluation_summary.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False, default=str)
    print(f"\n📄 Combined summary saved to: {output_path}")

    return summary


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Real Database Recommendation Evaluation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run evaluate_real.py --mode implicit
  uv run evaluate_real.py --mode explicit
  uv run evaluate_real.py --mode svd
  uv run evaluate_real.py --mode all
        """
    )

    parser.add_argument(
        "--mode",
        choices=["implicit", "explicit", "svd", "all"],
        default="all",
        help="Evaluation mode (default: all)"
    )

    parser.add_argument(
        "--db-url",
        default=None,
        help="Database URL (overrides DATABASE_URL env var)"
    )

    args = parser.parse_args()

    global DB_URL
    if args.db_url:
        DB_URL = args.db_url

    print("\n" + "=" * 70)
    print("🚀 REAL DATABASE RECOMMENDATION EVALUATION")
    print("=" * 70)
    print(f"   Database: {DB_URL.split('@')[-1] if '@' in DB_URL else DB_URL}")
    print(f"   Mode: {args.mode}")
    print(f"   Time: {datetime.now().isoformat()}")

    engine = get_engine()

    # Test connection
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM interactions"))
            count = result.scalar()
            print(f"   ✅ Connected! {count} interactions in DB")
    except Exception as e:
        print(f"   ❌ Database connection failed: {e}")
        print("   → Check your DATABASE_URL or database status")
        return

    implicit_report = None
    explicit_report = None
    svd_report = None

    if args.mode in ["implicit", "all"]:
        implicit_report = evaluate_implicit(engine)

    if args.mode in ["explicit", "all"]:
        explicit_report = evaluate_explicit(engine)

    if args.mode in ["svd", "all"]:
        svd_report = evaluate_svd(engine)

    if args.mode == "all":
        save_combined_summary(implicit_report, explicit_report, svd_report)

    print("\n" + "=" * 70)
    print("✅ EVALUATION COMPLETED")
    print("=" * 70)
    print(f"   Reports saved to: {ANALYTICS_DIR}/")
    print(f"   Metrics saved to: SystemMetric table in DB")


if __name__ == "__main__":
    main()