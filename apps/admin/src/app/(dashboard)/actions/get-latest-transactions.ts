'use server';

function mapStatus(dbStatus: string) {
    if (dbStatus === 'CONFIRMED' || dbStatus === 'COMPLETED') return 'Confirmed';
    if (dbStatus === 'PENDING') return 'Pending';
    if (dbStatus === 'CANCELLED') return 'Cancelled';
    return 'Pending';
}

export async function getLatestTransactions() {
    try {
        const { prisma } = await import('@repo/product-db');

        const bookings = await prisma.booking.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                guestName: true,
                guestEmail: true,
                totalAmount: true,
                basePrice: true,
                status: true,
                user: {
                    select: { name: true, avatar: true, email: true },
                },
                hotel: {
                    select: { title: true, roomName: true, price: true },
                },
            },
        });

        return bookings.map((b: any) => {
            // guestName is "Guest" in seed data, prefer user.name
            const name = b.user?.name || b.guestName || b.guestEmail || 'Guest';
            // totalAmount is 0 in seed data, use hotel price as fallback
            const amount = Number(b.totalAmount) || Number(b.basePrice) || Number(b.hotel?.price) || 0;

            return {
                id: b.id,
                hotelTitle: b.hotel?.title || b.hotel?.roomName || 'Unknown Hotel',
                customerName: name === 'Guest' ? b.user?.name || b.guestEmail?.split('@')[0] || 'Guest' : name,
                customerAvatar: b.user?.avatar || 'https://github.com/shadcn.png',
                amount: amount,
                status: mapStatus(b.status),
            };
        });
    } catch (error) {
        console.warn('[getLatestTransactions] DB unavailable:', error);
        return [];
    }
}
