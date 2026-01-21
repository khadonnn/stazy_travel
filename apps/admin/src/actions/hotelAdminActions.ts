'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';

/**
 * Lấy tất cả hotels đang chờ duyệt (Admin only)
 */
export async function getPendingHotels() {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error('Unauthorized');

        // TODO: Check if user is admin
        // const user = await prisma.user.findUnique({ where: { id: userId } });
        // if (user?.role !== "ADMIN") throw new Error("Forbidden");

        const hotels = await prisma.hotel.findMany({
            where: { status: 'PENDING' },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { submittedAt: 'desc' },
        });

        return hotels;
    } catch (error) {
        console.error('Error getting pending hotels:', error);
        return [];
    }
}

/**
 * Approve hotel (Admin only)
 */
export async function approveHotel(hotelId: number): Promise<{ success: boolean; message: string }> {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, message: 'Unauthorized' };
        }

        await prisma.hotel.update({
            where: { id: hotelId },
            data: {
                status: 'APPROVED',
                approvedBy: userId,
                approvedAt: new Date(),
            },
        });

        return {
            success: true,
            message: 'Đã duyệt khách sạn thành công',
        };
    } catch (error) {
        console.error('Error approving hotel:', error);
        return {
            success: false,
            message: 'Có lỗi xảy ra',
        };
    }
}

/**
 * Reject hotel (Admin only)
 */
export async function rejectHotel(hotelId: number, reason: string): Promise<{ success: boolean; message: string }> {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, message: 'Unauthorized' };
        }

        await prisma.hotel.update({
            where: { id: hotelId },
            data: {
                status: 'REJECTED',
                approvedBy: userId,
                approvedAt: new Date(),
                rejectionReason: reason,
            },
        });

        return {
            success: true,
            message: 'Đã từ chối khách sạn',
        };
    } catch (error) {
        console.error('Error rejecting hotel:', error);
        return {
            success: false,
            message: 'Có lỗi xảy ra',
        };
    }
}

/**
 * Lấy tất cả hotels với filter theo status
 */
export async function getAllHotels(status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'DRAFT') {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error('Unauthorized');

        const hotels = await prisma.hotel.findMany({
            where: status ? { status } : undefined,
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                category: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return hotels;
    } catch (error) {
        console.error('Error getting hotels:', error);
        return [];
    }
}
