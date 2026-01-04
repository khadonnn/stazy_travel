export type HotelColumn = {
  id: number;
  title: string;
  slug: string;
  featuredImage: string;
  price: number | string; // Prisma Decimal thường trả về string hoặc number ở frontend
  address: string;
  reviewStart: number; // Float trong DB
  reviewCount: number;
  description: string;
  category?: {
    // Relation
    name: string;
  };
  isAds: boolean;
  createdAt: string | Date;
};

//  products
// @repo/types/index.ts

export type LocationMap = {
  lat: number;
  lng: number;
};

// Đây là Type ánh xạ đúng với DB/API trả về
export type ProductType = {
  id: number;
  authorId: string;
  date: string; // "Oct 30, 2025"
  slug: string;

  // Quan trọng: API trả về ID chứ không phải Object
  categoryId?: number;

  title: string;
  featuredImage: string;
  galleryImgs: string[];
  amenities: string[];
  description: string;

  price: number;

  address: string;

  // Lưu ý: JSON của bạn là 'reviewStart' (chữ 't' ở cuối), không phải 'Star'
  reviewStart?: number;
  reviewCount?: number;
  viewCount?: number;
  like?: boolean;
  commentCount?: number;

  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;

  saleOff?: number | null;
  saleOffPercent?: number;
  isAds?: boolean;
  map?: LocationMap;
};
