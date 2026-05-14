// =========================================
// ENUMS
// =========================================
Enum Role {
USER
AUTHOR
ADMIN
}

Enum AuthorRequestStatus {
PENDING
APPROVED
REJECTED
}

Enum HotelStatus {
DRAFT
PENDING
APPROVED
REJECTED
SUSPENDED
}

Enum TripType {
BUSINESS
FAMILY
COUPLE
SOLO
GROUP
}

Enum OutboxStatus {
PENDING
PROCESSING
SENT
FAILED
}

Enum BookingStatus {
PENDING
CONFIRMED
CANCELLED
COMPLETED
}

Enum PaymentMethod {
STRIPE
PAYPAL
VNPAY
BANK_TRANSFER
CASH_ON_CHECKIN
}

Enum PaymentStatus {
PENDING
SUCCEEDED
FAILED
REFUNDED
}

Enum InteractionType {
VIEW
LIKE
SHARE
ADD_TO_WISHLIST
BOOK
CLICK_BOOK_NOW
CANCEL
SEARCH_QUERY
FILTER_APPLIED
RATING
RATE_POSITIVE
RATE_NEGATIVE
}

Enum ReviewSentiment {
POSITIVE
NEGATIVE
NEUTRAL
}

Enum SenderRole {
USER
ADMIN
AI
}

// =========================================
// TABLES
// =========================================

Table User {
id varchar [primary key]
email varchar [unique]
password varchar [null]
name varchar
nickname varchar [null]
phone varchar [null]
gender varchar [null]
dob timestamp [null]
address varchar [null]
avatar varchar [null]
bgImage varchar [null]
jobName varchar [null]
desc text [null]
role Role [default: 'USER']
createdAt timestamp [default: `now()`]
updatedAt timestamp
}

Table AuthorRequest {
id varchar [primary key]
userId varchar
businessName varchar
businessType varchar
taxCode varchar [null]
phone varchar
email varchar
address varchar
identityCard varchar
identityImages varchar[]
reason text [null]
status AuthorRequestStatus [default: 'PENDING']
reviewedBy varchar [null]
reviewedAt timestamp [null]
rejectionReason text [null]
createdAt timestamp [default: `now()`]
updatedAt timestamp
}

Table UserPreference {
id integer [primary key]
userId varchar [unique]
interestedCategories varchar[]
favoriteAmenities varchar[]
favoriteCities varchar[]
avgPriceExpect decimal(12,2) [null]
preferredRatingMin float [null]
pastBookingCount integer [default: 0]
lastBookingAt timestamp [null]
updatedAt timestamp
}

Table Hotel {
id integer [primary key]
authorId varchar
categoryId integer
slug varchar [unique]
title varchar
roomName varchar [default: 'Standard Room']
featuredImage varchar
galleryImgs varchar[]
description text
fullDescription text [null]
address varchar
destination varchar
map json
nearbyLandmarks varchar[]
price decimal(12,2)
saleOff varchar [null]
saleOffPercent integer [default: 0]
maxGuests integer
bedrooms integer
bathrooms integer
amenities varchar[]
tags varchar[]
suitableFor TripType[]
accessibility varchar[]
reviewStar float [default: 0]
reviewCount integer [default: 0]
viewCount integer [default: 0]
commentCount integer [default: 0]
cancellationRate float [default: 0.0]
like boolean [default: false]
isAds boolean [default: false]
status HotelStatus [default: 'DRAFT']
submittedAt timestamp [null]
approvedBy varchar [null]
approvedAt timestamp [null]
rejectionReason text [null]
imageVector vector [null]
policies text [null]
policiesVector vector [null]
createdAt timestamp [default: `now()`]
updatedAt timestamp
}

Table Category {
id integer [primary key]
name varchar
slug varchar [unique]
description text [null]
color varchar [null]
icon varchar [null]
thumbnail varchar [null]
count integer [default: 0]
}

Table Booking {
id varchar [primary key]
bookingId varchar(255) [null]
userId varchar
hotelId integer
guestName varchar
guestEmail varchar
guestPhone varchar
adults integer [default: 1]
children integer [default: 0]
bookingSnapshot json [null]
contactDetails json [null]
checkIn timestamp
checkOut timestamp
nights integer
basePrice decimal(12,2)
discount decimal(12,2) [default: 0]
totalAmount decimal(12,2)
currency varchar [default: 'VND']
paymentMethod PaymentMethod [default: 'STRIPE']
paymentStatus PaymentStatus [default: 'PENDING']
paymentIntentId varchar(255) [null]
stripeSessionId varchar(255) [null]
paymentFailureReason text [null]
status BookingStatus [default: 'PENDING']
createdAt timestamp [default: `now()`]
updatedAt timestamp
}

Table OutboxMessage {
id varchar [primary key]
dedupKey varchar [unique]
aggregateType varchar
aggregateId varchar
eventType varchar
topic varchar
payload json
status OutboxStatus [default: 'PENDING']
attempts integer [default: 0]
availableAt timestamp [default: `now()`]
processedAt timestamp [null]
lastError text [null]
createdAt timestamp [default: `now()`]
updatedAt timestamp
}

Table ProcessedEvent {
eventId varchar [primary key]
topic varchar
createdAt timestamp [default: `now()`]
}

Table Interaction {
id integer [primary key]
userId varchar
sessionId varchar(255) [null]
hotelId integer [null]
type InteractionType [default: 'VIEW']
rating integer [null]
metadata json [null]
timestamp timestamp [default: `now()`]
}

Table Recommendation {
id integer [primary key]
userId varchar [unique]
hotelIds integer[]
score json [null]
updatedAt timestamp
}

Table SearchQueryLog {
id integer [primary key]
userId varchar [null]
query varchar
filters json [null]
timestamp timestamp [default: `now()`]
}

Table SystemMetric {
id varchar [primary key]
rmse float
mae float [default: 0]
precisionAt5 float
recallAt5 float
ndcgAt5 float [default: 0]
baselineRmse float [default: 0]
baselineMae float [default: 0]
baselinePrecision float [default: 0]
baselineRecall float [default: 0]
baselineNdcg float [default: 0]
algorithm varchar [default: 'SVD']
datasetSize integer [null]
executionTimeMs integer [null]
trainingHistory json [null]
tuningParams json [null]
createdAt timestamp [default: `now()`]
}

Table Favorite {
id integer [primary key]
userId varchar
hotelId integer
createdAt timestamp [default: `now()`]
}

Table Review {
id varchar [primary key]
bookingId varchar(255) [unique]
userId varchar
hotelId integer
rating integer
comment text [null]
sentiment ReviewSentiment [null]
explicitSentiments json [null]
nlpProcessed boolean [default: false]
createdAt timestamp [default: `now()`]
updatedAt timestamp
}

Table ChatMessage {
id varchar [primary key]
userId varchar
sender SenderRole
text varchar [null]
images varchar[]
isRead boolean [default: false]
metadata json [null]
createdAt timestamp [default: `now()`]
updatedAt timestamp
}

Table DailyStat {
id integer [primary key]
date timestamp [unique]
totalRevenue decimal(12,2) [default: 0]
totalBookings integer [default: 0]
totalCancels integer [default: 0]
totalViews integer [default: 0]
totalClickBook integer [default: 0]
totalLikes integer [default: 0]
totalSearch integer [default: 0]
miscInteractions json [null]
createdAt timestamp [default: `now()`]
}

// =========================================
// RELATIONSHIPS (REFS)
// =========================================

Ref: AuthorRequest.userId > User.id [delete: cascade]
Ref: UserPreference.userId - User.id [delete: cascade] // 1-to-1
Ref: Recommendation.userId - User.id [delete: cascade] // 1-to-1
Ref: SearchQueryLog.userId > User.id [delete: set null]

Ref: Hotel.authorId > User.id
Ref: Hotel.categoryId > Category.id

Ref: Booking.userId > User.id [delete: cascade]
Ref: Booking.hotelId > Hotel.id [delete: cascade]

Ref: Interaction.userId > User.id [delete: cascade]
Ref: Interaction.hotelId > Hotel.id [delete: cascade]

Ref: Favorite.userId > User.id [delete: cascade]
Ref: Favorite.hotelId > Hotel.id [delete: cascade]

Ref: Review.userId > User.id [delete: cascade]
Ref: Review.hotelId > Hotel.id [delete: cascade]

// =========================================
// FLOW 1: CONTENT-BASED FILTERING (Gợi ý theo sở thích)
// Bảng: User -> UserPreference -> Hotel -> Category
// =========================================

Ref: UserPreference.userId - User.id [delete: cascade]
Ref: Hotel.categoryId > Category.id

Table UserPreference {
id integer [primary key]
userId varchar [unique]
interestedCategories varchar[]
favoriteAmenities varchar[]
favoriteCities varchar[]
}

Table Hotel {
id integer [primary key]
categoryId integer
amenities varchar[]
destination varchar
reviewStar float
status HotelStatus
}

Table Category {
id integer [primary key]
slug varchar [unique]
name varchar
}

// =========================================
// FLOW 2: COLLABORATIVE FILTERING - SVD (Gợi ý dựa trên hành vi)
// Bảng: User -> Interaction -> Hotel -> Recommendation -> SystemMetric
// =========================================

Table User {
id varchar [primary key]
}

Table Interaction {
id integer [primary key]
userId varchar
hotelId integer [null]
type InteractionType
rating integer [null]
metadata json [null]
timestamp timestamp
}

Table Hotel {
id integer [primary key]
title varchar
reviewStar float
}

Table Recommendation {
id integer [primary key]
userId varchar [unique]
hotelIds integer[]
score json [null]
updatedAt timestamp
}

Table SystemMetric {
id varchar [primary key]
rmse float
mae float
precisionAt5 float
recallAt5 float
ndcgAt5 float
algorithm varchar
createdAt timestamp
}

Ref: Interaction.userId > User.id [delete: cascade]
Ref: Interaction.hotelId > Hotel.id [delete: cascade]
Ref: Recommendation.userId - User.id [delete: cascade]

// =========================================
// FLOW 3: BOOKING + PAYMENT (Đặt phòng & Thanh toán)
// Bảng: User -> Booking -> Hotel -> Review -> Interaction
// =========================================

Table User {
id varchar [primary key]
name varchar
email varchar
}

Table Hotel {
id integer [primary key]
title varchar
price decimal(12,2)
authorId varchar
}

Table Booking {
id varchar [primary key]
userId varchar
hotelId integer
guestName varchar
guestEmail varchar
guestPhone varchar
checkIn timestamp
checkOut timestamp
nights integer
basePrice decimal(12,2)
totalAmount decimal(12,2)
paymentMethod PaymentMethod
paymentStatus PaymentStatus
paymentIntentId varchar(255) [null]
stripeSessionId varchar(255) [null]
paymentFailureReason text [null]
status BookingStatus
createdAt timestamp
updatedAt timestamp
}

Table OutboxMessage {
id varchar [primary key]
dedupKey varchar [unique]
aggregateType varchar
aggregateId varchar
eventType varchar
payload json
status OutboxStatus
createdAt timestamp
}

Table Review {
id varchar [primary key]
bookingId varchar(255) [unique]
userId varchar
hotelId integer
rating integer
comment text [null]
createdAt timestamp
}

Table Interaction {
id integer [primary key]
userId varchar
hotelId integer [null]
type InteractionType
timestamp timestamp
}

Ref: Booking.userId > User.id [delete: cascade]
Ref: Booking.hotelId > Hotel.id [delete: cascade]
Ref: Review.userId > User.id [delete: cascade]
Ref: Review.hotelId > Hotel.id [delete: cascade]
Ref: Interaction.userId > User.id [delete: cascade]
Ref: Interaction.hotelId > Hotel.id [delete: cascade]

// =========================================
// FLOW 4: SENTIMENT ANALYSIS - NLP (Phân tích cảm xúc)
// Bảng: User -> Review -> Hotel
// =========================================

Table User {
id varchar [primary key]
}

Table Review {
id varchar [primary key]
bookingId varchar(255) [unique]
userId varchar
hotelId integer
rating integer
comment text [null]
sentiment ReviewSentiment [null]
explicitSentiments json [null]
nlpProcessed boolean [default: false]
createdAt timestamp
updatedAt timestamp
}

Table Hotel {
id integer [primary key]
reviewStar float
reviewCount integer
}

Ref: Review.userId > User.id [delete: cascade]
Ref: Review.hotelId > Hotel.id [delete: cascade]

// =========================================
// FLOW 5: VISUAL SEARCH & SEMANTIC SEARCH (Tìm kiếm vector)
// Bảng: Hotel (vector fields) -> SearchQueryLog -> Interaction
// =========================================

Table Hotel {
id integer [primary key]
title varchar
featuredImage varchar
policies text [null]
imageVector vector [null]
policiesVector vector [null]
}

Table SearchQueryLog {
id integer [primary key]
userId varchar [null]
query varchar
filters json [null]
timestamp timestamp
}

Table Interaction {
id integer [primary key]
userId varchar
hotelId integer [null]
type InteractionType
metadata json [null]
timestamp timestamp
}

// =========================================
// FLOW 6: ANALYTICS & DASHBOARD (Thống kê & Đánh giá mô hình)
// Bảng: Interaction -> DailyStat -> SystemMetric
// =========================================

Table Interaction {
id integer [primary key]
userId varchar
hotelId integer [null]
type InteractionType
rating integer [null]
metadata json [null]
timestamp timestamp
}

Table DailyStat {
id integer [primary key]
date timestamp [unique]
totalRevenue decimal(12,2)
totalBookings integer
totalCancels integer
totalViews integer
totalClickBook integer
totalLikes integer
totalSearch integer
miscInteractions json [null]
createdAt timestamp
}

Table SystemMetric {
id varchar [primary key]
rmse float
mae float
precisionAt5 float
recallAt5 float
ndcgAt5 float
baselineRmse float [default: 0]
baselineMae float [default: 0]
baselinePrecision float [default: 0]
baselineRecall float [default: 0]
baselineNdcg float [default: 0]
algorithm varchar [default: 'SVD']
datasetSize integer [null]
executionTimeMs integer [null]
trainingHistory json [null]
tuningParams json [null]
createdAt timestamp
}

// =========================================
// FLOW 7: HOTEL APPROVAL WORKFLOW (Duyệt khách sạn)
// Bảng: User -> Hotel -> Category -> AuthorRequest
// =========================================

Table User {
id varchar [primary key]
name varchar
role Role
}

Table AuthorRequest {
id varchar [primary key]
userId varchar
businessName varchar
businessType varchar
status AuthorRequestStatus
reviewedBy varchar [null]
reviewedAt timestamp [null]
rejectionReason text [null]
createdAt timestamp
}

Table Hotel {
id integer [primary key]
authorId varchar
categoryId integer
slug varchar [unique]
title varchar
status HotelStatus
submittedAt timestamp [null]
approvedBy varchar [null]
approvedAt timestamp [null]
rejectionReason text [null]
imageVector vector [null]
policiesVector vector [null]
createdAt timestamp
updatedAt timestamp
}

Table Category {
id integer [primary key]
name varchar
slug varchar [unique]
}

Ref: AuthorRequest.userId > User.id [delete: cascade]
Ref: Hotel.authorId > User.id
Ref: Hotel.categoryId > Category.id
