// =========================================
// STAZY BOOKING SYSTEM - DBML
// =========================================

Project StazyBooking {
database_type: "PostgreSQL"
Note: "Hotel booking + AI recommendation system"
}

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

Enum OutboxStatus {
PENDING
PROCESSING
SENT
FAILED
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
// 1. USERS & PREFERENCES
// =========================================

Table users {
id uuid [pk]
email varchar [unique, not null]
password varchar

// Profile
name varchar [not null]
nickname varchar
phone varchar
gender varchar
dob timestamp
address varchar

// Media
avatar varchar
bg_image varchar

// Bio
job_name varchar
desc text

role Role [default: 'USER']

created_at timestamp [default: `now()`]
updated_at timestamp

Note: "System users"
}

Table author_requests {
id uuid [pk]

user_id uuid [not null]

// Business Info
business_name varchar [not null]
business_type varchar [not null]
tax_code varchar
phone varchar [not null]
email varchar [not null]
address varchar [not null]

identity_card varchar [not null]
identity_images text[]

reason text

status AuthorRequestStatus [default: 'PENDING']

reviewed_by uuid
reviewed_at timestamp
rejection_reason text

created_at timestamp [default: `now()`]
updated_at timestamp

indexes {
user_id
status
}
}

Table user_preferences {
id serial [pk]

user_id uuid [unique, not null]

interested_categories text[]
favorite_amenities text[]
favorite_cities text[]

avg_price_expect decimal(12,2)
preferred_rating_min float

past_booking_count int [default: 0]
last_booking_at timestamp

updated_at timestamp

Note: "AI personalization & behavioral insights"
}

// =========================================
// 2. HOTEL & CATEGORY
// =========================================

Table categories {
id serial [pk]

name varchar [not null]
slug varchar [unique, not null]

description text
color varchar
icon varchar
thumbnail varchar

count int [default: 0]
}

Table hotels {
id serial [pk]

// Relations
author_id uuid [not null]
category_id int [not null]

// Basic Info
slug varchar [unique, not null]
title varchar [not null]

room_name varchar [default: 'Standard Room']

featured_image varchar [not null]
gallery_imgs text[]

description text [not null]
full_description text

// Location
address varchar [not null]
destination varchar [not null]

map json
nearby_landmarks text[]

// Pricing
price decimal(12,2) [not null]

sale_off varchar
sale_off_percent int [default: 0]

// Room Info
max_guests int
bedrooms int
bathrooms int

// Attributes
amenities text[]
tags text[]
suitable_for TripType[]
accessibility text[]

// Stats
review_star float [default: 0]
review_count int [default: 0]
view_count int [default: 0]
comment_count int [default: 0]

cancellation_rate float [default: 0]

// Flags
like boolean [default: false]
is_ads boolean [default: false]

// Approval Workflow
status HotelStatus [default: 'DRAFT']

submitted_at timestamp
approved_by uuid
approved_at timestamp

rejection_reason text

// AI / Vector
image_vector vector(512)
policies text
policies_vector vector(512)

created_at timestamp [default: `now()`]
updated_at timestamp

indexes {
status
(author_id, status)
}

Note: "Core hotel entity"
}

// =========================================
// 3. BOOKINGS & PAYMENTS
// =========================================

Table bookings {
id uuid [pk]

booking_id varchar(255)

user_id uuid [not null]
hotel_id int [not null]

// Guest Info
guest_name varchar [not null]
guest_email varchar [not null]
guest_phone varchar [not null]

adults int [default: 1]
children int [default: 0]

// Snapshot
booking_snapshot json
contact_details json

// Schedule
check_in timestamp [not null]
check_out timestamp [not null]

nights int [not null]

// Payment
base_price decimal(12,2) [not null]
discount decimal(12,2) [default: 0]

total_amount decimal(12,2) [not null]

currency varchar [default: 'VND']

payment_method PaymentMethod [default: 'STRIPE']
payment_status PaymentStatus [default: 'PENDING']

payment_intent_id varchar(255)
stripe_session_id varchar(255)

payment_failure_reason text

status BookingStatus [default: 'PENDING']

created_at timestamp [default: `now()`]
updated_at timestamp

indexes {
user_id
hotel_id
status
}
}

Table outbox_messages {
id uuid [pk]

dedup_key varchar [unique]

aggregate_type varchar
aggregate_id varchar

event_type varchar
topic varchar

payload json

status OutboxStatus [default: 'PENDING']

attempts int [default: 0]

available_at timestamp [default: `now()`]
processed_at timestamp

last_error text

created_at timestamp [default: `now()`]
updated_at timestamp

indexes {
(status, available_at)
(aggregate_type, aggregate_id)
}
}

Table processed_events {
event_id varchar [pk]

topic varchar

created_at timestamp [default: `now()`]

indexes {
created_at
}
}

// =========================================
// 4. AI & ANALYTICS
// =========================================

Table interactions {
id serial [pk]

user_id uuid [not null]
hotel_id int

session_id varchar(255)

type InteractionType [default: 'VIEW']

rating int
metadata json

timestamp timestamp [default: `now()`]

indexes {
(user_id, type)
hotel_id
}

Note: "Tracking implicit & explicit user behavior"
}

Table recommendations {
id serial [pk]

user_id uuid [unique, not null]

hotel_ids int[]
score json

updated_at timestamp

Note: "Cached recommendation results"
}

Table search_query_logs {
id serial [pk]

user_id uuid

query varchar [not null]
filters json

timestamp timestamp [default: `now()`]
}

Table system_metrics {
id uuid [pk]

rmse float [not null]
mae float [default: 0]

precision_at5 float [not null]
recall_at5 float [not null]

ndcg_at5 float [default: 0]

baseline_rmse float [default: 0]
baseline_mae float [default: 0]

baseline_precision float [default: 0]
baseline_recall float [default: 0]
baseline_ndcg float [default: 0]

algorithm varchar [default: 'SVD']

dataset_size int
execution_time_ms int

training_history json
tuning_params json

created_at timestamp [default: `now()`]

Note: "AI model evaluation metrics"
}

// =========================================
// 5. FAVORITES & REVIEWS
// =========================================

Table favorites {
id serial [pk]

user_id uuid [not null]
hotel_id int [not null]

created_at timestamp [default: `now()`]

indexes {
(user_id, hotel_id) [unique]
user_id
hotel_id
}
}

Table reviews {
id uuid [pk]

booking_id varchar(255) [unique]

user_id uuid [not null]
hotel_id int [not null]

rating int [not null]

comment text

sentiment ReviewSentiment

explicit_sentiments json

nlp_processed boolean [default: false]

created_at timestamp [default: `now()`]
updated_at timestamp

indexes {
hotel_id
user_id
}

Note: "Review + NLP sentiment analysis"
}

// =========================================
// 6. CHAT SUPPORT
// =========================================

Table chat_messages {
id uuid [pk]

user_id uuid [not null]

sender SenderRole [not null]

text text

images text[]

is_read boolean [default: false]

metadata json

created_at timestamp [default: `now()`]
updated_at timestamp

indexes {
user_id
is_read
created_at
}
}

// =========================================
// 7. DAILY STATS
// =========================================

Table daily_stats {
id serial [pk]

date date [unique]

// Business
total_revenue decimal(12,2) [default: 0]

total_bookings int [default: 0]
total_cancels int [default: 0]

// Funnel
total_views int [default: 0]
total_click_book int [default: 0]

// Engagement
total_likes int [default: 0]
total_search int [default: 0]

misc_interactions json

created_at timestamp [default: `now()`]
}

// =========================================
// RELATIONSHIPS
// =========================================

// Users
Ref: author_requests.user_id > users.id
Ref: user_preferences.user_id - users.id

// Hotels
Ref: hotels.author_id > users.id
Ref: hotels.category_id > categories.id

// Bookings
Ref: bookings.user_id > users.id
Ref: bookings.hotel_id > hotels.id

// Interactions
Ref: interactions.user_id > users.id
Ref: interactions.hotel_id > hotels.id

// Recommendations
Ref: recommendations.user_id - users.id

// Search Logs
Ref: search_query_logs.user_id > users.id

// Favorites
Ref: favorites.user_id > users.id
Ref: favorites.hotel_id > hotels.id

// Reviews
Ref: reviews.user_id > users.id
Ref: reviews.hotel_id > hotels.id

// Chat
Ref: chat_messages.user_id > users.id
