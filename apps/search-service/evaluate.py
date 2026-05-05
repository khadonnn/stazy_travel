#!/usr/bin/env python3
"""
DUAL-FEEDBACK COLLABORATIVE FILTERING EVALUATION FRAMEWORK
============================================================
Evaluates both implicit and explicit feedback systems separately.

System A: Implicit CF (interactions) → Ranking metrics (Precision@K, Recall@K, NDCG@K)
System B: Explicit CF (ratings) → Rating prediction metrics (RMSE, MAE)

Usage:
  uv run evaluate.py --mode implicit
  uv run evaluate.py --mode explicit
  uv run evaluate.py --mode all
"""

import json
import os
import sys
import argparse
from datetime import datetime
from collections import defaultdict
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_DIR = os.path.join(BASE_DIR, "jsons")

INTERACTIONS_FILE = os.path.join(JSON_DIR, "__interactions.json")
REVIEWS_FILE = os.path.join(JSON_DIR, "__reviews.json")
USERS_FILE = os.path.join(JSON_DIR, "__users.json")
HOTELS_FILE = os.path.join(JSON_DIR, "__homeStay.json")

# CF Parameters
K_NEIGHBORS = 5
K_RECOMMENDATIONS = 5

# ---------------------------------------------------------
# SHARED UTILITIES
# ---------------------------------------------------------

def load_json(filepath):
    """Load JSON file"""
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def save_report(report, filename):
    """Save evaluation report to JSON"""
    output_path = os.path.join(BASE_DIR, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"📄 Report saved to: {output_path}")
    return output_path

def temporal_split(data, train_pct=0.6, val_pct=0.2):
    """Temporal split: train/val/test"""
    data = sorted(data, key=lambda x: x.get('timestamp', x.get('createdAt', '')))
    n = len(data)
    n_train = int(n * train_pct)
    n_val = int(n * val_pct)
    
    train = data[:n_train]
    val = data[n_train:n_train+n_val]
    test = data[n_train+n_val:]
    
    return train, val, test

def build_user_item_matrix(interactions, user_ids, hotel_ids):
    """Build user-item matrix from interactions"""
    user_to_idx = {uid: idx for idx, uid in enumerate(user_ids)}
    item_to_idx = {hid: idx for idx, hid in enumerate(hotel_ids)}
    
    matrix = pd.DataFrame(
        np.nan,
        index=user_ids,
        columns=hotel_ids
    )
    
    for inter in interactions:
        uid = inter.get('userId')
        hid = inter.get('hotelId')
        value = inter.get('value')
        
        if uid in user_to_idx and hid in item_to_idx:
            # Aggregate if duplicate
            if pd.isna(matrix.loc[uid, hid]):
                matrix.loc[uid, hid] = value
            else:
                matrix.loc[uid, hid] = (matrix.loc[uid, hid] + value) / 2
    
    return matrix

def compute_ndcg(predicted_items, relevant_items, k=5):
    """Compute NDCG@K"""
    predicted_at_k = predicted_items[:k]
    relevant_set = set(relevant_items)
    
    # DCG: sum of relevance / log(position+1)
    dcg = sum([1.0 / np.log2(i + 2) for i, item in enumerate(predicted_at_k) if item in relevant_set])
    
    # IDCG: perfect ranking
    idcg = sum([1.0 / np.log2(i + 2) for i in range(min(k, len(relevant_set)))])
    
    return dcg / idcg if idcg > 0 else 0.0

# ---------------------------------------------------------
# SYSTEM A: IMPLICIT CF EVALUATION
# ---------------------------------------------------------

def evaluate_implicit():
    """Evaluate implicit feedback system"""
    print("\n" + "="*70)
    print("🔵 SYSTEM A: IMPLICIT COLLABORATIVE FILTERING (RANKING)")
    print("="*70)
    
    print("\n[1/7] Loading data...")
    interactions_raw = load_json(INTERACTIONS_FILE)
    users_raw = load_json(USERS_FILE)
    hotels_raw = load_json(HOTELS_FILE)
    
    if not all([interactions_raw, users_raw, hotels_raw]):
        print("❌ Missing data files")
        return None
    
    users = [u['id'] for u in users_raw]
    hotels = [h['id'] for h in hotels_raw]
    
    print(f"   ✅ Loaded {len(interactions_raw)} interactions")
    print(f"   ✅ Loaded {len(users)} users, {len(hotels)} hotels")
    
    # ---------------------------------------------------------
    # STEP 2: CONVERT IMPLICIT SIGNALS TO RATINGS
    # ---------------------------------------------------------
    print("\n[2/7] Converting implicit signals to ratings...")
    
    signal_weights = {
        "CLICK_BOOK_NOW": 2.0,
        "ADD_TO_WISHLIST": 3.0,
        "BOOK": 5.0
    }
    
    interactions = []
    for inter in interactions_raw:
        signal_type = inter.get('type')
        if signal_type not in signal_weights:
            continue
        
        rating = signal_weights[signal_type]
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
    
    print("   📊 Signal distribution:")
    for signal, count in sorted(signal_counts.items()):
        pct = count / len(interactions) * 100
        print(f"      {signal}: {count} ({pct:.1f}%)")
    
    # ---------------------------------------------------------
    # STEP 3: VALIDATE DATA INTEGRITY
    # ---------------------------------------------------------
    print("\n[3/7] Validating data integrity...")
    
    invalid_count = 0
    for inter in interactions:
        if inter['userId'] not in users or inter['hotelId'] not in hotels:
            invalid_count += 1
    
    print(f"   ✅ Valid interactions: {len(interactions) - invalid_count}/{len(interactions)}")
    print(f"   ⚠️  Invalid interactions removed: {invalid_count}")
    print(f"   📊 Unique users: {len(set(u['userId'] for u in interactions))}, "
          f"Unique hotels: {len(set(u['hotelId'] for u in interactions))}")
    
    # ---------------------------------------------------------
    # STEP 4: TEMPORAL SPLIT
    # ---------------------------------------------------------
    print("\n[4/7] Splitting data (temporal split)...")
    
    train_interactions, val_interactions, test_interactions = temporal_split(interactions)
    
    print(f"   ✅ Train set: {len(train_interactions)} ({len(train_interactions)/len(interactions)*100:.1f}%)")
    print(f"   ✅ Val set: {len(val_interactions)} ({len(val_interactions)/len(interactions)*100:.1f}%)")
    print(f"   ✅ Test set: {len(test_interactions)} ({len(test_interactions)/len(interactions)*100:.1f}%)")
    
    # ---------------------------------------------------------
    # STEP 5: BUILD MATRICES
    # ---------------------------------------------------------
    print("\n[5/7] Building user-item matrices...")
    
    train_matrix = build_user_item_matrix(train_interactions, users, hotels)
    test_matrix = build_user_item_matrix(test_interactions, users, hotels)
    
    sparsity_train = train_matrix.isna().sum().sum() / (len(users) * len(hotels)) * 100
    
    print(f"   ✅ Train matrix shape: ({len(users)}, {len(hotels)}) (sparsity: {sparsity_train:.1f}%)")
    print(f"   ✅ Test matrix shape: ({len(users)}, {len(hotels)})")
    print(f"   📊 Train users: {len(train_matrix.dropna(how='all').index)}, "
          f"Test users: {len(test_matrix.dropna(how='all').index)}")
    
    # ---------------------------------------------------------
    # STEP 6: TRAIN CF MODEL (USER-USER SIMILARITY)
    # ---------------------------------------------------------
    print("\n[6/7] Training implicit CF model...")
    
    # Fill NaN with 0 for cosine similarity
    train_matrix_filled = train_matrix.fillna(0)
    
    # Compute user-user cosine similarity
    user_similarity_matrix = cosine_similarity(train_matrix_filled.values)
    user_similarity_df = pd.DataFrame(
        user_similarity_matrix,
        index=train_matrix.index,
        columns=train_matrix.index
    )
    
    print(f"✅ CF Model trained. User-Similarity shape: {user_similarity_df.shape}")
    
    # Baseline: top popular items
    train_matrix_for_popularity = train_matrix.fillna(0)
    item_popularity = train_matrix_for_popularity.sum(axis=0).sort_values(ascending=False)
    top_items = item_popularity.head(K_RECOMMENDATIONS).index.tolist()
    
    print(f"📊 Top-{K_RECOMMENDATIONS} popular hotels: {top_items}")
    
    # ---------------------------------------------------------
    # STEP 7: EVALUATE ON TEST SET
    # ---------------------------------------------------------
    print("\n[7/7] Evaluating on test set...")
    
    # Get test interactions grouped by user
    test_by_user = defaultdict(list)
    for inter in test_interactions:
        test_by_user[inter['userId']].append(inter['hotelId'])
    
    cf_precisions = []
    cf_recalls = []
    cf_ndcgs = []
    baseline_precisions = []
    baseline_recalls = []
    baseline_ndcgs = []
    
    evaluated_users = 0
    cold_start_users = 0
    
    for user_id in users:
        test_items = set(test_by_user.get(user_id, []))
        if not test_items:
            continue
        
        # Check if user in training data
        if user_id not in train_matrix.index:
            cold_start_users += 1
            continue
        
        evaluated_users += 1
        
        # ===== CF PREDICTIONS =====
        # Get similar users
        user_similarities = user_similarity_df.loc[user_id].drop(user_id)
        top_similar_users = user_similarities.nlargest(K_NEIGHBORS).index
        
        # Aggregate recommendations from similar users
        recommendations_scores = defaultdict(float)
        for similar_user in top_similar_users:
            similarity = user_similarities[similar_user]
            user_items = train_matrix.loc[similar_user]
            user_rated = user_items.dropna()
            
            for item, rating in user_rated.items():
                if item not in train_matrix.loc[user_id].dropna().index:
                    recommendations_scores[item] += similarity * rating
        
        cf_recommendations = sorted(recommendations_scores.items(), key=lambda x: x[1], reverse=True)
        cf_rec_items = [item for item, score in cf_recommendations[:K_RECOMMENDATIONS]]
        
        # ===== BASELINE PREDICTIONS =====
        baseline_rec_items = top_items.copy()
        
        # ===== COMPUTE METRICS =====
        # CF metrics
        cf_precision = len([item for item in cf_rec_items if item in test_items]) / len(cf_rec_items) if cf_rec_items else 0
        cf_recall = len([item for item in cf_rec_items if item in test_items]) / len(test_items) if test_items else 0
        cf_ndcg = compute_ndcg(cf_rec_items, list(test_items), k=K_RECOMMENDATIONS)
        
        cf_precisions.append(cf_precision)
        cf_recalls.append(cf_recall)
        cf_ndcgs.append(cf_ndcg)
        
        # Baseline metrics
        baseline_precision = len([item for item in baseline_rec_items if item in test_items]) / len(baseline_rec_items)
        baseline_recall = len([item for item in baseline_rec_items if item in test_items]) / len(test_items) if test_items else 0
        baseline_ndcg = compute_ndcg(baseline_rec_items, list(test_items), k=K_RECOMMENDATIONS)
        
        baseline_precisions.append(baseline_precision)
        baseline_recalls.append(baseline_recall)
        baseline_ndcgs.append(baseline_ndcg)
    
    # ---------------------------------------------------------
    # RESULTS
    # ---------------------------------------------------------
    print(f"\n🔍 Evaluating CF Model...")
    print(f"   • Users evaluated: {evaluated_users}")
    print(f"   • Cold-start users: {cold_start_users}")
    
    cf_avg_precision = np.mean(cf_precisions) if cf_precisions else 0
    cf_avg_recall = np.mean(cf_recalls) if cf_recalls else 0
    cf_avg_ndcg = np.mean(cf_ndcgs) if cf_ndcgs else 0
    
    print(f"   • Precision@{K_RECOMMENDATIONS}: {cf_avg_precision:.4f}")
    print(f"   • Recall@{K_RECOMMENDATIONS}: {cf_avg_recall:.4f}")
    print(f"   • NDCG@{K_RECOMMENDATIONS}: {cf_avg_ndcg:.4f}")
    
    print(f"\n🔍 Evaluating Baseline Model...")
    baseline_avg_precision = np.mean(baseline_precisions) if baseline_precisions else 0
    baseline_avg_recall = np.mean(baseline_recalls) if baseline_recalls else 0
    baseline_avg_ndcg = np.mean(baseline_ndcgs) if baseline_ndcgs else 0
    
    print(f"   • Precision@{K_RECOMMENDATIONS}: {baseline_avg_precision:.4f}")
    print(f"   • Recall@{K_RECOMMENDATIONS}: {baseline_avg_recall:.4f}")
    print(f"   • NDCG@{K_RECOMMENDATIONS}: {baseline_avg_ndcg:.4f}")
    
    # Calculate improvements
    precision_improvement = (cf_avg_precision - baseline_avg_precision) / baseline_avg_precision * 100 if baseline_avg_precision > 0 else 0
    recall_improvement = (cf_avg_recall - baseline_avg_recall) / baseline_avg_recall * 100 if baseline_avg_recall > 0 else 0
    ndcg_improvement = (cf_avg_ndcg - baseline_avg_ndcg) / baseline_avg_ndcg * 100 if baseline_avg_ndcg > 0 else 0
    
    # ---------------------------------------------------------
    # SAVE REPORT
    # ---------------------------------------------------------
    report_implicit = {
        "timestamp": datetime.now().isoformat(),
        "system": "Implicit CF (Ranking)",
        "data_stats": {
            "total_interactions": len(interactions),
            "signal_distribution": dict(signal_counts),
            "train_count": len(train_interactions),
            "test_count": len(test_interactions)
        },
        "matrix_stats": {
            "train_shape": [len(users), len(hotels)],
            "sparsity_pct": round(sparsity_train, 2)
        },
        "cf_results": {
            "precision_at_k": round(cf_avg_precision, 4),
            "recall_at_k": round(cf_avg_recall, 4),
            "ndcg_at_k": round(cf_avg_ndcg, 4)
        },
        "baseline_results": {
            "precision_at_k": round(baseline_avg_precision, 4),
            "recall_at_k": round(baseline_avg_recall, 4),
            "ndcg_at_k": round(baseline_avg_ndcg, 4)
        },
        "improvement_pct": {
            "precision": round(precision_improvement, 2),
            "recall": round(recall_improvement, 2),
            "ndcg": round(ndcg_improvement, 2)
        }
    }
    
    save_report(report_implicit, "implicit_cf_evaluation_report.json")
    
    return report_implicit

# ---------------------------------------------------------
# SYSTEM B: EXPLICIT CF EVALUATION
# ---------------------------------------------------------

def evaluate_explicit():
    """Evaluate explicit feedback system (rating prediction)"""
    print("\n" + "="*70)
    print("🟢 SYSTEM B: EXPLICIT COLLABORATIVE FILTERING (RATING PREDICTION)")
    print("="*70)
    
    print("\n[1/6] Loading data...")
    reviews_raw = load_json(REVIEWS_FILE)
    users_raw = load_json(USERS_FILE)
    hotels_raw = load_json(HOTELS_FILE)
    
    if not all([reviews_raw, users_raw, hotels_raw]):
        print("❌ Missing data files")
        return None
    
    users = [u['id'] for u in users_raw]
    hotels = [h['id'] for h in hotels_raw]
    
    print(f"   ✅ Loaded {len(reviews_raw)} reviews")
    print(f"   ✅ Loaded {len(users)} users, {len(hotels)} hotels")
    
    # ---------------------------------------------------------
    # STEP 2: PREPARE RATING DATA
    # ---------------------------------------------------------
    print("\n[2/6] Preparing explicit rating data...")
    
    interactions = []
    for review in reviews_raw:
        interactions.append({
            'userId': review['userId'],
            'hotelId': review['hotelId'],
            'value': review['rating'],
            'timestamp': review.get('createdAt', ''),
            'bookingId': review.get('bookingId', '')
        })
    
    print(f"   ✅ Prepared {len(interactions)} ratings")
    
    rating_dist = defaultdict(int)
    for inter in interactions:
        rating_dist[inter['value']] += 1
    
    print("   📊 Rating distribution:")
    for rating in sorted(rating_dist.keys()):
        count = rating_dist[rating]
        pct = count / len(interactions) * 100
        print(f"      {rating}⭐: {count} ({pct:.1f}%)")
    
    # ---------------------------------------------------------
    # STEP 3: VALIDATE DATA
    # ---------------------------------------------------------
    print("\n[3/6] Validating data...")
    
    invalid_count = 0
    for inter in interactions:
        if inter['userId'] not in users or inter['hotelId'] not in hotels:
            invalid_count += 1
    
    print(f"   ✅ Valid ratings: {len(interactions) - invalid_count}/{len(interactions)}")
    print(f"   📊 Unique users: {len(set(u['userId'] for u in interactions))}, "
          f"Unique hotels: {len(set(u['hotelId'] for u in interactions))}")
    
    # ---------------------------------------------------------
    # STEP 4: TEMPORAL SPLIT
    # ---------------------------------------------------------
    print("\n[4/6] Splitting data (temporal split)...")
    
    train_interactions, val_interactions, test_interactions = temporal_split(interactions)
    
    print(f"   ✅ Train set: {len(train_interactions)} ({len(train_interactions)/len(interactions)*100:.1f}%)")
    print(f"   ✅ Val set: {len(val_interactions)} ({len(val_interactions)/len(interactions)*100:.1f}%)")
    print(f"   ✅ Test set: {len(test_interactions)} ({len(test_interactions)/len(interactions)*100:.1f}%)")
    
    # ---------------------------------------------------------
    # STEP 5: BUILD MATRICES & TRAIN CF
    # ---------------------------------------------------------
    print("\n[5/6] Building rating matrices and training CF...")
    
    train_matrix = build_user_item_matrix(train_interactions, users, hotels)
    test_matrix = build_user_item_matrix(test_interactions, users, hotels)
    
    sparsity_train = train_matrix.isna().sum().sum() / (len(users) * len(hotels)) * 100
    
    print(f"   ✅ Train matrix shape: ({len(users)}, {len(hotels)}) (sparsity: {sparsity_train:.1f}%)")
    
    # Compute user similarity
    train_matrix_filled = train_matrix.fillna(0)
    user_similarity_matrix = cosine_similarity(train_matrix_filled.values)
    user_similarity_df = pd.DataFrame(
        user_similarity_matrix,
        index=train_matrix.index,
        columns=train_matrix.index
    )
    
    print(f"✅ CF Model trained. User-Similarity shape: {user_similarity_df.shape}")
    
    # ---------------------------------------------------------
    # STEP 6: EVALUATE ON TEST SET
    # ---------------------------------------------------------
    print("\n[6/6] Evaluating on test set...")
    
    predictions = []
    actuals = []
    
    evaluated_users = 0
    cold_start_users = 0
    
    for inter in test_interactions:
        user_id = inter['userId']
        hotel_id = inter['hotelId']
        actual_rating = inter['value']
        
        # Check if user in training data
        if user_id not in train_matrix.index:
            cold_start_users += 1
            continue
        
        evaluated_users += 1
        
        # Get similar users
        if user_id not in user_similarity_df.index:
            predicted_rating = 3.0  # default
        else:
            user_similarities = user_similarity_df.loc[user_id].drop(user_id)
            top_similar_users = user_similarities.nlargest(K_NEIGHBORS).index
            
            # Get user mean for bias correction
            user_mean = train_matrix.loc[user_id].mean()
            
            # Weighted average from similar users
            weighted_sum = 0.0
            similarity_sum = 0.0
            
            for similar_user in top_similar_users:
                similarity = user_similarities[similar_user]
                if similarity <= 0:
                    continue
                
                similar_user_mean = train_matrix.loc[similar_user].mean()
                rating = train_matrix.loc[similar_user, hotel_id]
                
                if pd.notna(rating):
                    # Deviation from similar user's mean
                    deviation = rating - similar_user_mean
                    weighted_sum += similarity * deviation
                    similarity_sum += similarity
            
            # Predicted rating = user_mean + weighted_deviations
            if similarity_sum > 0:
                predicted_rating = user_mean + (weighted_sum / similarity_sum)
                predicted_rating = max(1.0, min(5.0, predicted_rating))
            else:
                predicted_rating = user_mean if pd.notna(user_mean) else 3.0
        
        predictions.append(predicted_rating)
        actuals.append(actual_rating)
    
    # Compute metrics
    predictions = np.array(predictions)
    actuals = np.array(actuals)
    
    rmse = np.sqrt(np.mean((predictions - actuals) ** 2))
    mae = np.mean(np.abs(predictions - actuals))
    
    print(f"\n🔍 Explicit CF Results (Rating Prediction):")
    print(f"   • Users evaluated: {evaluated_users}")
    print(f"   • Cold-start users: {cold_start_users}")
    print(f"   • RMSE: {rmse:.4f}")
    print(f"   • MAE: {mae:.4f}")
    
    # Baseline: predict user mean
    user_means = []
    baseline_predictions = []
    
    for inter in test_interactions:
        user_id = inter['userId']
        if user_id in train_matrix.index:
            user_mean = train_matrix.loc[user_id].mean()
            if pd.notna(user_mean):
                user_means.append(user_mean)
                baseline_predictions.append(user_mean)
            else:
                baseline_predictions.append(3.0)
        else:
            baseline_predictions.append(3.0)
    
    baseline_predictions = np.array(baseline_predictions[:len(actuals)])
    baseline_rmse = np.sqrt(np.mean((baseline_predictions - actuals[:len(baseline_predictions)]) ** 2))
    baseline_mae = np.mean(np.abs(baseline_predictions - actuals[:len(baseline_predictions)]))
    
    print(f"\n🔍 Baseline (User Mean) Results:")
    print(f"   • RMSE: {baseline_rmse:.4f}")
    print(f"   • MAE: {baseline_mae:.4f}")
    
    # Calculate improvements
    rmse_improvement = (baseline_rmse - rmse) / baseline_rmse * 100 if baseline_rmse > 0 else 0
    mae_improvement = (baseline_mae - mae) / baseline_mae * 100 if baseline_mae > 0 else 0
    
    # ---------------------------------------------------------
    # SAVE REPORT
    # ---------------------------------------------------------
    report_explicit = {
        "timestamp": datetime.now().isoformat(),
        "system": "Explicit CF (Rating Prediction)",
        "data_stats": {
            "total_ratings": len(interactions),
            "rating_distribution": dict(rating_dist),
            "train_count": len(train_interactions),
            "test_count": len(test_interactions)
        },
        "matrix_stats": {
            "train_shape": [len(users), len(hotels)],
            "sparsity_pct": round(sparsity_train, 2)
        },
        "cf_results": {
            "rmse": round(rmse, 4),
            "mae": round(mae, 4)
        },
        "baseline_results": {
            "rmse": round(baseline_rmse, 4),
            "mae": round(baseline_mae, 4)
        },
        "improvement_pct": {
            "rmse": round(rmse_improvement, 2),
            "mae": round(mae_improvement, 2)
        }
    }
    
    save_report(report_explicit, "explicit_cf_evaluation_report.json")
    
    return report_explicit

# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Dual-Feedback Collaborative Filtering Evaluation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run evaluate.py --mode implicit
  uv run evaluate.py --mode explicit
  uv run evaluate.py --mode all
        """
    )
    
    parser.add_argument(
        "--mode",
        choices=["implicit", "explicit", "all"],
        default="all",
        help="Evaluation mode (default: all)"
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*70)
    print("🚀 DUAL-FEEDBACK COLLABORATIVE FILTERING EVALUATION")
    print("="*70)
    
    results = {}
    
    if args.mode in ["implicit", "all"]:
        results["implicit"] = evaluate_implicit()
    
    if args.mode in ["explicit", "all"]:
        results["explicit"] = evaluate_explicit()
    
    print("\n" + "="*70)
    print("✅ EVALUATION COMPLETED")
    print("="*70)
    
    if args.mode == "all":
        print("\n📊 COMPARISON SUMMARY")
        print("-" * 70)
        print("System A (Implicit): Ranking metrics (Precision, Recall, NDCG)")
        print("System B (Explicit): Prediction metrics (RMSE, MAE)")
        print("\n💡 Both systems evaluate different aspects of recommendation quality.")
        print("   - Use implicit CF results for ranking performance")
        print("   - Use explicit CF results for rating prediction accuracy")

if __name__ == "__main__":
    main()
