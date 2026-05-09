'use server';

export async function getPopularStays() {
    try {
        const { prisma } = await import('@repo/product-db');

        const hotels = await prisma.hotel.findMany({
            take: 5,
            orderBy: { viewCount: 'desc' },
            select: {
                id: true,
                title: true,
                roomName: true,
                address: true,
                galleryImgs: true,
                price: true,
                viewCount: true,
                reviewStar: true,
            },
        });

        return hotels.map((hotel: any) => ({
            id: hotel.id,
            title: hotel.title || hotel.roomName || 'Untitled',
            featuredImage:
                hotel.galleryImgs?.[0] ||
                'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=100&q=60',
            address: hotel.address || 'Vietnam',
            viewCount: hotel.viewCount || 0,
            reviewStar: hotel.reviewStar || 5,
            price: Number(hotel.price) || 0,
        }));
    } catch (error) {
        console.warn('[getPopularStays] DB unavailable:', error);
        return [];
    }
}
