# train_real.py
# SVD Training from Real Database Data
# Usage: uv run train_real.py
# Results saved to: analytics/ and jsons/recsys_model.pkl

import os
import json
import time
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine, text
from surprise import Dataset, Reader, SVD
from surprise.model_selection import cross_validate

# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ANALYTICS_DIR = os.path.join(BASE_DIR, "analytics")
MODEL_OUTPUT = os.path.join(BASE_DIR, "jsons", "recsys_model.pkl")
REPORT_OUTPUT = os.path.join(ANALYTICS_DIR, "real_svd_training_report.json")

DB_URL = os.getenv("DATABASE_URL", "postgresql://admin:123456@localhost:5432/products")


def ensure_analytics_dir():
    """Create analytics directory if not exists"""
    os.makedirs(ANALYTICS_DIR, exist_ok=True)


def train_and_save(progress_callback=None):
    """
    Train SVD model từ database.
    
    Args:
        progress_callback: optional callable(pct: int, step: str, msg: str) để báo tiến độ
    """
    print("\n" + "=" * 60)
    print("🚀 SVD TRAINING FROM REAL DATABASE")
    print("=" * 60)

    start_time = time.time()

    # ---------------------------------------------------------
    # 1. CONNECT & LOAD DATA
    # ---------------------------------------------------------
    print("\n[1/5] Connecting to database...")
    if progress_callback:
        progress_callback(5, "connecting_db", "Đang kết nối cơ sở dữ liệu...")
    engine = create_engine(DB_URL)

    # Test connection
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM interactions"))
            count = result.scalar()
            print(f"   ✅ Connected! {count} interactions in DB")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        if progress_callback:
            progress_callback(0, "error", f"Kết nối DB thất bại: {e}")
        return

    print("\n[2/5] Loading data from database...")
    if progress_callback:
        progress_callback(10, "loading_data", "Đang tải dữ liệu từ database...")

    # Load interactions
    interactions_query = """
    SELECT "userId", "hotelId", type, rating, timestamp
    FROM interactions
    ORDER BY timestamp ASC
    """
    df_inter = pd.read_sql(interactions_query, engine)
    print(f"   ✅ Loaded {len(df_inter)} interactions")

    # Load reviews
    reviews_query = """
    SELECT "userId", "hotelId", rating, "createdAt"
    FROM reviews
    WHERE rating IS NOT NULL AND rating > 0
    ORDER BY "createdAt" ASC
    """
    df_reviews = pd.read_sql(reviews_query, engine)
    print(f"   ✅ Loaded {len(df_reviews)} reviews")

    if df_inter.empty and df_reviews.empty:
        print("⚠️ No data found in database!")
        if progress_callback:
            progress_callback(0, "error", "Không có dữ liệu trong database!")
        return

    # ---------------------------------------------------------
    # 2. CONVERT TO SCORES
    # ---------------------------------------------------------
    print("\n[3/5] Converting behavior to scores...")
    if progress_callback:
        progress_callback(20, "converting_scores", "Đang chuyển đổi hành vi thành điểm số...")

    def calculate_score(row):
        if row.get('rating') and pd.notna(row['rating']):
            return float(row['rating'])
        if row['type'] == 'BOOK':
            return 5
        if row['type'] == 'CLICK_BOOK_NOW':
            return 4
        if row['type'] == 'LIKE':
            return 3
        if row['type'] == 'VIEW':
            return 1
        return 1

    # Score interactions
    rating_map = {}  # (userId, hotelId) -> score

    for _, row in df_inter.iterrows():
        key = (row['userId'], row['hotelId'])
        score = calculate_score(row)
        rating_map[key] = score

    # Override with explicit reviews (higher priority)
    for _, row in df_reviews.iterrows():
        key = (row['userId'], row['hotelId'])
        rating_map[key] = float(row['rating'])

    # Build DataFrame
    records = [{"userId": k[0], "hotelId": k[1], "score": v} for k, v in rating_map.items()]
    df = pd.DataFrame(records)

    print(f"   ✅ {len(df)} unique (user, hotel) pairs")

    # Stats
    unique_users = df['userId'].nunique()
    unique_hotels = df['hotelId'].nunique()
    score_dist = df['score'].round(0).value_counts().sort_index()

    print(f"   📊 Unique users: {unique_users}, Unique hotels: {unique_hotels}")
    print("   📊 Score distribution:")
    for score, count in score_dist.items():
        pct = count / len(df) * 100
        print(f"      {score:.0f}: {count} ({pct:.1f}%)")

    if len(df) < 10:
        print("⚠️ Too few records to train!")
        if progress_callback:
            progress_callback(0, "error", "Quá ít dữ liệu để huấn luyện (cần >= 10)")
        return

    # ---------------------------------------------------------
    # 3. TRAIN MODEL
    # ---------------------------------------------------------
    print("\n[4/5] Training SVD model...")
    if progress_callback:
        progress_callback(30, "training_cv", "Đang chạy cross-validation (5-fold)...")

    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(df[['userId', 'hotelId', 'score']], reader)

    # Cross-validation first
    print("   Running 5-fold cross-validation...")
    algo_cv = SVD(random_state=42)
    cv_results = cross_validate(algo_cv, data, measures=['rmse', 'mae'], cv=5, verbose=False)

    cv_rmse = np.mean(cv_results['test_rmse'])
    cv_mae = np.mean(cv_results['test_mae'])
    cv_rmse_std = np.std(cv_results['test_rmse'])
    cv_mae_std = np.std(cv_results['test_mae'])

    print(f"   📊 CV RMSE: {cv_rmse:.4f} (±{cv_rmse_std:.4f})")
    print(f"   📊 CV MAE:  {cv_mae:.4f} (±{cv_mae_std:.4f})")

    if progress_callback:
        progress_callback(55, "training_final", "Đang huấn luyện model trên toàn bộ dữ liệu...")

    # Train final model on full dataset
    print("   Training final model on full dataset...")
    trainset = data.build_full_trainset()
    algo = SVD(random_state=42)
    algo.fit(trainset)
    print("   ✅ SVD model trained!")

    if progress_callback:
        progress_callback(70, "saving_model", "Đang lưu model và báo cáo...")

    # ---------------------------------------------------------
    # 4. SAVE MODEL & REPORT
    # ---------------------------------------------------------
    print("\n[5/5] Saving model and report...")

    # Save model
    print("🔧 [DEBUG] Saving model to pickle...")
    with open(MODEL_OUTPUT, "wb") as f:
        pickle.dump(algo, f)
    print(f"   ✅ Model saved to: {MODEL_OUTPUT}")

    elapsed = time.time() - start_time

    # Save report to analytics/
    ensure_analytics_dir()
    
    # Lấy model params một cách an toàn - in toàn bộ attributes của algo để debug
    print("🔧 [DEBUG] Extracting model params...")
    print(f"🔧 [DEBUG] algo type: {type(algo).__name__}")
    print(f"🔧 [DEBUG] algo __dict__ keys: {list(algo.__dict__.keys())}")
    print(f"🔧 [DEBUG] algo dir (all): {[x for x in dir(algo) if not x.startswith('_')]}")
    
    # Sử dụng hasattr và giá trị mặc định CỨNG để tránh lỗi chồng lỗi
    model_params = {}
    svd_defaults = {"n_factors": 100, "n_epochs": 20, "lr_all": 0.005, "reg_all": 0.02}
    for attr_name in ["n_factors", "n_epochs", "lr_all", "reg_all"]:
        if hasattr(algo, attr_name):
            model_params[attr_name] = getattr(algo, attr_name)
        else:
            model_params[attr_name] = svd_defaults[attr_name]
            print(f"🔧 [WARN] algo has no '{attr_name}', using default {svd_defaults[attr_name]}")
    
    print(f"🔧 [DEBUG] Final model_params: {model_params}")

    report = {
        "timestamp": datetime.now().isoformat(),
        "model_type": "SVD",
        "data_source": "database",
        "database_url": DB_URL.split("@")[-1] if "@" in DB_URL else DB_URL,
        "execution_time_seconds": round(elapsed, 2),
        "data_stats": {
            "total_interactions": len(df_inter),
            "total_reviews": len(df_reviews),
            "unique_user_hotel_pairs": len(df),
            "unique_users": int(unique_users),
            "unique_hotels": int(unique_hotels),
            "score_distribution": {str(k): int(v) for k, v in score_dist.items()},
        },
        "cross_validation": {
            "folds": 5,
            "rmse_mean": round(cv_rmse, 4),
            "rmse_std": round(cv_rmse_std, 4),
            "mae_mean": round(cv_mae, 4),
            "mae_std": round(cv_mae_std, 4),
        },
        "model_params": model_params,
        "best_params": model_params,  # alias cho dashboard
    }

    with open(REPORT_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False, default=str)
    print(f"   ✅ Report saved to: {REPORT_OUTPUT}")

    # Also save dashboard-compatible report to jsons/svd_training_report.json
    # This is what main.py's /api/admin/ai/status endpoint reads
    print("🔧 [DEBUG] Saving dashboard report...")
    dashboard_report = {
        "timestamp": datetime.now().isoformat(),
        "model_type": "SVD (Optimized)",
        "best_params": model_params,  # ✅ dùng model_params đã được safe-extract
        "data_stats": {
            "total_ratings": len(df),
            "unique_users": int(unique_users),
            "unique_hotels": int(unique_hotels),
            "score_distribution": {str(k): int(v) for k, v in score_dist.items()},
        },
        "evaluation": {
            "optimized_rmse": round(cv_rmse, 4),
            "optimized_mae": round(cv_mae, 4),
            "baseline_rmse": 0,
            "baseline_mae": 0,
            "rmse_improvement_pct": 0,
            "mae_improvement_pct": 0,
        },
    }
    print(f"🔧 [DEBUG] Dashboard report best_params: {dashboard_report['best_params']}")
    dashboard_report_path = os.path.join(BASE_DIR, "jsons", "svd_training_report.json")
    with open(dashboard_report_path, "w", encoding="utf-8") as f:
        json.dump(dashboard_report, f, indent=2, ensure_ascii=False, default=str)
    print(f"   ✅ Dashboard report saved to: {dashboard_report_path}")

    # Also save to SystemMetric table
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO system_metrics 
                ("rmse", "mae", "precisionAt5", "recallAt5", "ndcgAt5",
                 "baselineRmse", "baselineMae", "baselinePrecision", "baselineRecall", "baselineNdcg",
                 "algorithm", "datasetSize", "executionTimeMs", "trainingHistory", "tuningParams", "createdAt")
                VALUES 
                (:rmse, :mae, 0, 0, 0, 0, 0, 0, 0, 0,
                 :algorithm, :datasetSize, :executionTimeMs, :trainingHistory, :tuningParams, :createdAt)
            """), {
                "rmse": cv_rmse,
                "mae": cv_mae,
                "algorithm": "SVD",
                "datasetSize": len(df),
                "executionTimeMs": int(elapsed * 1000),
                "trainingHistory": json.dumps([{
                    "cv_rmse": round(cv_rmse, 4),
                    "cv_mae": round(cv_mae, 4),
                    "cv_rmse_std": round(cv_rmse_std, 4),
                    "cv_mae_std": round(cv_mae_std, 4),
                }]),
                "tuningParams": json.dumps(model_params),
                "createdAt": datetime.now(),
            })
            conn.commit()
        print("   ✅ Metrics saved to SystemMetric table in DB")
    except Exception as e:
        print(f"   ⚠️ Could not save to SystemMetric: {e}")

    # Print summary
    print("\n" + "=" * 60)
    print("📊 TRAINING SUMMARY")
    print("=" * 60)
    print(f"   Data: {len(df)} records ({unique_users} users × {unique_hotels} hotels)")
    print(f"   Model: SVD (n_factors={model_params['n_factors']}, epochs={model_params['n_epochs']})")
    print(f"   CV RMSE: {cv_rmse:.4f} (±{cv_rmse_std:.4f})")
    print(f"   CV MAE:  {cv_mae:.4f} (±{cv_mae_std:.4f})")
    print(f"   Time: {elapsed:.1f}s")
    print(f"\n   📁 Model:  {MODEL_OUTPUT}")
    print(f"   📁 Report: {REPORT_OUTPUT}")

    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETED")
    print("=" * 60)


if __name__ == "__main__":
    train_and_save()
