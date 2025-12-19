from sentence_transformers import SentenceTransformer
from PIL import Image
import requests
from io import BytesIO

# Load model CLIP
model = SentenceTransformer("clip-ViT-B-32")


def get_image_vector(url: str):
    """Tải ảnh từ URL và chuyển thành vector"""
    response = requests.get(url, timeout=10)
    img = Image.open(BytesIO(response.content))
    return model.encode(img).tolist()


def get_text_vector(text: str):
    """Chuyển mô tả văn bản thành vector (cho search bằng chữ)"""
    return model.encode(text).tolist()
