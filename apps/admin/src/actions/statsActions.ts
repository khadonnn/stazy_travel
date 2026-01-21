'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';

/**
 * Lấy số lượng Author Requests đang chờ duyệt
 */
export async function getPendingAuthorRequestsCount(): Promise<number> {
    try {
        const { userId } = await auth();
        if (!userId) return 0;

        const count = await prisma.authorRequest.count({
            where: { status: 'PENDING' },
        });

        return count;
    } catch (error) {
        console.error('Error getting pending author requests count:', error);
        return 0;
    }
}

/**
 * Lấy số lượng Hotels đang chờ duyệt
 */
export async function getPendingHotelsCount(): Promise<number> {
    try {
        const { userId } = await auth();
        if (!userId) return 0;

        const count = await prisma.hotel.count({
            where: { status: 'PENDING' },
        });

        return count;
    } catch (error) {
        console.error('Error getting pending hotels count:', error);
        return 0;
    }
}

/**
 * Lấy tất cả stats cùng lúc
 */
export async function getAllPendingCounts() {
    const [authorRequests, hotels] = await Promise.all([getPendingAuthorRequestsCount(), getPendingHotelsCount()]);

    return {
        authorRequests,
        hotels,
    };
}
