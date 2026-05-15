'use server';

export async function getUserContribution(userId: string) {
    try {
        const { prisma } = await import('@repo/product-db');

        // Get all bookings grouped by date
        const bookings = await prisma.booking.findMany({
            where: { userId },
            select: {
                createdAt: true,
                status: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        // Get all hotels (posted) grouped by date
        const hotels = await prisma.hotel.findMany({
            where: { authorId: userId },
            select: {
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        // Combine into a date -> count map
        const dateCountMap: Record<string, number> = {};

        // Count bookings per day
        bookings.forEach((b: any) => {
            const dateStr = b.createdAt.toISOString().split('T')[0] as string;
            dateCountMap[dateStr] = (dateCountMap[dateStr] || 0) + 1;
        });

        // Count hotel posts per day (add to existing counts)
        hotels.forEach((h: any) => {
            const dateStr = h.createdAt.toISOString().split('T')[0] as string;
            dateCountMap[dateStr] = (dateCountMap[dateStr] || 0) + 1;
        });

        // Find the actual date range from the data
        const allDates = Object.keys(dateCountMap).sort();

        if (allDates.length === 0) {
            // No data at all - return last 365 days with zeros
            const today = new Date();
            const emptyData: { date: string; count: number; level: number }[] = [];
            for (let i = 364; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0] as string;
                emptyData.push({ date: dateStr, count: 0, level: 0 });
            }
            return emptyData;
        }

        // Use the range from earliest data to latest data, but at least 365 days
        const earliestDate = new Date(allDates[0] as string);
        const latestDate = new Date(allDates[allDates.length - 1] as string);

        // Ensure at least 365 days range
        const rangeDays = Math.max(
            365,
            Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        );

        // Start from latestDate and go back rangeDays
        const endDate = latestDate;
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - rangeDays + 1);

        const data: { date: string; count: number; level: number }[] = [];

        for (let i = 0; i < rangeDays; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0] as string;
            const count = dateCountMap[dateStr] || 0;

            // Level 0-4 based on count (similar to GitHub)
            let level = 0;
            if (count >= 10) level = 4;
            else if (count >= 7) level = 3;
            else if (count >= 4) level = 2;
            else if (count >= 1) level = 1;

            data.push({ date: dateStr, count, level });
        }

        return data;
    } catch (error) {
        console.warn('[getUserContribution] DB unavailable:', error);
        return [];
    }
}
