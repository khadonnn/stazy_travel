'use server';

import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@repo/product-db';

export async function getAllBookingsFromPostgres() {
    noStore();

    try {
        const bookings = await prisma.booking.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                hotel: {
                    select: {
                        id: true,
                        title: true,
                        roomName: true,
                        featuredImage: true,
                        address: true,
                    },
                },
            },
        });

        // Transform data để match với Booking type trong columns.tsx
        return bookings.map((b) => ({
            id: b.id,
            userId: b.userId,
            userName: b.guestName || b.user?.name || 'N/A',
            userEmail: b.guestEmail || b.user?.email || 'N/A',
            userPhone: b.guestPhone || 'N/A',
            hotelId: b.hotelId,
            hotelName: b.hotel?.title || b.hotel?.roomName || 'Unknown Hotel',
            hotelImage: b.hotel?.featuredImage || '',
            hotelAddress: b.hotel?.address || '',
            checkIn: b.checkIn.toISOString(),
            checkOut: b.checkOut.toISOString(),
            nights: b.nights,
            totalPrice: Number(b.totalAmount),
            status: b.status.toLowerCase() as 'pending' | 'confirmed' | 'cancelled' | 'completed',
            paymentMethod: b.paymentMethod.toLowerCase() as any,
            createdAt: b.createdAt.toISOString(),
        }));
    } catch (error) {
        console.error('❌ Error fetching bookings from PostgreSQL:', error);
        return [];
    }
}
