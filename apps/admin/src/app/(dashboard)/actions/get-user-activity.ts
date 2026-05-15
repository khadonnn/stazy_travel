'use server';

export async function getUserActivity(userId: string) {
    try {
        const { prisma } = await import('@repo/product-db');

        // Get all bookings to find actual date range
        const allBookings = await prisma.booking.findMany({
            where: { userId },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        const allHotels = await prisma.hotel.findMany({
            where: { authorId: userId },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        // Find earliest date from bookings or hotels
        const allDates = [
            ...allBookings.map((b: any) => new Date(b.createdAt).getTime()),
            ...allHotels.map((h: any) => new Date(h.createdAt).getTime()),
        ].sort();

        if (allDates.length === 0) {
            return [];
        }

        const earliest = new Date(allDates[0]!);
        const now = new Date();

        // Build month ranges from earliest to now
        const months: { month: string; bookings: number; hotels: number }[] = [];
        let current = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);

        while (current <= end) {
            const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);

            const bookingCount = await prisma.booking.count({
                where: {
                    userId,
                    createdAt: {
                        gte: current,
                        lt: nextMonth,
                    },
                },
            });

            const hotelCount = await prisma.hotel.count({
                where: {
                    authorId: userId,
                    createdAt: {
                        gte: current,
                        lt: nextMonth,
                    },
                },
            });

            const monthName = current.toLocaleString('en-US', { month: 'long' });
            const year = current.getFullYear();
            months.push({
                month: `${monthName} ${year}`,
                bookings: bookingCount,
                hotels: hotelCount,
            });

            current = nextMonth;
        }

        return months;
    } catch (error) {
        console.warn('[getUserActivity] DB unavailable:', error);
        return [];
    }
}
