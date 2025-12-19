import json
import torch
from sentence_transformers import util


def get_recommendations_for_user(
    user_id: str, interactions_path: str, hotel_vectors: list, top_k=5
):
    """
    Gợi ý khách sạn cho User dựa trên những gì họ đã Like hoặc Book (Simple Collaborative Filtering)
    """
    try:
        with open(interactions_path, "r", encoding="utf-8") as f:
            interactions = json.load(f)

        # 1. Tìm những khách sạn mà User này đã tương tác mạnh (like hoặc book)
        user_history = [
            i["stayId"]
            for i in interactions
            if i["userId"] == user_id and i["action"] in ["like", "book"]
        ]

        if not user_history:
            return []  # Hoặc trả về top popular hotels nếu user mới

        # 2. Lấy vector của khách sạn cuối cùng user tương tác để tìm cái tương tự
        last_stay_id = user_history[-1]
        target_vector = next(
            (item["vector"] for item in hotel_vectors if item["id"] == last_stay_id),
            None,
        )

        if target_vector is None:
            return []

        # 3. Dùng logic từ search.py để tìm các khách sạn tương tự
        from src.search import find_top_matches

        # Loại bỏ chính khách sạn đó khỏi danh sách gợi ý
        filtered_gallery = [
            item for item in hotel_vectors if item["id"] != last_stay_id
        ]

        return find_top_matches(target_vector, filtered_gallery, top_k)
    except Exception as e:
        print(f"Recommend error: {e}")
        return []
