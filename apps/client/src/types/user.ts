type Gender = 'male' | 'female';
type Role = 'USER' | 'AUTHOR' | 'ADMIN';

export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    nickname: string;
    phone: string;
    gender: Gender;
    dob: string; // hoặc Date nếu đã parse
    address: string;
    avatar: string;
    bgImage: string;
    jobName: string;
    desc: string;
    role: Role;
    createdAt: string;
    updatedAt: string;
    posts: { id: number }[];
}
// example
/* 
--user interface--
[
  { "userId": "u101", "stayId": "s205", "type": "view", "timestamp": "2025-12-16T08:30:00Z" },
  { "userId": "u101", "stayId": "s205", "type": "like", "timestamp": "2025-12-16T08:32:10Z", "value": 1 },
  { "userId": "u102", "stayId": "s205", "type": "book", "timestamp": "2025-12-16T10:15:00Z", "value": 5 }
]

--hotel--
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
reviewStart: 4.8,
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
*/

// export interface StayDataType {
//     id: string | number;
//     authorId: number; // 19/08 sửa
//     date: string; // Ngày đăng
//     href: string; // Link chi tiết stay
//     title: string; // Tên khách sạn/villa...
//     featuredImage: string; // Ảnh chính
//     galleryImgs: string[]; // Album ảnh
//     description: string; // Mô tả

//     price: number; // Giá
//     address: string; // Địa chỉ
//     category: StayCategory; //  Loại (Hotel/Resort/Villa/Homestay)
//     reviewStart: number; // Điểm trung bình (ví dụ: 4.5)
//     reviewCount: number; // Số review
//     commentCount: number; // Số comment
//     viewCount: number; // Số lượt xem
//     like: boolean; // Người dùng đã like chưa?

//     maxGuests: number; // Số khách tối đa
//     bedrooms: number; // Số phòng ngủ
//     bathrooms: number; // Số phòng tắm

//     saleOff?: string | null; // Giảm giá (% hoặc null)
//     isAds?: boolean | null; // Có phải quảng cáo không?

//     map: {
//         // Tọa độ bản đồ
//         lat: number;
//         lng: number;
//     };
// }
