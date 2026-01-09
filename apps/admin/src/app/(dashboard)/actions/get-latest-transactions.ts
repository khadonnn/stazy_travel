'use server';

import { prisma } from '@repo/product-db';

export async function getLatestTransactions() {
    try {
        const bookings = await prisma.booking.findMany({
            take: 5, // Lấy 5 giao dịch gần nhất
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                user: {
                    select: {
                        name: true,
                        avatar: true,
                    },
                },
                hotel: {
                    select: {
                        roomName: true,
                    },
                },
            },
        });

        // Map dữ liệu từ Prisma sang format mà UI của bạn đang dùng
        return bookings.map((b) => ({
            id: b.id,
            hotelTitle: b.hotel ? b.hotel.roomName : 'Unknown Hotel',
            customerName: b.user ? b.user.name : 'Anonymous',
            customerAvatar: b.user && b.user.avatar ? b.user.avatar : 'https://github.com/shadcn.png',

            amount: Number(b.totalAmount),
            status: mapStatus(b.status),
        }));
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return []; // Trả về mảng rỗng nếu lỗi để kích hoạt mock data
    }
}

// Hàm chuyển đổi trạng thái từ Database (Enum) sang hiển thị UI
function mapStatus(dbStatus: string) {
    if (dbStatus === 'CONFIRMED' || dbStatus === 'COMPLETED') return 'Confirmed';
    if (dbStatus === 'PENDING') return 'Pending';
    if (dbStatus === 'CANCELLED') return 'Cancelled';
    return 'Pending';
}
