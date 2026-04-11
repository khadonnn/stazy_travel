# 🎯 RECOMMENDATION SYSTEM - Architecture

## 📊 Tổng Quan 2 Hệ Thống

### 1. **Personalized Section** (Content-based Filtering)

**File:** `personalized-section.tsx` + `get-personalized-hotels.ts`

**Mục đích:** Gợi ý dựa trên sở thích explicit của user

**Khi nào hiển thị:**

- ✅ **Guest user:** Show popular hotels (rating cao nhất)
- ✅ **User đã login nhưng chưa onboarding:** Show popular hotels
- ✅ **User đã chọn sở thích:** Filter theo categories đã chọn

**Logic:**

```typescript
if (!user) {
  return popularHotels; // Sắp xếp theo reviewStar
}

if (!userPreferences) {
  return popularHotels;
}

// Filter hotels khớp với categories user chọn
return hotelsMatchingPreferences;
```

**Icon:** ⭐ Sparkles (màu vàng)
**Title:** "Dành riêng cho bạn"

---

### 2. **AI Recommendations Section** (Collaborative Filtering)

**File:** `ai-recommendations-section.tsx` + `get-ai-recommendations.ts`

**Mục đích:** Gợi ý dựa trên hành vi của user tương tự (SVD model)

**Khi nào hiển thị:**

- ❌ **Guest user:** KHÔNG hiển thị
- ❌ **User chưa có interactions:** KHÔNG hiển thị
- ✅ **User có ít nhất 10 interactions:** Hiển thị AI recommendations
- ✅ **AI Service hoạt động:** Gọi Python API

**Logic:**

```typescript
if (!user) {
  return null; // Không hiển thị gì
}

// 1. Check cache (< 1h) → Dùng luôn
if (cachedRecommendations && isFresh) {
  return cachedHotels;
}

// 2. Gọi AI Service
const aiResults = await fetch("/recommend/{userId}");

// 3. Lưu cache vào bảng Recommendation
await saveCache(hotelIds);

return aiHotels;
```

**Icon:** 🧠 Brain (màu tím)
**Title:** "AI khuyến nghị cho bạn"
**Badge:** "Collaborative Filtering"

---

## 🔄 Luồng User Journey

### 1️⃣ **First Visit (Chưa login)**

```
Homepage
├─ HeroSection
├─ PersonalizedSection → Popular Hotels (Top rated)
├─ ExplorePlace
└─ StayListing
```

### 2️⃣ **After Login (Chưa onboarding)**

```
Homepage
├─ OnboardingModal → Hiện popup chọn sở thích
└─ (User chọn categories và submit)
```

### 3️⃣ **After Onboarding**

```
Homepage
├─ HeroSection
├─ PersonalizedSection → Hotels theo sở thích (Content-based)
│   - Khách sạn, Resort, Homestay (categories user chọn)
├─ AIRecommendationsSection → KHÔNG hiển thị (chưa có interactions)
├─ ExplorePlace
└─ StayListing
```

### 4️⃣ **After Interactions (VIEW, LIKE, BOOK)**

```
Homepage
├─ HeroSection
├─ PersonalizedSection → Hotels theo sở thích
├─ AIRecommendationsSection → AI gợi ý dựa trên hành vi ✨
│   - Sử dụng SVD model
│   - Cache 1 giờ
│   - Badge "Collaborative Filtering"
├─ ExplorePlace
└─ StayListing
```

---

## 🎨 UI Differences

| Feature        | Personalized         | AI Recommendations        |
| -------------- | -------------------- | ------------------------- |
| **Icon**       | ⭐ Sparkles (yellow) | 🧠 Brain (purple)         |
| **Title**      | "Dành riêng cho bạn" | "AI khuyến nghị cho bạn"  |
| **Badge**      | -                    | "Collaborative Filtering" |
| **Cache Info** | -                    | "💾 Cached 10:30 AM"      |
| **Background** | Default              | Subtle purple gradient    |

---

## 🔐 Onboarding Modal Logic

**File:** `onboarding-modal.tsx`

**Trigger:**

```typescript
useEffect(() => {
  if (isSignedIn) {
    const { isOnboarded } = await checkUserOnboarding();
    if (!isOnboarded) {
      setOpen(true); // Hiện modal
    }
  }
}, [isSignedIn]);
```

**Check logic:**

```typescript
// Backend: user-preference.ts
const userPref = await prisma.userPreference.findUnique({
  where: { userId: user.id },
});

const hasCategories = userPref?.interestedCategories?.length > 0;
return { isOnboarded: !!hasCategories };
```

**What happens after submit:**

1. Save categories vào `UserPreference`
2. Tạo 3 VIEW interactions cho mỗi category (implicit feedback)
3. Reload page
4. PersonalizedSection hiển thị hotels theo categories

---

## 📦 Database Tables

### `UserPreference`

```sql
userId: String (PK)
interestedCategories: String[] -- ["khach-san", "resort"]
favoriteAmenities: String[]
favoriteCities: String[]
```

### `Interaction`

```sql
id: Int (PK)
userId: String
hotelId: Int
type: Enum (VIEW, LIKE, BOOK, RATING)
metadata: JSON
timestamp: DateTime
```

### `Recommendation`

```sql
id: Int (PK)
userId: String (Unique)
hotelIds: Int[] -- [1, 5, 12, 20, 35, 42, 78]
score: JSON? -- {"1": 0.95, "5": 0.88, ...}
updatedAt: DateTime
```

---

## 🧪 Testing Scenarios

### Scenario 1: New User

```bash
1. Visit homepage → See popular hotels in PersonalizedSection
2. Sign up → OnboardingModal appears
3. Select "Khách sạn", "Resort" → Submit
4. Reload → PersonalizedSection shows hotels from those categories
5. AIRecommendationsSection NOT shown (no interactions yet)
```

### Scenario 2: Active User

```bash
1. User has 50+ interactions (VIEW, LIKE, BOOK)
2. AI Model trained (cronjob at 02:00 or manual train)
3. Visit homepage
4. PersonalizedSection: Content-based (preferences)
5. AIRecommendationsSection: Collaborative Filtering (behavior)
```

### Scenario 3: Cache Flow

```bash
1. First visit → Call AI Service → Save cache
2. Second visit (< 1h) → Use cache (fast)
3. Third visit (> 1h) → Call AI Service → Update cache
```

---

## 🚀 Admin Control

**Train AI Model:**

- Dashboard → TodoList → "Train Now" button
- Auto: Cronjob at 02:00 daily
- Manual: Admin can trigger anytime

**View Training Status:**

- Total interactions
- Last trained timestamp
- Metrics: RMSE, Precision@5, Recall@5

---

## 🎯 Summary

| Aspect         | Content-based     | Collaborative Filtering  |
| -------------- | ----------------- | ------------------------ |
| **Dữ liệu**    | User preferences  | User interactions        |
| **Thuật toán** | Category matching | SVD matrix factorization |
| **Hiển thị**   | Luôn luôn         | Chỉ khi có đủ data       |
| **Speed**      | Instant           | Cached (1h)              |
| **Accuracy**   | Good              | Better (learns patterns) |
