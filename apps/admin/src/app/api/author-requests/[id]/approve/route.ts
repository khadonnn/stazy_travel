import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { syncRoleToClerk } from '@/lib/auth/roles';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/author-requests/{id}/approve:
 *   patch:
 *     tags:
 *       - Admin › Author Requests
 *     summary: Phê duyệt yêu cầu trở thành tác giả
 *     description: |
 *       Admin phê duyệt yêu cầu. Hệ thống sẽ tự động:
 *       - Cập nhật trạng thái request thành APPROVED
 *       - Nâng role người dùng thành AUTHOR
 *       - Đồng bộ role lên Clerk
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu
 *     responses:
 *       200:
 *         description: Phê duyệt thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy yêu cầu
 */
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
