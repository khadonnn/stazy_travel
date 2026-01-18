# File: src/utils/redis_client.py
import redis
import os
from dotenv import load_dotenv

load_dotenv()

# Tạo kết nối Redis (Singleton)
# Nếu chạy Docker, REDIS_HOST là tên service "redis" hoặc "stazy-redis"
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=True # Quan trọng: Nhận về String thay vì Bytes
)

def get_redis_client():
    return redis_client