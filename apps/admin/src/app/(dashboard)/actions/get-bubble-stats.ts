'use server';
import { prisma } from '@repo/product-db';

export async function getBubbleStats() {
    // 1. Lấy danh sách khách sạn kèm các thông số
    // Chúng ta cần join bảng Hotel để lấy Giá (Price) và Tên
    // Chúng ta cần bảng Interaction/Review để lấy Rating và Độ phổ biến

    // Cách tối ưu: Lấy top 50 khách sạn có interaction nhiều nhất
    const topInteractions = await prisma.interaction.groupBy({
        by: ['hotelId'],
        _count: { _all: true },
        _avg: { rating: true }, // Giả sử interaction có trường rating (nếu bạn đã thêm)
        orderBy: {
            _count: { _all: 'desc' },
        },
        take: 50,
    });

    // Lấy thêm thông tin chi tiết (Giá, Tên) từ bảng Hotel
    // Vì groupBy của Prisma chưa hỗ trợ include relation trực tiếp dễ dàng, ta query manual
    const hotelIds = topInteractions.map((i) => i.hotelId);

    const hotelsInfo = await prisma.hotel.findMany({
        where: { id: { in: hotelIds } },
        select: { id: true, roomName: true, price: true, reviewStar: true },
    });

    // Map 2 nguồn dữ liệu lại
    const bubbleData = topInteractions
        .map((item) => {
            const hotel = hotelsInfo.find((h) => h.id === item.hotelId);
            if (!hotel) return null;

            return {
                name: hotel.roomName,
                x: Number(hotel.price), // Trục X: Giá
                y: item._avg.rating || hotel.reviewStar || 0, // Trục Y: Rating trung bình từ interaction hoặc gốc
                z: item._count._all, // Trục Z (Kích thước): Số lượng tương tác
            };
        })
        .filter(Boolean); // Loại bỏ null

    return bubbleData;
}
