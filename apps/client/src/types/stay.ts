export interface AuthorType {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    avatar: string;
    bgImage?: string;
    email?: string;
    count: number;
    desc: string;
    jobName: string;
    href: string;
    starRating?: number;
}
export type TwMainColor =
    | 'pink'
    | 'green'
    | 'yellow'
    | 'red'
    | 'indigo'
    | 'blue'
    | 'purple'
    | 'gray';

export interface StayCategory {
    id: number;
    name: string;
    href: string;
    color?: TwMainColor;
    icon?: string;
    count?: number;
    thumbnail?: string;
}

//  post
export interface PostCategory {
    id: number;
    name: string;
    href: string;
    color?: TwMainColor; // Để hiển thị màu badge
}
export interface PostDataType {
    id: string | number;
    authorId: AuthorType;
    date: string;
    href: string;
    categories: PostCategory[];
    title: string;
    featuredImage: string;
    desc?: string;
    commentCount: number;
    viewdCount: number;
    readingTime: number;
    postType?: 'standard' | 'video' | 'gallery' | 'audio';
}

// 
// ─── Enums ────────────────────────────────────────────────
// export type StayCategory = 'hotel' | 'resort' | 'villa' | 'homestay' | 'apartment';

// ─── Image Embedding (cho image similarity search) ──────
export interface ImageEmbedding {
  /**
   * ID duy nhất: "{stayId}_featured" hoặc "{stayId}_gallery_{index}"
   */
  id: string;
  
  /**
   * ID của stay cha
   */
  stayId: string | number;
  
  /**
   * Loại ảnh
   */
  type: 'featured' | 'gallery';
  
  /**
   * Vị trí trong mảng:
   * - featured → 0
   * - gallery → 0, 1, 2... (theo thứ tự trong galleryImgs)
   */
  index: number;
  
  /**
   * URL gốc (để hiển thị)
   */
  url: string;
  
  /**
   * Vector embedding (512D, L2-normalized)
   * - Lưu dạng number[] khi ở frontend/mock
   * - Khi dùng DB (PostgreSQL + pgvector), có thể thay bằng `embedding: unknown`
   */
  embedding: number[]; // hoặc `Float32Array` nếu muốn tối ưu
}

// ─── Stay Data Type ───────────────────────────────────────
export interface StayDataType {

  id: string | number;
  authorId: number;
  date: string; // ISO 8601 recommended: "2025-12-16T10:30:00Z"
  href: string;
  title: string;
  description: string;

  //Hình ảnh
  featuredImage: string;          // URL ảnh chính (dùng để hiển thị)
  galleryImgs: string[];          // Danh sách URL ảnh (dùng cho carousel)
  imageEmbeddings?: ImageEmbedding[]; //  THÊM: cho image search (optional, có thể null khi chưa generate)

  // Giá & khuyến mãi
  price: number;                  // Giá mặc định (VND/đêm)
  saleOff?: string | null;        // Giữ lại để backward (nên migrate sang priceInfo sau)
  isAds?: boolean | null;

  // Địa điểm
  address: string;
  map: {
    lat: number;
    lng: number;
  };
  city?: string;                  // e.g. "Đà Nẵng" — tiện cho filter
  district?: string;              // e.g. "Sơn Trà"

  category: StayCategory;

  reviewStart: number;            // Điểm trung bình (1–10 hoặc 1–5 → thống nhất)
  reviewCount: number;
  commentCount: number;

  viewCount: number;
  like: boolean;                  // Trạng thái like của user hiện tại
  likeCount?: number;             // Tổng like — dùng cho ranking
  bookingCount?: number;          // Số lần đã đặt — dùng cho popularity


  maxGuests: number;
  bedrooms: number;
  bathrooms: number;

  // amenities.ts
  amenities: string[]; // e.g. ['wifi', 'pool', 'kitchen', 'parking']

  // Metadata hệ thống
  createdAt?: string;
  updatedAt?: string;
  status?: 'draft' | 'published' | 'archived';

}

// 1. Dữ liệu hành vi (dùng để train CF)
export interface UserInteraction {
  userId: string | number;
  stayId: string | number;
  type: 'view' | 'like' | 'book' | 'click' | 'share';
  timestamp: string; // ISO
  value?: number;    // e.g. rating 1–5, hoặc 1.0 cho like/book
}

// 2. Dữ liệu người dùng (nếu cần user features — cho hybrid)
export interface UserPreference {
  userId: string | number;
  likedAmenities: string[];     // e.g. ['pool', 'mountain-view']
  preferredCategories: StayCategory[];
  avgPriceRange: [number, number]; // [min, max]
  favoriteCities: string[];
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