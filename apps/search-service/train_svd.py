# train_svd.py
# SVD Training with Hyperparameter Tuning on Mock JSON Data
# Usage: uv run train_svd.py

import os
import json
import pickle
import numpy as np
import pandas as pd
from surprise import Dataset, Reader, SVD, SVDpp
from surprise.model_selection import GridSearchCV, cross_validate
from collections import defaultdict
from datetime import datetime

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_DIR = os.path.join(BASE_DIR, "jsons")

INTERACTIONS_FILE = os.path.join(JSON_DIR, "__interactions.json")
REVIEWS_FILE = os.path.join(JSON_DIR, "__reviews.json")
MODEL_OUTPUT = os.path.join(JSON_DIR, "recsys_model.pkl")
METRICS_OUTPUT = os.path.join(JSON_DIR, "svd_training_report.json")

# ---------------------------------------------------------
# 1. LOAD DATA
# ---------------------------------------------------------
def load_json(filepath):
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def prepare_training_data():
    """
    Convert interactions + reviews into unified rating DataFrame.
    Combines implicit signals (weighted) with explicit ratings.
    """
    print("\n[1/5] Loading data...")
    
    interactions_raw = load_json(INTERACTIONS_FILE)
    reviews_raw = load_json(REVIEWS_FILE)
    
    if not interactions_raw:
        print("❌ No interactions file found!")
        return None
    
    # Implicit signal weights (aligned with evaluate.py)
    signal_weights = {
        "CLICK_BOOK_NOW": 2.0,
        "ADD_TO_WISHLIST": 3.0,
        "BOOK": 5.0
    }
    
    # Collect implicit scores
    implicit_records = []
    for inter in interactions_raw:
        signal_type = inter.get("type")
        if signal_type not in signal_weights:
            continue
        implicit_records.append({
            "userId": inter["userId"],
            "hotelId": inter["hotelId"],
            "score": signal_weights[signal_type],
            "source": "implicit"
        })
    
    # Collect explicit ratings (override implicit if same user-hotel pair)
    explicit_records = []
    if reviews_raw:
        for review in reviews_raw:
            explicit_records.append({
                "userId": review["userId"],
                "hotelId": review["hotelId"],
                "score": float(review["rating"]),
                "source": "explicit"
            })
    
    # Merge: explicit ratings override implicit for same (user, hotel) pair
    rating_map = {}  # (userId, hotelId) -> score
    
    for rec in implicit_records:
        key = (rec["userId"], rec["hotelId"])
        rating_map[key] = rec["score"]
    
    for rec in explicit_records:
        key = (rec["userId"], rec["hotelId"])
        # Explicit ratings take precedence
        rating_map[key] = rec["score"]
    
    # Build final DataFrame
    records = [{"userId": k[0], "hotelId": k[1], "score": v} for k, v in rating_map.items()]
    df = pd.DataFrame(records)
    
    print(f"   ✅ Loaded {len(interactions_raw)} interactions, {len(explicit_records)} explicit ratings")
    print(f"   ✅ Merged into {len(df)} unique (user, hotel) pairs")
    
    # Rating distribution
    score_dist = df['score'].round(0).value_counts().sort_index()
    print("   📊 Score distribution:")
    for score, count in score_dist.items():
        pct = count / len(df) * 100
        print(f"      {score:.0f}: {count} ({pct:.1f}%)")
    
    return df

# ---------------------------------------------------------
# 2. GRID SEARCH CV (Hyperparameter Tuning)
# ---------------------------------------------------------
def tune_hyperparameters(df):
    """
    Run GridSearchCV to find optimal SVD hyperparameters.
    """
    print("\n[2/5] Hyperparameter tuning (GridSearchCV)...")
    
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(df[['userId', 'hotelId', 'score']], reader)
    
    # Search space
    param_grid = {
        'n_factors': [50, 100, 150],
        'n_epochs': [20, 30],
        'lr_all': [0.005, 0.01],
        'reg_all': [0.02, 0.1]
    }
    
    print(f"   🔍 Testing {2*2*2*3} combinations with 3-fold CV...")
    
    gs = GridSearchCV(SVD, param_grid, measures=['rmse', 'mae'], cv=3, n_jobs=-1)
    gs.fit(data)
    
    # Results
    best_rmse = gs.best_score['rmse']
    best_mae = gs.best_score['mae']
    best_params_rmse = gs.best_params['rmse']
    best_params_mae = gs.best_params['mae']
    
    print(f"\n   🏆 Best RMSE: {best_rmse:.4f}")
    print(f"      Params: {best_params_rmse}")
    print(f"   🏆 Best MAE:  {best_mae:.4f}")
    print(f"      Params: {best_params_mae}")
    
    # Show top 5 configurations
    results_df = pd.DataFrame.from_dict(gs.cv_results)
    results_df = results_df.sort_values('mean_test_rmse').head(5)
    print("\n   📊 Top 5 configurations:")
    for i, row in results_df.iterrows():
        print(f"      RMSE={row['mean_test_rmse']:.4f} | MAE={row['mean_test_mae']:.4f} | "
              f"n_factors={row['param_n_factors']} | epochs={row['param_n_epochs']} | "
              f"lr={row['param_lr_all']} | reg={row['param_reg_all']}")
    
    return best_params_rmse, best_rmse, best_mae

# ---------------------------------------------------------
# 3. TRAIN FINAL MODEL
# ---------------------------------------------------------
def train_final_model(df, best_params):
    """
    Train final SVD model with best hyperparameters on full dataset.
    Also train baseline (default SVD) for comparison.
    """
    print("\n[3/5] Training final SVD model...")
    
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(df[['userId', 'hotelId', 'score']], reader)
    full_trainset = data.build_full_trainset()
    
    # Train optimized SVD
    algo_optimized = SVD(
        n_factors=best_params['n_factors'],
        n_epochs=best_params['n_epochs'],
        lr_all=best_params['lr_all'],
        reg_all=best_params['reg_all'],
        random_state=42
    )
    algo_optimized.fit(full_trainset)
    print(f"   ✅ Optimized SVD trained (n_factors={best_params['n_factors']}, epochs={best_params['n_epochs']})")
    
    # Train baseline SVD (default params) for comparison
    algo_baseline = SVD(random_state=42)
    algo_baseline.fit(full_trainset)
    print(f"   ✅ Baseline SVD trained (default params)")
    
    return algo_optimized, algo_baseline

# ---------------------------------------------------------
# 4. EVALUATE (Cross-validation)
# ---------------------------------------------------------
def evaluate_models(df, algo_optimized, algo_baseline, best_params):
    """
    Run cross-validation on both models to compare.
    """
    print("\n[4/5] Evaluating models (cross-validation)...")
    
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(df[['userId', 'hotelId', 'score']], reader)
    
    # Cross-validate optimized
    cv_optimized = cross_validate(algo_optimized, data, measures=['rmse', 'mae'], cv=5, verbose=False)
    
    # Cross-validate baseline
    cv_baseline = cross_validate(algo_baseline, data, measures=['rmse', 'mae'], cv=5, verbose=False)
    
    opt_rmse = np.mean(cv_optimized['test_rmse'])
    opt_mae = np.mean(cv_optimized['test_mae'])
    base_rmse = np.mean(cv_baseline['test_rmse'])
    base_mae = np.mean(cv_baseline['test_mae'])
    
    rmse_improvement = (base_rmse - opt_rmse) / base_rmse * 100
    mae_improvement = (base_mae - opt_mae) / base_mae * 100
    
    print(f"\n   📊 5-Fold Cross-Validation Results:")
    print(f"   ┌─────────────────────────────────────────────────┐")
    print(f"   │ Model              │ RMSE     │ MAE      │")
    print(f"   ├─────────────────────────────────────────────────┤")
    print(f"   │ SVD (Baseline)     │ {base_rmse:.4f}   │ {base_mae:.4f}   │")
    print(f"   │ SVD (Optimized)    │ {opt_rmse:.4f}   │ {opt_mae:.4f}   │")
    print(f"   │ Improvement        │ {rmse_improvement:+.2f}%   │ {mae_improvement:+.2f}%   │")
    print(f"   └─────────────────────────────────────────────────┘")
    
    return {
        "optimized_rmse": opt_rmse,
        "optimized_mae": opt_mae,
        "baseline_rmse": base_rmse,
        "baseline_mae": base_mae,
        "rmse_improvement_pct": rmse_improvement,
        "mae_improvement_pct": mae_improvement
    }

# ---------------------------------------------------------
# 5. SAVE
# ---------------------------------------------------------
def save_model_and_report(algo_optimized, best_params, eval_results, df):
    """
    Save trained model and training report.
    """
    print("\n[5/5] Saving model and report...")
    
    # Save model
    with open(MODEL_OUTPUT, "wb") as f:
        pickle.dump(algo_optimized, f)
    print(f"   ✅ Model saved to: {MODEL_OUTPUT}")
    
    # Save report
    report = {
        "timestamp": datetime.now().isoformat(),
        "model_type": "SVD (Optimized)",
        "best_params": best_params,
        "data_stats": {
            "total_ratings": len(df),
            "unique_users": df['userId'].nunique(),
            "unique_hotels": df['hotelId'].nunique(),
            "score_distribution": {
                str(k): int(v) for k, v in df['score'].round(0).value_counts().sort_index().items()
            }
        },
        "evaluation": eval_results
    }
    
    with open(METRICS_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"   ✅ Report saved to: {METRICS_OUTPUT}")

# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------
def main():
    print("\n" + "=" * 60)
    print("🚀 SVD TRAINING WITH HYPERPARAMETER TUNING")
    print("=" * 60)
    
    # 1. Load data
    df = prepare_training_data()
    if df is None or len(df) == 0:
        print("❌ No data to train!")
        return
    
    # 2. Tune hyperparameters
    best_params, best_cv_rmse, best_cv_mae = tune_hyperparameters(df)
    
    # 3. Train final model
    algo_optimized, algo_baseline = train_final_model(df, best_params)
    
    # 4. Evaluate
    eval_results = evaluate_models(df, algo_optimized, algo_baseline, best_params)
    
    # 5. Save
    save_model_and_report(algo_optimized, best_params, eval_results, df)
    
    print("\n" + "=" * 60)
    print("✅ SVD TRAINING COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()