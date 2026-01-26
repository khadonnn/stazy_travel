'use server';

import { prisma } from '@repo/product-db';

// Mock data fallback với phân tán random - phá vỡ pattern tăng dần
// Bubble Chart thường dùng 12-18 điểm để cân bằng giữa thông tin và độ rõ ràng
const mockBubbleData = [
    // Luxury với bookings thấp (Boutique/Niche)
    { name: 'An Lam Retreats Ninh Van', x: 22, y: 4.95, z: 58 },
    { name: 'Six Senses Con Dao', x: 45, y: 4.85, z: 65 },

    // Mid-range nhưng bookings rất cao (Popular choice)
    { name: 'Golden Central Hotel', x: 135, y: 4.0, z: 32 },
    { name: 'Saigon Prince Hotel', x: 118, y: 3.85, z: 28 },

    // Premium với bookings cao
    { name: 'Vinpearl Luxury Landmark 81', x: 142, y: 4.9, z: 75 },
    { name: 'InterContinental Danang', x: 98, y: 4.75, z: 68 },

    // Budget nhưng popular
    { name: 'City View Budget Inn', x: 88, y: 3.25, z: 18 },
    { name: 'Green Plaza Danang', x: 105, y: 3.5, z: 22 },

    // Mid-tier rải rác
    { name: 'La Siesta Hanoi', x: 52, y: 4.35, z: 38 },
    { name: 'Pullman Danang', x: 78, y: 4.6, z: 52 },
    { name: 'Mia Resort Nha Trang', x: 35, y: 4.15, z: 42 },

    // Upscale varied
    { name: 'The Reverie Saigon', x: 68, y: 4.8, z: 70 },
    { name: 'Movenpick Phu Quoc', x: 125, y: 4.45, z: 48 },
    { name: 'Liberty Central Citypoint', x: 90, y: 4.65, z: 55 },

    // Budget/Economy scattered
    { name: 'Alba Hot Springs', x: 58, y: 3.7, z: 25 },
    { name: 'Hai An Hotel Hue', x: 28, y: 3.4, z: 20 },
    { name: 'Muong Thanh Grand', x: 72, y: 4.2, z: 35 },
    { name: 'Novotel Saigon Centre', x: 112, y: 4.5, z: 45 },
];

export async function getBubbleChartData() {
    try {
        const hotels = await prisma.hotel.findMany({
            where: { status: 'APPROVED' },
            select: {
                id: true,
                title: true,
                reviewStar: true,
                amenities: true,
                _count: {
                    select: {
                        bookings: {
                            where: {
                                status: { in: ['CONFIRMED', 'COMPLETED'] },
                            },
                        },
                    },
                },
            },
            orderBy: {
                bookings: {
                    _count: 'desc',
                },
            },
            take: 10,
        });

        const result = hotels
            .filter((hotel) => hotel._count.bookings > 0) // Chỉ lấy hotel có bookings
            .map((hotel) => ({
                name: hotel.title,
                x: hotel._count.bookings,
                y: hotel.reviewStar,
                z: hotel.amenities.length,
            }));

        console.log('📊 Bubble Chart Data:', result.length > 0 ? result : 'No data, using mock');

        // Nếu không có dữ liệu thực, dùng mock data
        return result.length > 0 ? result : mockBubbleData;
    } catch (error) {
        console.error('❌ Error fetching bubble data:', error);
        return mockBubbleData;
    }
}
