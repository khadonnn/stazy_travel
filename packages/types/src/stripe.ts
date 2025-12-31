// Trong file @repo/types
export type StripeProductType = {
  id: string;          // ID phòng hoặc khách sạn
  name: string;        // Tên khách sạn
  price: number;       // Giá tiền
  images?: string[];    // Mảng chứa URL ảnh (để hiển thị featured_image)
  description?: string;
  metadata?: {          // Các thông tin phụ trợ cho hiển thị
    hotelId?: string;
    slug?: string;
    address? : string;
    starRating?: string;
  };
};