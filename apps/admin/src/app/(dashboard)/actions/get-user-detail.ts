'use server';

export async function getUserDetail(userId: string) {
    try {
        const { prisma } = await import('@repo/product-db');

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                nickname: true,
                phone: true,
                gender: true,
                dob: true,
                address: true,
                avatar: true,
                bgImage: true,
                jobName: true,
                desc: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                // Relations count
                _count: {
                    select: {
                        bookings: true,
                        hotels: true,
                        reviews: true,
                        favorites: true,
                    },
                },
            },
        });

        if (!user) return null;

        // Calculate total spending from bookings
        const spendingResult = await prisma.booking.aggregate({
            where: {
                userId,
                status: { in: ['CONFIRMED', 'COMPLETED'] },
            },
            _sum: { totalAmount: true },
        });

        return {
            ...user,
            totalSpending: Number(spendingResult._sum.totalAmount) || 0,
        };
    } catch (error) {
        console.warn('[getUserDetail] DB unavailable:', error);
        return null;
    }
}
