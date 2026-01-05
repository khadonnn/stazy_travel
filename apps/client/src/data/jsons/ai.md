# clip-ViT-B/32 (OpenCLIP)

512D /- Đa phương tiện (text+image)<br>- Có sẵn trên Hugging Face<br>- Chạy CPU ổn /✅ KHUYẾN NGHỊ
graph LR
[https://huggingface.co/openai/clip-vit-base-patch32?spm=a2ty_o01.29997173.0.0.18da51718IFQJk](https://huggingface.co/openai/clip-vit-base-patch32?spm=a2ty_o01.29997173.0.0.18da51718IFQJk)

# mo ta

A[Query Image URL] --> B(Download → Image Tensor)
B --> C[Image Embedding Model]
C --> D[Vector DB: FAISS / pgvector]
D --> E[Top-K similar stays]
E --> F[Trả về danh sách StayDataType]

#

const sampleStay: StayDataType = {
id: "stay-101",
authorId: 42,
date: "2025-12-16",
href: "/stays/stay-101",
title: "Biệt thự biển Đà Nẵng",
description: "Biệt thự 3 phòng ngủ, view biển trực diện, có hồ bơi vô cực...",
featuredImage: "https://images.pexels.com/photos/5191371/pexels-photo-5191371.jpeg",
galleryImgs: [
"https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg",
"https://images.pexels.com/photos/1179156/pexels-photo-1179156.jpeg",
],
imageEmbeddings: [
{
id: "stay-101_featured",
stayId: "stay-101",
type: "featured",
index: 0,
url: "https://images.pexels.com/photos/5191371/...",
embedding: [0.12, -0.45, 0.89, ...], // 512 số
},
{
id: "stay-101_gallery_0",
stayId: "stay-101",
type: "gallery",
index: 0,
url: "https://images.pexels.com/photos/1268871/...",
embedding: [0.21, -0.33, 0.76, ...],
}
],
price: 2500000,
address: "Lô 12, Bãi Biển Mỹ Khê, Sơn Trà, Đà Nẵng",
city: "Đà Nẵng",
district: "Sơn Trà",
map: { lat: 16.0544, lng: 108.2518 },
category: "villa",
reviewStar: 4.8,
reviewCount: 127,
commentCount: 42,
viewCount: 3450,
like: false,
likeCount: 89,
bookingCount: 56,
maxGuests: 6,
bedrooms: 3,
bathrooms: 3,
amenities: ['wifi', 'pool', 'kitchen', 'parking', 'air-conditioning', 'beach-access'],
status: 'published',
};

# /interaction

3. Khi nào POST /interactions? — Trigger & Tần suất
   Hành vi
   Khi nào ghi?
   Ghi gì?
   Tần suất
   view
   Khi user vào trang stay detail
   type: "view", duration_seconds: ?
   ✅ 1 lần / session
   like
   Khi user click nút ❤️
   type: "like", value: 1
   ✅ Real-time
   click
   Khi user click CTA (Đặt ngay, Xem phòng…)
   type: "click", value: 0.5
   ✅ Real-time
   share
   Khi user share qua mạng xã hội
   type: "share", metadata: { platform: "facebook" }
   ✅ Real-time
   time_spent
   Khi user rời trang (visibility change)
   duration_seconds: 45
   ✅ 1 lần / rời trang
   rating
   Khi user đánh giá sau khi đặt
   type: "rating", value: 4.5
   ✅ Sau booking
