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
