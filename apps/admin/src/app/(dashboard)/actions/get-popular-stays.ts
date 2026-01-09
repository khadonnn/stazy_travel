'use server';

import { prisma } from '@repo/product-db';

export async function getPopularStays() {
    try {
        const hotels = await prisma.hotel.findMany({
            take: 5, // Lấy top 5
            orderBy: {
                viewCount: 'desc', // Sắp xếp view cao nhất xuống thấp nhất
            },
            select: {
                id: true,
                roomName: true, // Tên phòng/khách sạn
                address: true,
                galleryImgs: true, // Lấy mảng ảnh
                price: true, // Giả sử bạn có trường price, nếu không thì thay bằng field giá của bạn
                viewCount: true,
                reviewStar: true,
            },
        });

        // Map dữ liệu sang format UI
        return hotels.map((hotel: any) => ({
            id: hotel.id,
            title: hotel.roomName,
            // Lấy ảnh đầu tiên, nếu không có thì dùng ảnh placeholder
            featuredImage:
                hotel.galleryImgs?.[0] ||
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=100&q=60',
            address: hotel.address || 'Vietnam',
            viewCount: hotel.viewCount,
            reviewStar: hotel.reviewStar || 5,
            price: Number(hotel.price) || 0,
        }));
    } catch (error) {
        console.error('Error fetching popular stays:', error);
        return []; // Trả về rỗng để kích hoạt mock data
    }
}
