import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const hotelId = parseInt(id);

        await prisma.hotel.update({
            where: { id: hotelId },
            data: {
                status: 'APPROVED',
                approvedBy: userId,
                approvedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Đã duyệt khách sạn thành công',
        });
    } catch (error) {
        console.error('PATCH /api/hotels/[id]/approve error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
