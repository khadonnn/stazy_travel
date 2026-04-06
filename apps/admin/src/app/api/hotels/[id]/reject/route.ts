import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/hotels/{id}/reject:
 *   patch:
 *     tags:
 *       - Admin › Hotels
 *     summary: Từ chối khách sạn
 *     description: Admin từ chối một khách sạn kèm lý do.
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của khách sạn
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Lý do từ chối
 *                 example: Thông tin không đầy đủ
 *     responses:
 *       200:
 *         description: Từ chối thành công
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
 *         description: Không tìm thấy khách sạn
 */
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
