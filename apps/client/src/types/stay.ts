type Gender = "male" | "female";
type Role = "USER" | "AUTHOR" | "ADMIN";

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

// Chỉ lấy những gì cần để hiển thị cho công chúng
export interface Author extends Pick<User, "id" | "name" | "avatar"> {
  displayName: string;
  desc: string;
  jobName: string;
  href: string;
  starRating?: number;
  listingCount?: number;
}
export type TwMainColor =
  | "pink"
  | "green"
  | "yellow"
  | "red"
  | "indigo"
  | "blue"
  | "purple"
  | "gray";

export interface StayCategory {
  id: number;
  name: string;
  slug: string;
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
  authorId: Author;
  date: string;
  href: string;
  categories: PostCategory[];
  title: string;
  featuredImage: string;
  desc?: string;
  commentCount: number;
  viewdCount: number;
  readingTime: number;
  postType?: "standard" | "video" | "gallery" | "audio";
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
  type: "featured" | "gallery";

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
  id: number;

  // Các trường quan trọng để hiển thị (Bắt buộc phải có)
  title: string;
  slug: string;
  featuredImage: string;
  price: number; // Chấp nhận cả Decimal (Prisma) và number (API)
  address: string;

  // Các trường Optional (Có thể null/undefined từ CartItem)
  authorId?: string;
  categoryId?: number;
  category?: StayCategory;

  date?: string | Date; // Chấp nhận cả Date object và ISO string
  description?: string;

  // Hình ảnh & Media
  galleryImgs?: string[];
  imageEmbeddings?: ImageEmbedding[];

  // Logic Sale/Ads
  saleOff?: string | null;
  isAds?: boolean;

  // Map
  // Prisma trả về Json, API trả về object. Dùng Union type để an toàn.
  map?: { lat: number; lng: number } | any;
  city?: string;
  district?: string;

  // Ratings & Stats
  reviewStar?: number;
  reviewCount?: number;
  commentCount?: number;
  viewCount?: number;
  like?: boolean;
  likeCount?: number;
  bookingCount?: number;

  // Room Info
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;

  amenities?: string[];

  createdAt?: string | Date;
  updatedAt?: string | Date;
  status?: "draft" | "published" | "archived";
}

// export interface StayDataType {
//   id: number;
//   authorId?: string;
//   date: string; // ISO 8601 recommended: "2025-12-16T10:30:00Z"
//   slug: string;
//   title: string;
//   description: string;

//   //Hình ảnh
//   featuredImage: string; // URL ảnh chính (dùng để hiển thị)
//   galleryImgs: string[]; // Danh sách URL ảnh (dùng cho carousel)
//   imageEmbeddings?: ImageEmbedding[]; //  THÊM: cho image search (optional, có thể null khi chưa generate)

//   // Giá & khuyến mãi
//   price: number; // Giá mặc định (VND/đêm)
//   saleOff?: string | null; // Giữ lại để backward (nên migrate sang priceInfo sau)
//   isAds?: boolean;

//   // Địa điểm
//   address: string;
//   map: {
//     lat: number;
//     lng: number;
//   };
//   city?: string; // e.g. "Đà Nẵng" — tiện cho filter
//   district?: string; // e.g. "Sơn Trà"

//   category?: StayCategory;
//   categoryId?: number;

//   reviewStar?: number; // Điểm trung bình (1–10 hoặc 1–5 → thống nhất)
//   reviewCount?: number;
//   commentCount?: number;

//   viewCount?: number;
//   like?: boolean; // Trạng thái like của user hiện tại
//   likeCount?: number; // Tổng like — dùng cho ranking
//   bookingCount?: number; // Số lần đã đặt — dùng cho popularity

//   maxGuests: number;
//   bedrooms?: number;
//   bathrooms?: number;

//   // amenities.ts
//   amenities?: string[]; // e.g. ['wifi', 'pool', 'kitchen', 'parking']

//   // Metadata hệ thống
//   createdAt?: string;
//   updatedAt?: string;
//   status?: "draft" | "published" | "archived";
// }

// 1. Dữ liệu hành vi (dùng để train CF)
export interface UserInteraction {
  userId: string;
  stayId: string | number;
  action: "view" | "like" | "book";
  weight: number;
  timestamp: string;
}

// 2. Dữ liệu người dùng (nếu cần user features — cho hybrid)
export interface UserPreference {
  userId: string | number;
  likedAmenities: string[];
  preferredCategories: StayCategory[];
  avgPriceRange: [number, number]; // [min, max]
  favoriteCities: string[];
}
