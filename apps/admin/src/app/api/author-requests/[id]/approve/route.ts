import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { syncRoleToClerk } from '@/lib/auth/roles';
import { NextResponse } from 'next/server';

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const request = await prisma.authorRequest.findUnique({
            where: { id },
            include: { user: true },
        });

        if (!request) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        await prisma.$transaction([
            prisma.authorRequest.update({
                where: { id },
                data: { status: 'APPROVED', reviewedBy: userId, reviewedAt: new Date() },
            }),
            prisma.user.update({
                where: { id: request.userId },
                data: { role: 'AUTHOR' },
            }),
        ]);

        // Đồng bộ role lên Clerk
        await syncRoleToClerk(request.userId, 'AUTHOR');

        return NextResponse.json({
            success: true,
            message: 'Đã phê duyệt yêu cầu tác giả',
        });
    } catch (error) {
        console.error('PATCH /api/author-requests/[id]/approve error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
