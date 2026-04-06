import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/hotels/{id}/approve:
 *   patch:
 *     tags:
 *       - Admin › Hotels
 *     summary: Phê duyệt khách sạn
 *     description: Admin phê duyệt một khách sạn đang ở trạng thái PENDING.
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của khách sạn
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
 *         description: Không tìm thấy khách sạn
 */
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
