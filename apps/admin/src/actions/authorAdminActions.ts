'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';
import type { IAuthorRequest } from '@repo/types';
import { syncRoleToClerk } from '@/lib/auth/roles';

/**
 * Lấy tất cả Author Requests (Admin only)
 */
export async function getAllAuthorRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<IAuthorRequest[]> {
    try {
        const { userId } = await auth();

        if (!userId) {
            throw new Error('Unauthorized');
        }

        // TODO: Kiểm tra user có phải admin không
        // const user = await prisma.user.findUnique({ where: { id: userId } });
        // if (user?.role !== "ADMIN") throw new Error("Forbidden");

        const requests = await prisma.authorRequest.findMany({
            where: status ? { status } : undefined,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return requests as any;
    } catch (error) {
        console.error('Error getting author requests:', error);
        return [];
    }
}

/**
 * Approve Author Request (Admin only)
 */
export async function approveAuthorRequest(requestId: string): Promise<{ success: boolean; message: string }> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return { success: false, message: 'Unauthorized' };
        }

        const request = await prisma.authorRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) {
            return { success: false, message: 'Không tìm thấy yêu cầu' };
        }

        // Cập nhật request và user role
        await prisma.$transaction([
            prisma.authorRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    reviewedBy: userId,
                    reviewedAt: new Date(),
                },
            }),
            prisma.user.update({
                where: { id: request.userId },
                data: { role: 'AUTHOR' },
            }),
        ]);

        // Đồng bộ role lên Clerk metadata
        await syncRoleToClerk(request.userId, 'AUTHOR');

        // Note: Frontend sẽ tự động giảm count khi reload

        return {
            success: true,
            message: 'Đã duyệt yêu cầu thành công',
        };
    } catch (error) {
        console.error('Error approving author request:', error);
        return {
            success: false,
            message: 'Có lỗi xảy ra',
        };
    }
}

/**
 * Reject Author Request (Admin only)
 */
export async function rejectAuthorRequest(
    requestId: string,
    reason: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const { userId } = await auth();

        if (!userId) {
            return { success: false, message: 'Unauthorized' };
        }

        await prisma.authorRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                reviewedBy: userId,
                reviewedAt: new Date(),
                rejectionReason: reason,
            },
        });

        return {
            success: true,
            message: 'Đã từ chối yêu cầu',
        };
    } catch (error) {
        console.error('Error rejecting author request:', error);
        return {
            success: false,
            message: 'Có lỗi xảy ra',
        };
    }
}
