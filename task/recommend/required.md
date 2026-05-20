PROMPT: TEST AI RECOMMENDATION SYSTEM (CACHE + INTENT + SVD 60/40)

Bạn là QA/Debug agent cho hệ thống AI Hotel Recommendation (SVD 60% + Content 40%).

🎯 Mục tiêu test

Xác minh hệ thống hoạt động đúng theo 3 tiêu chí:

Intent phải cập nhật theo hành vi người dùng (click 3 khách sạn)
Cache phải invalidate khi intent thay đổi
Recommendation list phải thay đổi theo destination mới (không reuse dữ liệu cũ)
🧪 Test Scenario 1: Intent shift (critical test)
Step:
Click 3 khách sạn thuộc cùng 1 destination (VD: Vũng Tàu)
Quan sát logs:
EXPECTED:
[intent] RECENT SHIFT: "Vũng Tàu"
confidence >= 0.7
destination = Vũng Tàu
FAIL IF:
intent vẫn là destination cũ (VD: Hà Nội)
hoặc confidence thấp nhưng vẫn bị dùng
🧪 Test Scenario 2: Cache invalidation
Step:
Sau khi intent shift xảy ra
Quan sát cache log
EXPECTED:
[cache] MISS hoặc [cache] INVALIDATED
FAIL IF:
[cache] HIT CACHED RESULT với intent cũ
🧪 Test Scenario 3: Recommendation correctness
Step:
Sau intent shift, kiểm tra 4 hotels trả về
EXPECTED:
Top results phải ưu tiên destination mới (VD: Vũng Tàu)
Không được reuse toàn bộ list cũ (Hà Nội/Đà Nẵng/Huế)
FAIL IF:
list không đổi sau interaction
destination cũ vẫn chiếm majority
🧪 Test Scenario 4: Multi-destination switch
Step:
Click 3 hotels Vũng Tàu → verify
Sau đó click 3 hotels Nha Trang → verify
EXPECTED:
intent switch cả 2 lần
cache invalidated mỗi lần
recommendation thay đổi tương ứng
📊 Required logs to capture:
[intent] ...
[cache] HIT / MISS / INVALIDATED
[fingerprint] ...
[ranking-before]
[ranking-after]
🎯 Final pass condition:

System is ONLY considered correct if:

✔ Intent updates correctly after 3 clicks
✔ Cache never returns stale destination
✔ Recommendations always reflect latest intent
✔ No old destination appears as dominant after switch

❌ Do NOT:
Do not modify SVD weighting
Do not change ranking logic unless cache/intent is proven broken
Only observe + report + identify root cause
