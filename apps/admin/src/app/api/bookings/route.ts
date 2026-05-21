import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') ?? '1');
        const limit = parseInt(searchParams.get('limit') ?? '20');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const where: Record<string, any> = {};
        if (status) where.status = status;
        if (from || to) {
            where.checkIn = {};
            if (from) where.checkIn.gte = new Date(from);
            if (to) where.checkIn.lte = new Date(to);
        }

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    hotel: { select: { id: true, title: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.count({ where }),
        ]);

        return NextResponse.json({ bookings, total, page, limit });
    } catch (error) {
        console.error('GET /api/bookings error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
