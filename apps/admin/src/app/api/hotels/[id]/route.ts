import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        // Soft delete: set deletedAt instead of hard delete
        await prisma.hotel.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() },
        });

        return NextResponse.json({ success: true, message: 'Đã xoá khách sạn (soft delete)' });
    } catch (error) {
        console.error('DELETE /api/hotels/[id] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Restore soft-deleted hotel
        if (body.action === 'restore') {
            const restored = await prisma.hotel.update({
                where: { id: parseInt(id) },
                data: { deletedAt: null },
            });
            return NextResponse.json({ success: true, message: 'Đã khôi phục khách sạn', hotel: restored });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('PUT /api/hotels/[id] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
