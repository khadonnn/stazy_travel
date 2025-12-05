export interface AuthorType {
    id: string | number;
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
    id: string | number;
    name: string;
    href: string;
    color?: TwMainColor;
    icon?: string;
    count?: number;
    thumbnail?: string;
}
export interface StayDataType {
    id: string | number;
    authorId: number; // 19/08 sửa
    date: string; // Ngày đăng
    href: string; // Link chi tiết stay
    title: string; // Tên khách sạn/villa...
    featuredImage: string; // Ảnh chính
    galleryImgs: string[]; // Album ảnh
    description: string; // Mô tả

    price: number; // Giá
    address: string; // Địa chỉ
    category: StayCategory; //  Loại (Hotel/Resort/Villa/Homestay)
    reviewStart: number; // Điểm trung bình (ví dụ: 4.5)
    reviewCount: number; // Số review
    commentCount: number; // Số comment
    viewCount: number; // Số lượt xem
    like: boolean; // Người dùng đã like chưa?

    maxGuests: number; // Số khách tối đa
    bedrooms: number; // Số phòng ngủ
    bathrooms: number; // Số phòng tắm

    saleOff?: string | null; // Giảm giá (% hoặc null)
    isAds?: boolean | null; // Có phải quảng cáo không?

    map: {
        // Tọa độ bản đồ
        lat: number;
        lng: number;
    };
}
//  post
export interface PostCategory {
    id: string | number;
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
