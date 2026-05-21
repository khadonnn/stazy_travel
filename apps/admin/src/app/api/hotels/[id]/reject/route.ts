import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const hotelId = parseInt(id);
        const body = await request.json().catch(() => ({}));

        await prisma.hotel.update({
            where: { id: hotelId },
            data: {
                status: 'REJECTED',
                rejectionReason: body.reason ?? null,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Đã từ chối khách sạn',
        });
    } catch (error) {
        console.error('PATCH /api/hotels/[id]/reject error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
