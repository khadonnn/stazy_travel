# Recommendation Fix – 2026-05-19

## Bug: Always showing Cần Thơ hotels regardless of user interactions

### Root Causes (3 layers)

#### Layer 1: Time Decay = 0.0 (interactions > 30 min invisible)

Both `recommend.py` and `get-ai-recommendations.ts` returned `0.0` for interactions older than 30 minutes → intent detection completely failed.

#### Layer 2: Session Decay Too Aggressive (30 min)

Session expired after 30 minutes of inactivity → user intent lost quickly.

#### Layer 3: No Hard Session Routing + Vietnamese char mismatch (THE MAIN BUG)

Previous architecture:

```
ALL hotels → historical scoring → soft boost (1.6x) → rerank
```

Problem: historical `preferred_destinations` from `build_user_profile()` gave Cần Thơ 0.92 base score. Session destination (e.g. Vũng Tàu) got 0.65 + 1.6x boost = ~1.04. But `content_score` still heavily weighted historical Cần Thơ → Cần Thơ still won.

**Vietnamese character mismatch**: `.toLowerCase()` comparison fails when one side has diacritics and the other doesn't:

- Hotel: `"Vũng Tàu"` → `"vũng tàU"`
- Session: `"Vũng Tàu"` → `"vũng tàU"`
- BUT if DB stores `"Vung Tau"` → `"vung tau"` ≠ `"vũng tàU"`

### Correct Architecture (implemented)

```
STRONG SESSION INTENT detected (2+ high-intent interactions)
  → HARD FILTER: ONLY session destination candidates allowed
  → normalizeDest() for Vietnamese-safe comparison
  → No cross-city diversity
  → Intra-destination diversity (different categories/price ranges)

MEDIUM/WEAK INTENT (recency/longterm)
  → Soft preference: session dest ranked first, others follow

NO INTENT
  → Cross-destination diversity (original behavior)
```

---

### Files Modified

| File                        | Changes                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `get-ai-recommendations.ts` | **normalizeDest()** function: NFD normalization, remove diacritics, lowercase, trim                                       |
| `get-ai-recommendations.ts` | `getTimeDecayWeight()`: never returns 0.0 (min 0.1)                                                                       |
| `get-ai-recommendations.ts` | `SESSION_DECAY_MINUTES`: 30 → 120 (2 hours)                                                                               |
| `get-ai-recommendations.ts` | **HARD SESSION ROUTING**: `intent.source === "selected"` → hard filter candidates by session dest using `normalizeDest()` |
| `get-ai-recommendations.ts` | **Comprehensive debug logs** at every pipeline stage (see below)                                                          |
| `get-ai-recommendations.ts` | Prisma fallback: removed hard destination filter, fetches diverse pool                                                    |
| `recommend.py`              | `get_recommendations_for_user()`: HARD SESSION ROUTING                                                                    |
| `recommend.py`              | `_time_decay_weight()`: never returns 0.0 (min 0.1)                                                                       |
| `recommend.py`              | `SESSION_DECAY_MINUTES`: 30 → 120 (2 hours)                                                                               |

### Debug Logs Added (look for these in terminal)

```bash
[recommend] 🔍 INTENT DETECTED: dest="Cần Thơ" normalized="can tho" source=selected
[recommend] 🔍 RECENT INTERACTIONS (5):
  → ADD_TO_WISHLIST | hotel="Boutique Cần Thơ Villa 33" dest="Cần Thơ" ts=2026-05-19T...
[recommend] 🔍 PRISMA QUERY: 30 hotels loaded
[recommend] 🔍 CANDIDATE DESTS: Cần Thơ:15, Vũng Tàu:10, Đà Nẵng:5
[recommend] 🔍 SESSION DEST (raw): "Cần Thơ"
[recommend] 🔍 SESSION DEST (normalized): "can tho"
[recommend] 🔍 HOTEL DESTS (normalized): "Cần Thơ" → "can tho", "Vũng Tàu" → "vung tau"
[recommend] 🔍 TOP 10 SCORED:
  #1: "Boutique Cần Thơ Villa 33" dest="Cần Thơ" score=0.780
[recommend] 🔒 HARD ROUTING: session="Cần Thơ" (norm="can tho") | pool: 15/30 from session dest
[recommend] 🔒 SESSION HOTEL DESTS: ["Cần Thơ", "Cần Thơ", ...]
[recommend] ✅ HARD ROUTING result: Cần Thơ, Cần Thơ, Cần Thơ
```

### Verification

After user selects 3 hotels from same destination, check terminal for:

1. `🔍 INTENT DETECTED` → intent detected with normalized dest
2. `🔍 RECENT INTERACTIONS` → shows actual interaction types and hotel destinations
3. `🔍 CANDIDATE DESTS` → shows distribution of candidates
4. `🔍 SESSION DEST (normalized)` vs `🔍 HOTEL DESTS (normalized)` → must match
5. `🔒 HARD ROUTING` → pool count and session hotel dests
6. `✅ HARD ROUTING result` → final destinations

If intent not detected → check `detectSessionIntent()` logs.
If intent detected but `sessionHotels.length === 0` → destination string mismatch (use normalizeDest output to debug).

### Note on Recommendation Persistence

`prisma.recommendation` table exists but is NOT read by `getAIRecommendations()`. Only used in `tracking.ts` to invalidate cache. NOT a root cause.
