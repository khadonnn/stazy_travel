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
> .venv\Scripts\activate
> uv pip install -r requirements.txt

#

.venv\Scripts\activate

# tạo lại json uv auto update =>

uv pip install numpy==1.26.4 pandas==2.2.2 scikit-surprise==1.1.4 faker

#

python generate_users.py || uv run generate_users.py
python generate_data.py || uv run generate_data.py
python generate_mock_interactions.py
python generate_mock_interactions.py || uv run generate_mock_interactions.py (giả lập)
python generate_recommendations.py || uv run generate_recommendations.py
python generate_categories.py || uv run generate_categories.py

# flow

Quy trình chuẩn sẽ là:
Chạy generate_users.py -> Ra file **users.json.
Chạy script tạo tương tác -> Ra file mock_interactions.json.
Chạy script tính gợi ý (Python): Đọc file interactions.json -> Tính toán -> Ra file **recommendations.json.
Chạy seed.ts: Đọc tất cả các file JSON trên và nạp vào DB một lần.
