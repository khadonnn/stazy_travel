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

# tạo lại json

uv run python generate_users.py
uv run generate_data.py
uv run process_data.py (vector hoá)
uv run generate_mock_interactions.py (giả lập)
uv run generate_recommendations.py
uv run generate_categories.py

# flow

Quy trình chuẩn sẽ là:
Chạy generate_users.py -> Ra file **users.json.
Chạy script tạo tương tác -> Ra file mock_interactions.json.
Chạy script tính gợi ý (Python): Đọc file interactions.json -> Tính toán -> Ra file **recommendations.json.
Chạy seed.ts: Đọc tất cả các file JSON trên và nạp vào DB một lần.
