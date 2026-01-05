// listings.ts
import type { StayDataType } from "@/types/stay";

import { DEMO_STAY_CATEGORIES } from "@/data/static/categories";
// import { DEMO_AUTHORS } from '@/data/authors';

export interface StayApiResponse {
  id: number;
  authorId: number;
  categoryId: number;
  title: string;
  description?: string;
  address: string;
  price: number;
  reviewStar: number;
  reviewCount: number;
  like: boolean;
  saleOff?: string;
  isAds?: boolean;
  galleryImgs: string[];
  featuredImage: string;
  slug: string;
  date: string;
  map: { lat: number; lng: number };
  bedrooms: number;
  bathrooms: number;
  commentCount: number;
  viewCount: number;
  maxGuests: number;
}

// ✅ đặt tên rõ ràng là mapper
export function mapStay(post: StayApiResponse): StayDataType {
  const category =
    DEMO_STAY_CATEGORIES.find((cat) => cat.id === post.listingCategoryId) ||
    DEMO_STAY_CATEGORIES[0]!;

  return {
    ...post,
    saleOff: post.saleOff, // giữ nguyên
    isAds: post.isAds ?? false, // backend trả gì thì lấy, default = false
    category,
    description: post.description || "Chưa có mô tả",
  };
}
