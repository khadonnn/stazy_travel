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
        const status = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null;
        const page = parseInt(searchParams.get('page') ?? '1');
        const limit = parseInt(searchParams.get('limit') ?? '20');

        const where = status ? { status } : {};

        const [requests, total] = await Promise.all([
            prisma.authorRequest.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatar: true },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.authorRequest.count({ where }),
        ]);

        return NextResponse.json({ requests, total, page, limit });
    } catch (error) {
        console.error('GET /api/author-requests error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
