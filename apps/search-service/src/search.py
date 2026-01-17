from sentence_transformers import util
import torch


def find_top_matches(query_vector, gallery_items, top_k=10):
    """
    So sánh query_vector với danh sách gallery_items
    gallery_items: list các dict chứa {"id": ..., "vector": ...}
    """
    results = []
    q_vec = torch.tensor(query_vector)

    for item in gallery_items:
        i_vec = torch.tensor(item["imageVector"])
        # Tính Cosine Similarity
        score = util.cos_sim(q_vec, i_vec).item()
        results.append({"id": item["id"], "score": score})

    # Sắp xếp giảm dần theo điểm số
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]
