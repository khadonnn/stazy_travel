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

uv run generate_data.py
uv run process_data.py (vector hoá)
uv run generate_mock_interactions.py (giả lập)
