uv init
uv venv
uv add clerk-backend-api
uv add fastapi uvicorn sentence-transformers torch Pillow requests
uv run uvicorn main:app --reload

#

uv run: Tự động kích hoạt môi trường ảo .venv và chạy.

--reload: Tự động khởi động lại server khi bạn sửa code (rất tiện khi dev).

pip install "fastapi[standard]"

# clip-ViT-B-32

#

uv pip install --force-reinstall pandas "numpy<2" scikit-surprise

# remove

> Remove-Item -Recurse -Force .venv
> uv venv
> .venv\Scripts\activate (CMD) || .venv\Scripts\Activate.ps1 (PowerShell)
> uv pip install -r requirements.txt

#

.venv\Scripts\activate

# tạo lại json uv auto update =>

uv pip install numpy==1.26.4 pandas==2.2.2 scikit-surprise==1.1.4 faker

#

python generate_categories.py || uv run generate_categories.py
python generate_users.py || uv run generate_users.py
python generate_data.py || uv run generate_data.py
python generate_mock_interactions.py || **uv add numpy==1.26.4**
python generate_mock_interactions.py || uv run generate_mock_interactions.py (giả lập)
python generate_recommendations.py || uv run generate_recommendations.py

uv run process_data.py

> uv run evaluate.py --mode all # Chạy cả 2
> uv run evaluate.py --mode implicit # Chỉ ranking
> uv run evaluate.py --mode explicit # Chỉ rating

# ⚠️ CHẠY THEO THỨ TỰ ĐÚNG:

# STEP 1: Create mock users (FIRST - dependency cho interactions)

uv run generate_users.py

# Output: jsons/\_\_users.json (200 users)

# STEP 2: Create mock hotels/stays (SECOND - dependency cho interactions)

uv run generate_data.py

# Output: jsons/\_\_homeStay.json (100 hotels)

# STEP 3: Create interactions + daily stats + metrics (THIRD - dùng users + hotels)

uv run generate_mock_interactions.py

# Output:

# - jsons/\_\_interactions.json (2000 interactions)

# - jsons/\_\_reviews.json (reviews)

# - jsons/\_\_daily_stats.json (daily aggregation)

# - jsons/\_\_metrics.json (system metrics from SVD)

# STEP 4: Generate recommendations (FOURTH - dùng interactions)

uv run generate_recommendations.py

# Output: jsons/\_\_recommendations.json (CF predictions)

# STEP 5: Generate categories (OPTIONAL - reference data)

uv run generate_categories.py

# Output: jsons/\_\_categories.json

# STEP 6: EVALUATE DUAL-FEEDBACK CF SYSTEMS (NEW - Tách Implicit & Explicit)

uv run evaluate.py --mode all # Chạy cả 2 hệ thống
uv run evaluate.py --mode implicit # Chỉ ranking
uv run evaluate.py --mode explicit # Chỉ rating prediction

# Output:

# - implicit_cf_evaluation_report.json (Precision@K, Recall@K, NDCG@K)

# - explicit_cf_evaluation_report.json (RMSE, MAE)

# STEP 7: Seed database (Final - nạp tất cả vào DB)

# cd ../../packages/booking-db

# npm run seed

# ============================================================

# FULL PIPELINE (Copy-paste để chạy liên tục):

# ============================================================

uv run generate_users.py; uv run generate_data.py; uv run generate_mock_interactions.py; uv run generate_recommendations.py; uv run generate_categories.py; uv run evaluate.py --mode all

# ============================================================

# DEPENDENCIES MAP:

# ============================================================

# generate_users.py (độc lập)

# ↓

# generate_data.py (độc lập)

# ↓ (users.json + homeStay.json)

# generate_mock_interactions.py (phụ thuộc users + hotels)

# ↓ (interactions.json + reviews.json)

# evaluate.py (phụ thuộc interactions + reviews)

# • --mode implicit: Ranking metrics (Precision@K, Recall@K, NDCG@K)

# • --mode explicit: Rating prediction (RMSE, MAE)

# • --mode all: Cả 2 hệ thống

# ↓ (reports + recommendations.json)

# seed.ts (nạp tất cả vào DB)
