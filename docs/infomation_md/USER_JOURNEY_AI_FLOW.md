# 🎯 USER JOURNEY - AI RECOMMENDATION FLOW

## 📱 FLOW CHI TIẾT

### 1️⃣ **Lần Đầu Vào Website (Guest)**

```
User → Homepage
├─ HeroSection
├─ PersonalizedSection
│   └─ Popular Hotels (Top rated) ⭐
├─ ExplorePlace
└─ StayListing
```

**Không có:**

- ❌ Onboarding Modal
- ❌ AI Recommendations

---

### 2️⃣ **Sau Khi Đăng Ký/Đăng Nhập (User Mới)**

```
User Login
↓
Check: userPreference.interestedCategories?
↓ NO (empty)
Hiện OnboardingModal
├─ Chọn categories (Khách sạn, Resort, Homestay...)
├─ Submit
└─ Tạo 3 VIEW interactions cho mỗi category (implicit feedback)
```

**Action Backend:**

```typescript
// saveUserInterests() → user-preference.ts
1. Lưu categories vào UserPreference
2. Lấy 3 hotels mẫu từ mỗi category
3. Tạo Interaction type="VIEW" (source: "onboarding_preference")
```

**Kết quả:**

- ✅ User có preferences
- ✅ User có 9-21 interactions (3 hotels × 3-7 categories)

---

### 3️⃣ **Sau Onboarding → Homepage**

```
Homepage
├─ HeroSection
├─ PersonalizedSection (Content-based) ⭐
│   └─ Hotels matching user's categories
│       - WHERE category IN ['khach-san', 'resort']
│       - ORDER BY reviewStar DESC
├─ AIRecommendationsSection
│   └─ KHÔNG HIỂN THỊ (chưa đủ 5 interactions thật)
│       - Onboarding tạo fake interactions
│       - Cần real interactions: VIEW, LIKE, BOOK
├─ ExplorePlace
└─ StayListing
```

**Lý do AI chưa hiện:**

```typescript
const MIN_INTERACTIONS = 5; // Ngưỡng tối thiểu
const realInteractions = await prisma.interaction.count({
  where: {
    userId: user.id,
    type: { in: ["VIEW", "LIKE", "BOOK", "RATING"] },
    // ❌ KHÔNG TÍNHOnboarding interactions
  },
});

if (realInteractions < MIN_INTERACTIONS) {
  return null; // Không hiện AI section
}
```

---

### 4️⃣ **User Tương Tác Với Hotels**

#### **A. Click vào Hotel Detail**

```typescript
// Hotel Card → onClick
await trackInteraction(hotelId, "VIEW");

// Backend tạo:
Interaction {
  userId: "user_xxx",
  hotelId: 123,
  type: "VIEW",
  timestamp: now,
}
```

#### **B. Like Hotel**

```typescript
await trackInteraction(hotelId, "LIKE");
```

#### **C. Book Hotel**

```typescript
// Sau khi thanh toán thành công
await trackInteraction(hotelId, "BOOK");
```

#### **D. Rating/Review**

```typescript
await trackInteraction(hotelId, "RATING", { rating: 5 });
```

---

### 5️⃣ **Đủ Interactions → AI Section Xuất Hiện**

```
User có ≥5 interactions thực tế
↓
Reload Homepage
↓
Check: getAIRecommendations()
├─ Count interactions: 5
├─ ✅ Đủ ngưỡng
├─ Gọi AI Service: /recommend/{userId}
└─ Return 7 hotels

Homepage
├─ HeroSection
├─ PersonalizedSection (Content-based) ⭐
│   └─ Hotels từ preferences
├─ AIRecommendationsSection (Collaborative Filtering) 🧠
│   └─ Hotels từ SVD model
│       Badge: "Collaborative Filtering"
│       Info: "✨ Fresh AI predictions based on 5 interactions"
├─ ExplorePlace
└─ StayListing
```

---

## 🔄 LOGIC KIỂM TRA INTERACTIONS

### Backend Check (get-ai-recommendations.ts)

```typescript
// Bước 1: Kiểm tra số interactions
const interactionCount = await prisma.interaction.count({
  where: {
    userId: user.id,
    type: { in: ["VIEW", "LIKE", "BOOK", "RATING"] },
  },
});

// Bước 2: So sánh với ngưỡng
const MIN_INTERACTIONS = 5;
if (interactionCount < MIN_INTERACTIONS) {
  console.log(`Not enough: ${interactionCount}/5`);
  return null; // → Section không hiển thị
}

// Bước 3: Gọi AI nếu đủ
const aiResults = await fetch(`/recommend/${userId}`);
```

---

## 📊 TRACKING POINTS

| Action          | Type         | Khi nào track                         |
| --------------- | ------------ | ------------------------------------- |
| **View Detail** | VIEW         | Click vào hotel card → `/hotels/[id]` |
| **Like**        | LIKE         | Click nút ❤️                          |
| **Book**        | BOOK         | Thanh toán thành công                 |
| **Rating**      | RATING       | Submit review/rating                  |
| **Search**      | SEARCH_QUERY | User tìm kiếm hotels                  |

---

## 🎓 TRAINING WORKFLOW

### Khi Nào Train Model?

#### **Auto (Cronjob)**

```bash
# Chạy lúc 02:00 mỗi ngày
Check: Có ≥50 interactions mới trong 24h?
├─ YES → Train model (python train_real.py)
└─ NO → Skip
```

#### **Manual (Admin Dashboard)**

```bash
Admin → TodoList → "Train Now"
├─ Check: Có ≥10 interactions tổng?
│   ├─ YES → python train_real.py
│   └─ NO → Error "Chưa đủ dữ liệu"
└─ Lưu SystemMetric (RMSE, Precision@5...)
```

---

## 📈 PROGRESSION TIMELINE

```
Day 1: User đăng ký
  ↓
  Onboarding → Chọn 3 categories
  ↓
  PersonalizedSection hiện (Content-based)
  ❌ AI Section chưa hiện

Day 1: User browse
  ↓
  Click 5 hotels → 5 VIEW interactions
  ↓
  Reload page
  ↓
  ✅ AI Section xuất hiện!

Day 2: Cronjob train (02:00)
  ↓
  Check: 50+ interactions?
  ├─ YES → Train SVD model
  └─ Update Recommendation cache

Day 2: User quay lại
  ↓
  AI Section dùng model mới
  ↓
  Recommendations chính xác hơn
```

---

## 🔧 CONFIGURATION

### Thay Đổi Ngưỡng

**File:** `get-ai-recommendations.ts`

```typescript
// Tăng/giảm tùy nhu cầu
const MIN_INTERACTIONS = 5; // Mặc định: 5

// Development: 3 (test dễ)
// Production: 10 (chất lượng cao)
```

### Thời Gian Cache

```typescript
// 1 giờ (mặc định)
const CACHE_TIME = 3600000; // ms

// Giảm để refresh nhanh: 1800000 (30 phút)
// Tăng để tiết kiệm: 7200000 (2 giờ)
```

---

## 🎯 SUMMARY

| Stage                | PersonalizedSection | AI Recommendations | Interactions |
| -------------------- | ------------------- | ------------------ | ------------ |
| **Guest**            | Popular hotels ⭐   | ❌ Hidden          | 0            |
| **After Login**      | Popular hotels ⭐   | ❌ Hidden          | 0            |
| **After Onboarding** | Category-based ⭐   | ❌ Hidden          | 0 real       |
| **After 5 views**    | Category-based ⭐   | ✅ Shown 🧠        | ≥5           |
| **After training**   | Category-based ⭐   | ✅ Better 🧠       | Growing      |

**Key Point:** AI chỉ hiện khi user **chủ động tương tác**, không phải chỉ onboarding!
