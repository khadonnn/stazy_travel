"""
generate_reviews_from_csv.py
============================
Đọc bình luận tiếng Việt từ dataset/Reviews.csv → phân tích Sentiment
dùng từ điển cảm xúc (TuDon.txt) + loại stopwords (vietnamese-stopwords.txt)
→ Tạo reviews.json với schema Hybrid (explicitSentiments) cho Prisma seed.

Sử dụng:
    python apps/search-service/generate_reviews_from_csv.py

Output:
    apps/search-service/jsons/__reviews_real_vi.json
"""

import csv
import json
import os
import random
import uuid
from datetime import datetime, timedelta
from collections import Counter

random.seed(42)

# ============================================================
# CẤU HÌNH ĐƯỜNG DẪN
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_DIR = os.path.join(BASE_DIR, "jsons")
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

CSV_REVIEWS_FILE = os.path.join(DATASET_DIR, "Reviews.csv")
TUDON_FILE = os.path.join(DATASET_DIR, "TuDon.txt")
STOPWORDS_FILE = os.path.join(DATASET_DIR, "vietnamese-stopwords.txt")
HOTEL_FILE = os.path.join(JSON_DIR, "__homeStay.json")
USER_FILE = os.path.join(JSON_DIR, "__users.json")
OUTPUT_FILE = os.path.join(JSON_DIR, "__reviews_real_vi.json")

# ============================================================
# 1. LOAD TỪ ĐIỂN CẢM XÚC (TuDon.txt)
# ============================================================
def load_sentiment_dict(filepath):
    """
    Load từ điển từ đơn tiếng Việt.
    Danh sách TuDon.txt là danh sách từ đơn (không có nhãn cảm xúc),
    nên ta dùng cho việc tokenize / kiểm tra từ hợp lệ.
    """
    words = set()
    if not os.path.exists(filepath):
        print(f"⚠️  Không tìm thấy {filepath}")
        return words
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            w = line.strip().lower()
            if w and len(w) >= 1:
                words.add(w)
    return words


# ============================================================
# 2. LOAD STOPWORDS
# ============================================================
def load_stopwords(filepath):
    stopwords = set()
    if not os.path.exists(filepath):
        print(f"⚠️  Không tìm thấy {filepath}")
        return stopwords
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            w = line.strip().lower()
            if w:
                stopwords.add(w)
    # Bổ sung stopwords tiếng Anh cơ bản
    english_sw = [
        "the", "a", "an", "is", "was", "are", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "shall", "can", "need", "and", "or", "but",
        "if", "while", "of", "at", "by", "for", "with", "about", "to", "from",
        "in", "on", "it", "this", "that", "not", "so", "as", "its", "my", "his",
        "her", "our", "their", "very", "too", "just", "than", "more", "most",
    ]
    stopwords.update(english_sw)
    return stopwords


# ============================================================
# 3. RULE-BASED VIETNAMESE SENTIMENT ANALYSIS
# ============================================================

# Các từ/cụm từ mang sắc thái cảm xúc rõ ràng
POSITIVE_WORDS = {
    # Đánh giá tốt
    "tốt", "tuyệt", "tuyệt vời", "đẹp", "xinh", "sạch", "sạch sẽ",
    "thoải mái", "dễ chịu", "ấm cúng", "sang trọng", "hiện đại",
    "tiện nghi", "tiện lợi", "rộng rãi", "mát", "mát mẻ", "yên tĩnh",
    "yên bình", "thoáng", "thoáng đãng", "lịch sự", "chuyên nghiệp",
    "nhiệt tình", "thân thiện", "vui vẻ", "hài lòng", "ưng ý",
    "hoàn hảo", "tuyệt hảo", "xuất sắc", "giỏi", "hay", "thích",
    "thú vị", "đáng", "đáng giá", "đáng tiền", "hợp lý", "rẻ",
    "ngon", "đậm đà", "tươi", "tươi ngon", "thơm", "thơm tho",
    "view", "view đẹp", "phong cảnh", "quang cảnh", "hài hòa",
    "trải nghiệm", "kỷ niệm", "trọn vẹn", "hoàn hảo", "recommend",
    "giới thiệu", "quay lại", "trở lại", "lần sau", "tuyệt cú mèo",
    "ấn tượng", "thích thú", "hạnh phúc", "vui", "may mắn",
    "chất lượng", "cao cấp", "premium", "vip", "best", "nice",
    "great", "wonderful", "amazing", "excellent", "perfect", "love",
    "beautiful", "fantastic", "awesome", "superb", "lovely",
    "rất tốt", "rất đẹp", "rất sạch", "rất hài lòng",
    "cực kỳ", "siêu", "quá đẹp", "quá tốt", "10 điểm",
}

NEGATIVE_WORDS = {
    # Đánh giá xấu
    "tệ", "tệ hại", "kém", "kém chất lượng", "bẩn", "dơ", "bẩn thỉu",
    "hôi", "mùi", "thối", "ẩm mốc", "mốc", "tối", "tăm tối",
    "chật", "chật chội", "ồn", "ồn ào", "nhiễu", "tạp nham",
    "lừa đảo", "lừa", "treo đầu dê bán thịt chó", "không giống",
    "không đúng", "thất vọng", "phẫn nộ", "tức giận", "bực mình",
    "khó chịu", "buồn", "chán", "nhàm chán", "tồi", "tồi tệ",
    "xấu", "xấu xí", "cũ", "cũ kỹ", "nát", "hư", "hỏng",
    "mắc", "đắt", "cắt cổ", "chặt chém", "lãng phí",
    "thiếu", "không có", "không đủ", "dơ dáy", "kinh khủng",
    "kinh tởm", "ghê", "rùng mình", "sợ", "hoảng",
    "không chuyên nghiệp", "thái độ", "vô duyên", "cục súc",
    "chậm", "chậm chạp", "lâu", "trễ", "muộn",
    "never", "worst", "terrible", "horrible", "bad", "poor",
    "dirty", "old", "broken", "expensive", "noisy", "disappointed",
    "awful", "disgusting", "ugly", "slow", "rude",
    "không bao giờ", "không đáng", "né", "tránh xa", "đừng",
    "tiếc", "phí tiền", "thất bại", "ảm đạm", "vắng vẻ",
}

# Các từ phủ định đảo ngược cảm xúc
NEGATION_WORDS = {"không", "chưa", "chẳng", "chả", "chớ", "đừng", "chối"}

# Cấu trúc: aspect keywords → mapping to aspects
ASPECT_KEYWORDS = {
    "service": [
        "nhân viên", "lễ tân", "phục vụ", "tiếp tân", "thái độ",
        "dịch vụ", "phục vụ", "hỗ trợ", "chăm sóc", "tư vấn",
        "quản lý", "bảo vệ", "security", "bellboy", "housekeeping",
        "staff", "service", "reception", "concierge",
    ],
    "room": [
        "phòng", "phòng ngủ", "phòng tắm", "toilet", "nhà vệ sinh",
        "giường", "chăn", "ga", "gối", "đệm", "nệm", "mền",
        "cách âm", "âm thanh", "ồn", "view phòng", "ban công",
        "room", "bathroom", "bedroom", "bed", "shower",
    ],
    "location": [
        "vị trí", "địa điểm", "trung tâm", "gần", "xa", "đường",
        "di chuyển", "giao thông", "bãi biển", "biển", "sông",
        "núi", "hồ", "chợ", "siêu thị", "sân bay", "ga",
        "location", "beach", "center", "view", "phong cảnh",
    ],
    "price": [
        "giá", "giá cả", "giá tiền", "giá thành", "tiền", "chi phí",
        "đắt", "rẻ", "hợp lý", "phải chăng", "cắt cổ", "chặt chém",
        "khuyến mãi", "giảm giá", "sale", "price", "cost", "cheap",
        "expensive", "affordable", "budget", "mắc", "hời",
    ],
    "amenities": [
        "tiện nghi", "tiện ích", "hồ bơi", "pool", "gym", "spa",
        "nhà hàng", "restaurant", "bar", "cafe", "wifi", "internet",
        "điều hòa", "máy lạnh", "tivi", "tv", "tủ lạnh", "minibar",
        "máy giặt", "thang máy", "elevator", "parking", "bãi đỗ",
        "amenity", "facility", "pool", "garden", "kitchen",
    ],
    "cleanliness": [
        "vệ sinh", "sạch", "sạch sẽ", "bẩn", "dơ", "lau", "dọn",
        "gọn", "gàng", "ngăn nắp", "mùi", "hôi", "thơm", "ẩm mốc",
        "clean", "dirty", "hygiene", "sanitize", "spotless",
    ],
    "food": [
        "bữa sáng", "breakfast", "buffet", "đồ ăn", "thức ăn",
        "nước", "đồ uống", "nước uống", "cơm", "phở", "bún",
        "ăn sáng", "ăn trưa", "ăn tối", "menu", "chef", "đầu bếp",
        "ngon", "dở", "tươi", "thơm", "nấu",
    ],
}


def tokenize_vietnamese(text):
    """Tokenize tiếng Việt đơn giản: tách từ bằng khoảng trắng + lowercase"""
    import re
    import unicodedata
    text = text.lower()
    # Giữ lại chữ (Unicode Letter), số (Digit), và khoảng trắng
    cleaned = []
    for ch in text:
        cat = unicodedata.category(ch)
        if cat.startswith('L') or cat.startswith('N') or ch.isspace():
            cleaned.append(ch)
        else:
            cleaned.append(' ')
    text = ''.join(cleaned)
    tokens = text.split()
    return [t for t in tokens if len(t) >= 1]


def has_negation(tokens, idx, window=2):
    """Kiểm tra có từ phủ định trước từ tại vị trí idx không"""
    start = max(0, idx - window)
    for i in range(start, idx):
        if tokens[i] in NEGATION_WORDS:
            return True
    return False


def analyze_sentiment_score(text):
    """
    Phân tích sentiment score từ text tiếng Việt.
    Trả về: (score: float, positive_count: int, negative_count: int)
    score > 0 → POSITIVE, score < 0 → NEGATIVE, score == 0 → NEUTRAL
    """
    tokens = tokenize_vietnamese(text)
    if not tokens:
        return 0.0, 0, 0

    pos_count = 0
    neg_count = 0

    for i, token in enumerate(tokens):
        is_negated = has_negation(tokens, i)

        # Kiểm tra single token
        if token in POSITIVE_WORDS:
            if is_negated:
                neg_count += 1
            else:
                pos_count += 1
        elif token in NEGATIVE_WORDS:
            if is_negated:
                pos_count += 0.5  # Phủ định tiêu cực → hơi tích cực
            else:
                neg_count += 1

    # Kiểm tra bigrams (2-gram)
    text_lower = " ".join(tokens)
    for phrase in POSITIVE_WORDS:
        if " " in phrase and phrase in text_lower:
            pos_count += 1
    for phrase in NEGATIVE_WORDS:
        if " " in phrase and phrase in text_lower:
            neg_count += 1

    total = pos_count + neg_count
    if total == 0:
        return 0.0, 0, 0

    score = (pos_count - neg_count) / total
    return score, pos_count, neg_count


def classify_sentiment(score, rating=None):
    """
    Chuyển score → enum sentiment (POSITIVE/NEGATIVE/NEUTRAL).
    Kết hợp rating để tăng độ chính xác khi score = 0.
    """
    if score > 0.1:
        return "POSITIVE"
    elif score < -0.1:
        return "NEGATIVE"
    else:
        # Score gần 0 → dùng rating làm tiebreaker
        if rating is not None:
            if rating >= 4:
                return "POSITIVE"
            elif rating <= 2:
                return "NEGATIVE"
        return "NEUTRAL"


def analyze_explicit_sentiments(text, tokens):
    """
    Phân tích aspect-based sentiment cho Hybrid Model.
    Trả về dict: { "service": "POSITIVE", "room": "NEGATIVE", ... }
    """
    explicit = {}

    for aspect, keywords in ASPECT_KEYWORDS.items():
        # Tìm xem aspect này có được mention trong text không
        mentioned = False
        for kw in keywords:
            if kw in text.lower() or kw in " ".join(tokens):
                mentioned = True
                break

        if not mentioned:
            continue

        # Phân tích sentiment cho các câu chứa aspect keywords
        # Tách text thành câu, tìm câu chứa keyword
        sentences = text.replace(".", ". ").replace("!", "! ").replace("?", "? ").split(".")
        aspect_sentences = []
        for sent in sentences:
            sent_lower = sent.lower()
            for kw in keywords:
                if kw in sent_lower:
                    aspect_sentences.append(sent.strip())
                    break

        if not aspect_sentences:
            continue

        # Tính sentiment cho các câu liên quan đến aspect
        aspect_text = ". ".join(aspect_sentences)
        score, _, _ = analyze_sentiment_score(aspect_text)
        sentiment = classify_sentiment(score)
        explicit[aspect] = sentiment

    return explicit


# ============================================================
# 4. LOAD DATA
# ============================================================
print("📊 VIETNAMESE REVIEW SENTIMENT ANALYZER")
print("=" * 60)

print("\n[1/5] Loading dictionaries...")
tudon_words = load_sentiment_dict(TUDON_FILE)
stopwords = load_stopwords(STOPWORDS_FILE)
print(f"   ✅ Loaded {len(tudon_words)} từ đơn (TuDon.txt)")
print(f"   ✅ Loaded {len(stopwords)} stopwords")

print("\n[2/5] Loading Vietnamese reviews from CSV...")
vi_reviews = []
if not os.path.exists(CSV_REVIEWS_FILE):
    print(f"❌ Không tìm thấy {CSV_REVIEWS_FILE}")
    exit(1)

with open(CSV_REVIEWS_FILE, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            if row.get("language") != "vi":
                continue
            text = row.get("text", "").strip()
            if len(text) < 15:  # Bỏ qua review quá ngắn
                continue
            rating = int(float(row.get("rating", 3)))
            vi_reviews.append({
                "csv_id": row.get("id", ""),
                "rating": rating,
                "text": text,
                "username": row.get("username", ""),
                "locationId": row.get("locationId", ""),
                "hotelName": row.get("hotelName", ""),
                "createdDate": row.get("createdDate", ""),
            })
        except (ValueError, KeyError):
            continue

print(f"   ✅ Loaded {len(vi_reviews)} Vietnamese reviews")

# Load hotels & users
hotels = []
if os.path.exists(HOTEL_FILE):
    with open(HOTEL_FILE, "r", encoding="utf-8") as f:
        hotels = json.load(f)
    print(f"   ✅ Loaded {len(hotels)} hotels")

users = []
if os.path.exists(USER_FILE):
    with open(USER_FILE, "r", encoding="utf-8") as f:
        users_data = json.load(f)
        users = [{"id": u["id"]} for u in users_data]
    print(f"   ✅ Loaded {len(users)} users")

if not users:
    users = [{"id": f"user_{i}"} for i in range(1, 201)]

# ============================================================
# 5. PHÂN TÍCH VÀ TẠO REVIEWS JSON
# ============================================================
print("\n[3/5] Analyzing sentiments with rule-based NLP...")

# Thống kê
sentiment_stats = Counter()
aspect_stats = Counter()
processed = 0

generated_reviews = []

for vr in vi_reviews:
    text = vr["text"]
    rating = vr["rating"]

    # 1. Phân tích overall sentiment
    score, pos_count, neg_count = analyze_sentiment_score(text)
    sentiment = classify_sentiment(score, rating)

    # 2. Phân tích explicit sentiments (aspect-based)
    tokens = tokenize_vietnamese(text)
    explicit = analyze_explicit_sentiments(text, tokens)

    # 3. Chọn hotel và user ngẫu nhiên
    hotel = random.choice(hotels) if hotels else {"id": random.randint(1, 50)}
    user = random.choice(users)

    # 4. Tạo timestamp ngẫu nhiên
    base_date = datetime(2024, 1, 1)
    timestamp = base_date + timedelta(
        days=random.randint(0, 364),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )

    # 5. Tạo bookingId unique (cho schema @unique)
    booking_id = str(uuid.uuid4())

    # 6. Build review object theo schema Prisma
    review_obj = {
        "id": str(uuid.uuid4()),
        "bookingId": booking_id,
        "userId": user["id"],
        "hotelId": hotel.get("id", 1),
        "rating": rating,
        "comment": text,
        "sentiment": sentiment,
        "explicitSentiments": explicit if explicit else None,
        "nlpProcessed": True,
        "createdAt": timestamp.isoformat(),
        "updatedAt": timestamp.isoformat(),
    }

    generated_reviews.append(review_obj)
    sentiment_stats[sentiment] += 1
    for asp in explicit:
        aspect_stats[asp] += 1
    processed += 1

    if processed % 1000 == 0:
        print(f"   ... Đã xử lý {processed}/{len(vi_reviews)} reviews")

# ============================================================
# 6. SAVE OUTPUT
# ============================================================
print(f"\n[4/5] Saving {len(generated_reviews)} reviews...")
os.makedirs(JSON_DIR, exist_ok=True)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(generated_reviews, f, indent=2, ensure_ascii=False)

print(f"   ✅ Saved to {OUTPUT_FILE}")

# ============================================================
# 7. STATISTICS
# ============================================================
print("\n[5/5] Statistics:")
print(f"\n   📊 SENTIMENT DISTRIBUTION:")
for s in ["POSITIVE", "NEUTRAL", "NEGATIVE"]:
    count = sentiment_stats.get(s, 0)
    pct = (count / len(generated_reviews) * 100) if generated_reviews else 0
    bar = "█" * int(pct / 2)
    print(f"   {s:>10}: {count:>5} ({pct:>5.1f}%) {bar}")

print(f"\n   📊 ASPECT COVERAGE (explicitSentiments):")
for asp, count in aspect_stats.most_common():
    print(f"   {asp:>15}: {count:>5} mentions")

print(f"\n   📊 TOTAL:")
print(f"   Total reviews generated: {len(generated_reviews)}")
print(f"   Reviews with aspects:    {sum(1 for r in generated_reviews if r['explicitSentiments'])}")
print(f"   Reviews without aspects: {sum(1 for r in generated_reviews if not r['explicitSentiments'])}")

# Sample output
print(f"\n   📝 SAMPLE REVIEW (first):")
if generated_reviews:
    sample = generated_reviews[0]
    print(f"   rating: {sample['rating']}")
    print(f"   comment: {sample['comment'][:120]}...")
    print(f"   sentiment: {sample['sentiment']}")
    print(f"   explicitSentiments: {json.dumps(sample['explicitSentiments'], ensure_ascii=False)}")

print("\n✅ Done! Reviews file ready for Prisma seed.")