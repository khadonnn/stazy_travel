import type { Hotel } from "@repo/product-db";

export type HotelFrontend = Omit<
  Hotel,
  "price" | "map" | "createdAt" | "updatedAt" | "date"
> & {
  // 1. Cho phép string để tránh lỗi khi nhận dữ liệu từ input hoặc API trả về số dạng chuỗi
  price: number | string;

  map: any;

  date: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
};
export interface HotelApiResponse {
  data: HotelFrontend[]; // Đây là cái mảng 10 phần tử bạn cần
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
