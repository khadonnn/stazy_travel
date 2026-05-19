@workspace /apps/client/src/actions/get-ai-recommendations.ts /apps/search-service/src/recommend.py /prisma/schema.prisma

Refactor lại kiến trúc Recommendation System để tách biệt rõ:

- Long-term learning (SVD training)
- Realtime session steering
- Ephemeral recommendation inference

MỤC TIÊU:
Hệ thống phải hoạt động giống AI-native recommendation engine:

- realtime
- contextual
- session-aware
- không bị stale recommendations
- không persist top recommendations vào database

==================================================

1. # XÓA KIẾN TRÚC PERSIST RECOMMENDATIONS

Hiện tại model Recommendation đang lưu:

- hotelIds
- top recommendations
- scores

Điều này gây:

- stale recommendations
- stuck destination bias
- recommendations không update realtime
- historical outputs override current intent

KHÔNG được persist:

- top 3 hotels
- realtime chips
- session recommendations
- recommendation outputs

Recommendation phải là:

- realtime inference result
- ephemeral
- generated on demand

YÊU CẦU:

- remove logic persist recommendation outputs
- remove logic update recommendation table every few clicks
- remove stale recommendation reads

================================================== 2. THAY Recommendation TABLE BẰNG INTERACTION LOGGING
=====================================================

Tạo kiến trúc lưu USER INTERACTIONS thay vì recommendation outputs.

Ví dụ schema:

model UserInteraction {
id Int @id @default(autoincrement())

userId String
hotelId Int

interactionType String
// view
// click
// favorite
// booking
// selected_for_ai

weight Float @default(1)

createdAt DateTime @default(now())

@@index([userId])
@@index([hotelId])
}

MỤC TIÊU:
Đây là dữ liệu dùng cho:

- SVD training
- Hybrid CF
- latent vectors
- collaborative filtering
- long-term personalization

================================================== 3. TÁCH BIỆT LONG-TERM VS SHORT-TERM
====================================

LONG-TERM:

- user historical interactions
- SVD preferences
- persistent taste profile

SHORT-TERM:

- current selected 3 hotels
- current destination intent
- realtime AI steering
- dynamic chips

QUAN TRỌNG:
Current session intent phải override historical bias trong realtime inference.

Ví dụ:

- user historically thích Cần Thơ
- nhưng hiện tại chọn 3 khách sạn Vũng Tàu

→ recommendations phải ưu tiên Vũng Tàu ngay lập tức.

================================================== 4. DÙNG REDIS CHO EPHEMERAL CACHE
=================================

Hiện tại đã có Redis.

Hãy chuyển candidate cache từ:

- in-memory Map

→ sang Redis.

MỤC TIÊU:

- shared cache
- scalable
- TTL built-in
- production-safe

QUAN TRỌNG:
Redis KHÔNG phải source of truth.

Redis chỉ dùng cho:

- candidate pools
- temporary inference cache
- short-term reranking cache

TTL:
5 phút.

Ví dụ key:
recommend:candidates:{normalizedHotelIds}

KHÔNG persist:

- final recommendations
- top 3 hotels
- realtime chips

================================================== 5. NORMALIZE CACHE KEY
======================

Fix vấn đề:
A-B-C và C-B-A tạo 2 cache entries khác nhau.

Implement:

const normalized = [...hotelIds].sort((a, b) => a - b);
const cacheKey = normalized.join("-");

================================================== 6. IMPROVE REALTIME SESSION STEERING
====================================

Khi user chọn 3 khách sạn:

- detect dominant destination
- compute session intent
- boost current destination strongly

Realtime steering phải mạnh hơn:

- historical preferences
- popularity bias
- stale personalization

Ví dụ:
3/3 Vũng Tàu
→ recommendations chủ yếu phải là Vũng Tàu.

================================================== 7. DIVERSITY RERANKING
======================

KHÔNG force khác destination nữa.

Nếu session intent mạnh:

- diversify trong cùng destination

Ví dụ:

- luxury resort
- beachfront villa
- spa hotel
- boutique stay

KHÔNG:

- 1 Cần Thơ
- 1 Vũng Tàu
- 1 Đà Lạt

================================================== 8. SVD TRAINING ARCHITECTURE
============================

Realtime inference:

- generate recommendations instantly

Batch jobs:

- retrain SVD
- recompute latent vectors
- update similarity matrices

KHÔNG retrain realtime mỗi click.

Gợi ý:

- nightly retraining
- every few hours
- hoặc interaction threshold batching

================================================== 9. KIẾN TRÚC CUỐI CÙNG MONG MUỐN
================================

PostgreSQL:

- hotels
- user interactions
- embeddings
- latent vectors
- analytics

Redis:

- candidate cache
- ephemeral inference cache
- temporary reranking state

Realtime inference:

- top 3 recommendations
- dynamic AI chips
- reranking
- session steering

KHÔNG persist:

- final recommendation outputs

================================================== 10. YÊU CẦU OUTPUT
==================

Hãy:

- refactor hoàn chỉnh kiến trúc recommendation
- migrate khỏi Recommendation output persistence
- implement Redis ephemeral caching
- implement UserInteraction logging
- fix stale destination bias
- fix session steering override
- preserve Hybrid CF pipeline
- preserve realtime AI-native UX

Giải thích rõ:

- cái gì được persist
- cái gì ephemeral
- Redis dùng để làm gì
- SVD training flow hoạt động ra sao
- # session steering override historical personalization như thế nào
  bạn đã làm:
  bạn thấy agent vscode làm vậy có cần sửa gì không ? # Đã sửa xong: Intent Layering - Session intent overrides long-term preference

## Vấn đề gốc

Long-term historical preference (Cần Thơ) luôn đè lên realtime steering (Vũng Tàu) vì cả 2 layer đều dùng cùng 1 interaction list.

## Giải pháp: Intent Layering Architecture

### Hai layer tách biệt:

| Layer                 | Nguồn data           | Trọng số                                          | Vai trò                                     |
| --------------------- | -------------------- | ------------------------------------------------- | ------------------------------------------- |
| **Session Intent**    | Last 10 interactions | **STRONG** (SESSION_DEST_WEIGHT=0.30, boost=0.35) | Realtime steering - user đang chọn Vũng Tàu |
| **Long-term Profile** | All interactions     | **WEAK** (DESTINATION_WEIGHT=0.15, boost=0.15)    | Historical bias - user từng thích Cần Thơ   |

### Quy tắc: Session Intent ALWAYS overrides Long-term

- Nếu `>= 60%` of last 10 interactions ở 1 destination → **SESSION INTENT wins**
- Session intent boost = **0.35** (gấp 2.3x long-term boost 0.15)
- Session intent **ephemeral** - chỉ ảnh hưởng current recommendation, không persist vào DB

### Thay đổi chi tiết:

**`get-ai-recommendations.ts`:**

- `detectSessionDestination()`: Detect từ last 10 interactions (session window)
- `detectLongTermDestination()`: Detect từ ALL interactions (historical)
- Session threshold ≥ 60% → session override active
- Scoring: SESSION_DEST_BOOST=0.35 vs LONGTERM_DEST_BOOST=0.15
- `diversifyAndRank()`: Khi session active → **intra-destination diversity** (diversify by category/price WITHIN same city, KHÔNG force cross-city)
- Candidate pool: Lấy 8 sạn từ preferred dest thay vì 2

**`recommend.py`:**

- `detect_session_destination()`: Same logic từ `__interactions.json`
- `build_user_profile()`: Track cả `session_destinations` + `preferred_destinations`
- `compute_content_score()`: SESSION_DEST_WEIGHT=0.30 >> DESTINATION_WEIGHT=0.15
- `diverse_recommend()`: Session-aware - filter to same dest khi session active
- `get_recommendations_for_user()`: Intent layering dispatcher

### Kết quả mong đợi:

- User chọn 3 khách sạn Vũng Tàu → Recommendations: **3 khách sạn Vũng Tàu**
- Dynamic chips phản ánh context Vũng Tàu
- Historical Cần Thơ bias **tạm thời bị vô hiệu hóa**
- Khi user ngừng tương tác với Vũng Tàu → hệ thống tự revert về historical preference
