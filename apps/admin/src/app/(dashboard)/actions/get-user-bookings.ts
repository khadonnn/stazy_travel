'use server';

function mapStatus(dbStatus: string) {
    if (dbStatus === 'CONFIRMED' || dbStatus === 'COMPLETED') return 'Confirmed';
    if (dbStatus === 'PENDING') return 'Pending';
    if (dbStatus === 'CANCELLED') return 'Cancelled';
    return 'Pending';
}

export async function getUserBookings(userId: string, page: number = 1, limit: number = 5) {
    try {
        const { prisma } = await import('@repo/product-db');

        const skip = (page - 1) * limit;

        const bookings = await prisma.booking.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: {
                id: true,
                guestName: true,
                guestEmail: true,
                totalAmount: true,
                basePrice: true,
                status: true,
                checkIn: true,
                checkOut: true,
                nights: true,
                createdAt: true,
                hotel: {
                    select: {
                        id: true,
                        title: true,
                        roomName: true,
                        featuredImage: true,
                        galleryImgs: true,
                        address: true,
                        price: true,
                        reviewStar: true,
                    },
                },
            },
        });

        return bookings.map((b: any) => {
            const amount = Number(b.totalAmount) || Number(b.basePrice) || Number(b.hotel?.price) || 0;

            return {
                id: b.id,
                hotelId: b.hotel?.id,
                hotelTitle: b.hotel?.title || b.hotel?.roomName || 'Unknown Hotel',
                featuredImage:
                    b.hotel?.galleryImgs?.[0] ||
                    b.hotel?.featuredImage ||
                    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=100&q=60',
                address: b.hotel?.address || 'Vietnam',
                reviewStar: b.hotel?.reviewStar || 0,
                price: Number(b.hotel?.price) || 0,
                amount,
                status: mapStatus(b.status),
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                nights: b.nights,
                createdAt: b.createdAt,
            };
        });
    } catch (error) {
        console.warn('[getUserBookings] DB unavailable:', error);
        return [];
    }
}
