# AI/SEARCH MODULE AUDIT REPORT

**Author:** Senior Software Architect  
**Date:** 2026-06-17

---

## 1. EXECUTIVE FINDING

### Classification: **HYBRID (JSON + In-Memory Vector Search, with unused pgvector columns)**

The system has PostgreSQL `vector(512)` columns defined in the Prisma schema with the pgvector extension enabled, **BUT** the actual search service (`apps/search-service/`) loads all vectors from a JSON file into RAM at startup and computes cosine similarity in Python memory. The PostgreSQL vector columns are never queried for similarity search.

---

## 2. VECTOR STORAGE IMPLEMENTATION

### Search: All search patterns

#### Pattern: `HOTEL_VECTORS`

**File:** `apps/search-service/main.py`  
**Line:** 156-162  
**Code:**

```python
HOTEL_VECTORS = []
try:
    with open("jsons/__hotel_vectors.json", "r", encoding="utf-8") as f:
        HOTEL_VECTORS = json.load(f)
    print(f"✅ Loaded {len(HOTEL_VECTORS)} hotel vectors into memory.")
except FileNotFoundError:
    print("⚠️ Warning: hotel_vectors.json not found. Search results might be empty.")
```

**Explanation:** Hotel vectors are loaded from a JSON file into a global Python list at service startup. The vectors remain in RAM for the entire service lifetime.

#### Pattern: `__hotel_vectors.json`

**File:** `apps/search-service/jsons/__hotel_vectors.json`
**Evidence:** Binary file containing ~400KB of vector data. Each entry has `id`, `imageVector` (array of ~512 float values), and `policiesVector` (array of ~512 float values).

#### Pattern: `json.load` (JSON file loading)

**File:** `apps/search-service/process_data.py`  
**Lines:** 103-104, 138-140  
**Code:**

```python
with open(input_file, "r", encoding="utf-8") as f:
    stays = json.load(f)
...
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(processed_data, f)
```

**Explanation:** The `process_data.py` script reads hotels from `jsons/__homeStay.json`, generates vectors using CLIP, and writes them to `jsons/__hotel_vectors.json`. This is a batch processing script, NOT a real-time pipeline.

#### Pattern: `json.load` (Interaction/recommendation files)

**File:** `apps/search-service/src/recommend.py`  
**Lines:** 348-352  
**Code:**

```python
def get_all_hotels():
    global _hotels_cache
    if _hotels_cache is None:
        try:
            with open(HOTELS_FILE, "r", encoding="utf-8") as f:
                _hotels_cache = json.load(f)
        except:
            _hotels_cache = []
    return _hotels_cache
```

**Explanation:** Hotels data is also loaded from `jsons/__homeStay.json` JSON file. Same pattern for interactions (`jsons/__interactions.json`). These are cached in memory.

#### Pattern: `pgvector` / `vector(512)` / Postgres Vector Columns

**File:** `packages/product-db/prisma/schema.prisma`  
**Lines:** 6-12, 212-217  
**Code:**

```prisma
generator client {
  ...
  previewFeatures = ["postgresqlExtensions"] // Cần thiết cho pgvector
}

datasource db {
  ...
  extensions = [vector]
}

model Hotel {
  ...
  // --- AI / VECTOR FIELDS ---
  imageVector   Unsupported("vector(512)")?
  policiesVector Unsupported("vector(512)")?
}
```

**FOUND:** PostgreSQL has `vector(512)` columns defined. The pgvector extension is enabled in the Prisma datasource. However, these columns are marked as `Unsupported` meaning the Prisma client cannot query them directly. **They exist but are not used for any similarity search queries.**

#### Pattern: `SentenceTransformer` / `CLIP`

**File:** `apps/search-service/src/embedding.py`  
**Lines:** 1-7, 10-19  
**Code:**

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("clip-ViT-B-32")

def get_image_vector(url: str):
    response = requests.get(url, timeout=10)
    img = Image.open(BytesIO(response.content))
    return model.encode(img).tolist()

def get_text_vector(text: str):
    return model.encode(text).tolist()
```

**Explanation:** CLIP model (`clip-ViT-B-32`) is used to generate both image and text vectors. Output dimension: 512.

#### Pattern: `cosine_similarity`

**File:** `apps/search-service/src/search.py`  
**Lines:** 5-21  
**Code:**

```python
from sentence_transformers import util
import torch

def find_top_matches(query_vector, gallery_items, top_k=10):
    results = []
    q_vec = torch.tensor(query_vector)
    for item in gallery_items:
        i_vec = torch.tensor(item["imageVector"])
        score = util.cos_sim(q_vec, i_vec).item()
        results.append({"id": item["id"], "score": score})
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]
```

**Explanation:** Similarity is computed **in Python memory** using `sentence_transformers.util.cos_sim()` (which wraps PyTorch). This iterates over all `gallery_items` (loaded from RAM `HOTEL_VECTORS`) and computes cosine similarity one by one.

**File:** `apps/search-service/src/recommend.py`  
**Line:** 14, 437, 450  
**Code:**

```python
from sklearn.metrics.pairwise import cosine_similarity
...
sim_matrix = cosine_similarity(uim['matrix'])  # User similarity
sim_matrix = cosine_similarity(item_matrix)     # Item similarity
```

**Explanation:** Sklearn `cosine_similarity` is used for collaborative filtering (user-user and item-item similarity matrices), not for CLIP vector search.

#### Pattern: `SELECT ... embedding` / `ORDER BY embedding` / `<=> operator`

**NOT FOUND:** No PostgreSQL queries using `<=>` (cosine distance operator), `ORDER BY embedding`, or any SQL-level vector operations exist anywhere in the codebase.

#### Pattern: `load_json`

**NOT FOUND:** No function named `load_json` exists in the search service.

---

## 3. WHERE ARE EMBEDDINGS STORED?

| Question                                   | Answer                  | Evidence                                                                                                                                                          |
| ------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Are embeddings stored in JSON files?       | **✅ YES**              | `apps/search-service/jsons/__hotel_vectors.json` contains all image and policy vectors                                                                            |
| Are embeddings loaded into RAM on startup? | **✅ YES**              | `apps/search-service/main.py:156-162` loads `HOTEL_VECTORS` global list at startup                                                                                |
| Are embeddings stored in PostgreSQL?       | **✅ YES (but unused)** | `packages/product-db/prisma/schema.prisma:212-217` defines `imageVector Unsupported("vector(512)")` and `policiesVector Unsupported("vector(512)")` columns       |
| Is pgvector extension actually used?       | **❌ NO**               | No SQL queries use `<=>`, `ORDER BY embedding`, or any pgvector operations. The columns exist but are never queried for similarity                                |
| Are pgvector columns populated?            | **✅ YES**              | The `process_data.py` script generates vectors, but exports to JSON file only. Columns in PostgreSQL may exist from seed data but are never queried via pgvector. |

---

## 4. SEMANTIC SEARCH FLOW

### Complete Execution Path

```
Text Query
  ↓
  /recommend/{user_id} endpoint (main.py:243-303)
  ↓
  Builds hotels list from HOTEL_VECTORS global (in-memory JSON data)
  ↓
  Calls get_recommendations_for_user() (src/recommend.py)
```

#### Step 1: API Entry Point

**File:** `apps/search-service/main.py`  
**Function:** `get_recommendations` (line 243)  
**Code:**

```python
@app.get("/recommend/{user_id}")
async def get_recommendations(user_id, ...):
    # Build hotels list from vector database
    hotels_for_recommend = []
    for hv in HOTEL_VECTORS:
        hotel_data = { ... }
        hotels_for_recommend.append(hotel_data)

    results = get_recommendations_for_user(
        user_id=user_id,
        interactions_file_ignored=None,
        hotel_vectors=hotels_for_recommend,
        ...
    )
```

**Key insight:** The vector data is transformed from `HOTEL_VECTORS` (in-memory JSON) into a flat dictionary format for the recommendation engine.

#### Step 2: Embedding Generation

For text search:

- **NOT text-to-vector search.** The `/recommend` endpoint does not use `get_text_vector()` from `embedding.py`.
- The system uses **collaborative filtering + content-based filtering** (SVD model + weighted scoring), NOT CLIP vector similarity.
- Text queries go through `/agent/chat` → `run_agent_logic()` → LLM-based intent detection.

For image search:
**File:** `apps/search-service/main.py`  
**Functions:** `search_base64` (line 185), `search_url` (line 207)  
**Code:**

```python
@app.post("/search-by-base64")
async def search_base64(data: dict):
    base64_data = data.get("image")
    image_bytes = base64.b64decode(base64_data)
    query_vector = get_image_vector(image_bytes)
    return find_top_matches(query_vector, HOTEL_VECTORS)

@app.post("/search-by-image-url")
async def search_url(data: dict):
    url = data.get("image_url")
    query_vector = get_image_vector(url)
    return find_top_matches(query_vector, HOTEL_VECTORS)
```

#### Step 3: Vector Retrieval (from RAM)

**File:** `apps/search-service/main.py`  
**Variable:** `HOTEL_VECTORS` (line 156)  
All vectors are already in the `HOTEL_VECTORS` list loaded from `jsons/__hotel_vectors.json`.

#### Step 4: Similarity Calculation

**File:** `apps/search-service/src/search.py`  
**Function:** `find_top_matches` (line 5)  
**Code:**

```python
def find_top_matches(query_vector, gallery_items, top_k=10):
    results = []
    q_vec = torch.tensor(query_vector)
    for item in gallery_items:
        i_vec = torch.tensor(item["imageVector"])
        score = util.cos_sim(q_vec, i_vec).item()
        results.append({"id": item["id"], "score": score})
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]
```

**Similarity is computed A. In Python memory using cosine_similarity (sentence_transformers.util.cos_sim)**

#### Step 5: Top-K Ranking

**File:** `apps/search-service/src/search.py`  
**Line:** 20-21  
Results are sorted descending by score and the top_k are returned.

---

## 5. VISUAL SEARCH FLOW

```
Image Upload
  ↓
  POST /search-by-base64 or POST /search-by-image-url
  ↓
  get_image_vector() — Downloads image from URL or decodes base64
  ↓
  model.encode(img).tolist() — CLIP model generates 512-dim vector
  ↓
  find_top_matches() — Cosine similarity against HOTEL_VECTORS (in memory)
  ↓
  Returns [{id: int, score: float}] sorted by score descending
```

### Step 1: Image Input

**File:** `apps/search-service/src/embedding.py`  
**Function:** `get_image_vector` (line 10)  
**Code:**

```python
def get_image_vector(url: str):
    response = requests.get(url, timeout=10)
    img = Image.open(BytesIO(response.content))
    return model.encode(img).tolist()
```

**File:** `apps/search-service/process_data.py`  
**Function:** `get_image_vector` (line 28) - Has a more robust version that handles local paths and URLs.

### Step 2: CLIP Encoding

**File:** `apps/search-service/src/embedding.py`  
**Model:** `SentenceTransformer("clip-ViT-B-32")`  
**Output:** 512-dimensional float vector

### Step 3: Vector Retrieval

**Source:** `HOTEL_VECTORS` global variable (loaded from `jsons/__hotel_vectors.json`)

### Step 4: Similarity Search

**File:** `apps/search-service/src/search.py`  
**Function:** `find_top_matches`  
**Method:** `sentence_transformers.util.cos_sim()` (PyTorch-based cosine similarity)  
**Location:** **A. In Python memory** - iterates over all items in the RAM-based list

### Step 5: Result Ranking

**File:** `apps/search-service/src/search.py`  
**Line:** 20-21  
Descending sort by score, limited to top_k.

---

## 6. FINAL VERDICT

### Classification: **Option A - JSON + In-Memory Vector Search** (with unused pgvector columns)

**Confidence Score: 100%**

| Characteristic                               | Status       | Evidence                                                           |
| -------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| Embeddings stored in .json files             | ✅ YES       | `apps/search-service/jsons/__hotel_vectors.json`                   |
| Loaded into RAM at startup                   | ✅ YES       | `main.py:156-162` - `HOTEL_VECTORS = json.load(f)`                 |
| Similarity calculated in Python              | ✅ YES       | `search.py:16` - `util.cos_sim(q_vec, i_vec)` in Python memory     |
| No real Vector Database usage                | ✅ YES       | No pgvector queries exist anywhere                                 |
| PostgreSQL has vector(512) columns           | ✅ YES       | `schema.prisma:212-213` - `imageVector Unsupported("vector(512)")` |
| pgvector extension enabled                   | ✅ YES       | `schema.prisma:11` - `extensions = [vector]`                       |
| pgvector columns populated from process_data | ❌ NO        | `process_data.py` exports only to JSON, not to PostgreSQL          |
| Similarity via SQL (<=> operator)            | ❌ NOT FOUND | No such query exists                                               |
| Vector indexes used                          | ❌ NOT FOUND | No pgvector index creation exists                                  |

### Summary

The architecture is **Option A (JSON + In-Memory Vector Search)**, but with the notable presence of unused pgvector columns in the PostgreSQL schema. This creates a **misleading dual architecture**:

1. **What actually runs:** The search service loads vector embeddings from `jsons/__hotel_vectors.json` into RAM at startup. All similarity searches (`find_top_matches`) iterate over this in-memory list and compute cosine similarity using PyTorch in Python. No pgvector queries are ever executed.

2. **What exists but is unused:** The Prisma schema defines `imageVector Unsupported("vector(512)")` and `policiesVector Unsupported("vector(512)")` columns in the `hotels` table with pgvector extension enabled. However, no code path ever writes vector data to these columns or queries them for similarity. The `process_data.py` script that generates vectors only exports to JSON, never to PostgreSQL.

3. **Recommendation Engine:** The recommend system (`src/recommend.py`) uses a completely different approach - SVD collaborative filtering + content-based scoring with weighted features (destination, price, amenities, etc.). It does NOT use CLIP vector similarity for recommendations. It reads interactions from PostgreSQL but hotel data from JSON files.

4. **Hybrid elements in PostgreSQL:** Some PostgreSQL reads happen (e.g., `train_real.py` trains SVD model from PostgreSQL interactions, `recommend.py` reads interactions from PostgreSQL as source of truth), but vector-specific operations all happen in Python memory from JSON data.
