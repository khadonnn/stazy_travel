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
        const body = await request.json().catch(() => ({}));

        const exists = await prisma.authorRequest.findUnique({ where: { id } });
        if (!exists) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        await prisma.authorRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reviewedBy: userId,
                reviewedAt: new Date(),
                rejectionReason: body.reason ?? null,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Đã từ chối yêu cầu tác giả',
        });
    } catch (error) {
        console.error('PATCH /api/author-requests/[id]/reject error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
