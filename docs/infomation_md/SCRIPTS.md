# SCRIPTS & TEST SCENARIOS

## 📋 Kịch Bản Đặt Phòng với AI LLM

### 1. Kịch Bản: Gia Đình Du Lịch Biển (FAMILY + SEA)

**Conversation Flow:**

```
User: "Tìm chỗ nghỉ cho gia đình 2 người lớn 2 trẻ em ở Nha Trang, có hồ bơi"
AI: [Tìm kiếm với filters: location=Nha Trang, suitableFor=FAMILY, amenities=pool]
   → Gợi ý: Grand Nha Trang Resort 45, Luxury Nha Trang Hotel 78

User: "Cái nào gần biển hơn?"
AI: [Context: Nha Trang + previous results]
   → Filter thêm: beachfront=true, beach_access=true
   → Trả lời: "Grand Nha Trang Resort 45 có private beach, cách biển 50m"

User: "Giá bao nhiêu cho 3 đêm?"
AI: [Tính toán: basePrice × 3 nights]
   → Trả lời: "Khoảng 9.000.000đ cho 3 đêm (3.000.000đ/đêm)"

User: "Đặt luôn"
AI: [Create booking]
   → checkIn: hôm nay + 3 days, checkOut: +3 days, adults=2, children=2
```

**Nơi có thể đặt (từ database):**

- `Luxury Nha Trang Resort 45` (categoryId=3, suitableFor=[FAMILY], amenities=[pool, sea_view, kids_club])
- `Grand Nha Trang Hotel 78` (categoryId=1, amenities=[pool, beachfront, restaurant])
- `Charming Nha Trang Villa 23` (categoryId=4, suitableFor=[FAMILY, GROUP])

---

### 2. Kịch Bản: Couple Lãng Mạn Núi (COUPLE + MOUNTAIN)

**Conversation Flow:**

```
User: "Tìm homestay lãng mạn ở Đà Lạt cho 2 người"
AI: [Filters: location=Đà Lạt, suitableFor=COUPLE, categoryId=2, tags=romantic]
   → Gợi ý: Cozy Đà Lạt Homestay 12, Romantic Đà Lạt Nhà Dân 67

User: "Có lò sưởi và view núi không?"
AI: [Context + Filter: amenities=[fireplace, mountain_view]]
   → "Cozy Đà Lạt Homestay 12 có lò sưởi + view Langbiang tuyệt đẹp"

User: "Chốt cái đó từ 14/2 đến 16/2"
AI: [Check availability + Create booking]
   → checkIn: 2026-02-14, checkOut: 2026-02-16, nights=2
```

**Nơi có thể đặt:**

- `Cozy Đà Lạt Homestay 12` (tags=[romantic], amenities=[fireplace, mountain_view])
- `Luxury Đà Lạt Villa 89` (categoryId=4, suitableFor=[COUPLE], amenities=[bathtub, balcony])
- `Peaceful Đà Lạt Bungalow 34` (categoryId=6, tags=[peaceful, romantic])

---

### 3. Kịch Bản: Business Trip Thành Phố (BUSINESS + CITY)

**Conversation Flow:**

```
User: "Cần khách sạn công tác ở Hà Nội, gần Hồ Gươm, có wifi tốt"
AI: [Filters: location=Hà Nội, suitableFor=BUSINESS, nearbyLandmarks=Hồ Gươm, amenities=wifi]
   → Gợi ý: Modern Hà Nội Hotel 56, Grand Hà Nội Plaza 89

User: "Có phòng làm việc riêng không?"
AI: [Filter: amenities=workspace]
   → "Modern Hà Nội Hotel 56 có workspace + printer miễn phí"

User: "Book 5 đêm từ ngày mai"
AI: [Create booking]
   → checkIn: tomorrow, nights=5, contactDetails, adults=1
```

**Nơi có thể đặt:**

- `Modern Hà Nội Hotel 56` (suitableFor=[BUSINESS], amenities=[wifi, workspace, 24h_reception])
- `Boutique Hà Nội Suite 23` (categoryId=1, nearbyLandmarks=[Hồ Gươm, Lăng Bác])
- `Classic Hà Nội Apartment 78` (categoryId=5, amenities=[wifi, kitchen, workspace])

---

### 4. Kịch Bản: Solo Backpacker Tiết Kiệm (SOLO + BUDGET)

**Conversation Flow:**

```
User: "Tìm chỗ rẻ ở Hội An dưới 500k/đêm, có thể thuê xe máy"
AI: [Filters: location=Hội An, price<500000, suitableFor=SOLO, amenities=free_motorbike_rental]
   → Gợi ý: Hidden Hội An Dorm 12, Budget Hội An Hostel 45

User: "Cái nào gần phố cổ?"
AI: [Context + nearbyLandmarks=Phố Cổ]
   → "Hidden Hội An Dorm 12 cách phố cổ 5 phút đi bộ"

User: "Ok lấy 1 đêm thôi"
AI: [Create booking]
   → nights=1, adults=1, children=0
```

**Nơi có thể đặt:**

- `Hidden Hội An Dorm 12` (categoryId=7, tags=[budget], amenities=[free_motorbike_rental])
- `Peaceful Hội An Homestay 67` (categoryId=2, price=400000, suitableFor=[SOLO])
- `Cozy Hội An House 89` (nearbyLandmarks=[Phố Cổ, Chùa Cầu])

---

### 5. Kịch Bản: Nhóm Bạn Party (GROUP + SEA)

**Conversation Flow:**

```
User: "Tìm villa ở Phú Quốc cho 8 người, có BBQ và karaoke"
AI: [Filters: location=Phú Quốc, suitableFor=GROUP, maxGuests>=8, amenities=[bbq_area, karaoke_room]]
   → Gợi ý: Grand Phú Quốc Villa 34, Luxury Phú Quốc Mansion 56

User: "Có hồ bơi riêng không?"
AI: [Filter: amenities=pool + categoryId=4]
   → "Grand Phú Quốc Villa 34 có hồ bơi riêng + view biển"

User: "Perfect! Book 4 đêm cuối tuần sau"
AI: [Create booking]
   → checkIn: next_weekend, nights=4, adults=8
```

**Nơi có thể đặt:**

- `Grand Phú Quốc Villa 34` (categoryId=4, maxGuests=10, amenities=[pool, bbq_area, karaoke_room])
- `Luxury Phú Quốc Mansion 56` (suitableFor=[GROUP, PARTY], amenities=[private_beach, event_space])
- `Royal Phú Quốc Resort 78` (categoryId=3, maxGuests=12, amenities=[pool, spa, karaoke_room])

---

### 6. Kịch Bản: Eco-Friendly Sustainable (SUSTAINABLE)

**Conversation Flow:**

```
User: "Tìm chỗ thân thiện môi trường ở Ninh Bình, dùng năng lượng mặt trời"
AI: [Filters: location=Ninh Bình, tags=sustainable, amenities=[solar_power, rainwater_harvesting]]
   → Gợi ý: Peaceful Ninh Bình Bungalow 23, Hidden Ninh Bình Lodge 45

User: "Có cho mang thú cưng không?"
AI: [Filter: amenities=pets_allowed]
   → "Peaceful Ninh Bình Bungalow 23 cho phép mang thú cưng, có pet bed"

User: "Đặt 2 đêm cho tôi với chó"
AI: [Create booking + metadata: pet=true]
   → adults=1, nights=2, specialRequests="Có mang chó"
```

**Nơi có thể đặt:**

- `Peaceful Ninh Bình Bungalow 23` (tags=[sustainable, peaceful], amenities=[solar_power, pets_allowed])
- `Hidden Ninh Bình Lodge 45` (amenities=[plastic_free, local_sourcing, garden])
- `Charming Ninh Bình Wooden Cabin 67` (categoryId=6, tags=[sustainable], amenities=[rainwater_harvesting])

---

### 7. Kịch Bản: Hủy Phòng Linh Hoạt (FLEXIBLE_CANCELLATION)

**Conversation Flow:**

```
User: "Tìm khách sạn ở Đà Nẵng hủy miễn phí, chưa chắc đi"
AI: [Search policies text: "Hủy miễn phí" hoặc "Hủy linh hoạt"]
   → Gợi ý: Modern Đà Nẵng Hotel 12 (policies: "Hủy miễn phí trước 24h")

User: "Cần gần biển Mỹ Khê"
AI: [Context + nearbyLandmarks=Biển Mỹ Khê]
   → "Modern Đà Nẵng Hotel 12 cách Mỹ Khê 200m"

User: "Book thử 2 đêm xem"
AI: [Create booking + remind about cancellation policy]
   → "Đã đặt! Nhớ hủy trước 24h nếu đổi kế hoạch nhé"
```

**Nơi có thể đặt:**

- `Modern Đà Nẵng Hotel 12` (policies="Hủy miễn phí trước 24h", nearbyLandmarks=[Biển Mỹ Khê])
- `Luxury Đà Nẵng Resort 78` (policies="Hủy linh hoạt trong vòng 3 ngày")
- `Boutique Đà Nẵng Suite 45` (cancellationRate=0.05, flexible policy)

---

## 🗺️ Danh Sách Locations & Best Matches

### Biển (SEA)

| Location  | Best For            | Categories       | Price Range |
| --------- | ------------------- | ---------------- | ----------- |
| Nha Trang | FAMILY, COUPLE      | Resort, Hotel    | 2M - 8M     |
| Phú Quốc  | GROUP, LUXURY       | Villa, Resort    | 5M - 15M    |
| Hạ Long   | COUPLE, SIGHTSEEING | Hotel, Cruise    | 3M - 10M    |
| Quy Nhơn  | PEACEFUL, SOLO      | Homestay, Resort | 1M - 5M     |

### Núi (MOUNTAIN)

| Location | Best For          | Categories       | Price Range |
| -------- | ----------------- | ---------------- | ----------- |
| Sapa     | COUPLE, ADVENTURE | Homestay, Lodge  | 500K - 3M   |
| Đà Lạt   | ROMANTIC, FAMILY  | Homestay, Villa  | 800K - 5M   |
| Tam Đảo  | PEACEFUL, WEEKEND | Bungalow, Resort | 1M - 4M     |

### Thành Phố (CITY)

| Location | Best For             | Categories          | Price Range |
| -------- | -------------------- | ------------------- | ----------- |
| Hà Nội   | BUSINESS, CULTURE    | Hotel, Apartment    | 1M - 8M     |
| TP.HCM   | BUSINESS, SHOPPING   | Hotel, Serviced Apt | 1.5M - 10M  |
| Đà Nẵng  | BEACH + CITY         | Hotel, Resort       | 2M - 7M     |
| Hội An   | CULTURE, PHOTOGRAPHY | Homestay, Boutique  | 800K - 4M   |

---

## 🎯 Test Cases cho AI Memory

### Case 1: Context Retention (Nhớ địa điểm)

```
User: "Tìm homestay ở Sapa"
AI: [Remembers: location=Sapa]

User: "Có lò sưởi không?"
AI: [Should search: Sapa + fireplace] ✓ PASS if correct
```

### Case 2: Implicit Filter (Lọc ngầm)

```
User: "Tìm nơi cho gia đình ở Nha Trang"
AI: [Auto filter: suitableFor=FAMILY]

User: "Gần biển"
AI: [Sapa + FAMILY + beachfront] ✓ PASS if correct
```

### Case 3: Price Negotiation (Tính giá)

```
User: "Cái này giá bao nhiêu?"
AI: [Must remember which hotel from previous response]
   → Correct answer: basePrice from that hotel ✓
```

### Case 4: Booking Confirmation (Xác nhận đặt)

```
User: "Chốt cái đầu tiên"
AI: [Must know #1 from last search results]
   → Create booking with correct hotelId ✓
```

---

## 📊 Expected AI Behavior Metrics

| Metric                     | Target | Test Method                          |
| -------------------------- | ------ | ------------------------------------ |
| Context Retention          | >90%   | Ask follow-up without location       |
| Correct Filter Application | >85%   | Check if suitableFor/amenities match |
| Price Calculation Accuracy | 100%   | Verify basePrice × nights            |
| Booking Success Rate       | >95%   | Track successful bookings            |
| Hallucination Rate         | <5%    | Don't make up hotels not in DB       |

---

## 🔧 Debug Commands

```bash
# Test Redis Session
redis-cli GET "chat:session:{userId}"

# Check MongoDB Bookings
mongosh --eval 'db.bookings.find().sort({createdAt:-1}).limit(5)'

# Verify PostgreSQL Sync
psql -d stazy -c "SELECT * FROM bookings ORDER BY \"createdAt\" DESC LIMIT 5;"

# Clear AI Memory
curl -X DELETE http://localhost:8001/chat/clear/{userId}
```
