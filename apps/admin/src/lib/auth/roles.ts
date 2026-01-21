/**
 * Role-based authorization utilities for Admin app
 */

import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';

export type UserRole = 'USER' | 'AUTHOR' | 'ADMIN';

/**
 * Lấy role của user từ Clerk metadata
 */
export async function getUserRole(): Promise<UserRole | null> {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        return (user.publicMetadata?.role as UserRole) || 'USER';
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
}

/**
 * Kiểm tra xem user có phải Admin không
 */
export async function isAdmin(): Promise<boolean> {
    const role = await getUserRole();
    return role === 'ADMIN';
}

/**
 * Đồng bộ role từ PostgreSQL lên Clerk
 * Gọi hàm này sau khi admin approve AuthorRequest
 */
export async function syncRoleToClerk(userId: string, role: UserRole): Promise<boolean> {
    try {
        const client = await clerkClient();
        await client.users.updateUser(userId, {
            publicMetadata: {
                role: role,
            },
        });
        return true;
    } catch (error) {
        console.error('Error syncing role to Clerk:', error);
        return false;
    }
}

/**
 * Đồng bộ role từ Clerk xuống PostgreSQL
 */
export async function syncRoleToPostgres(userId: string): Promise<boolean> {
    try {
        const role = await getUserRole();
        if (!role) return false;

        await prisma.user.update({
            where: { id: userId },
            data: { role },
        });

        return true;
    } catch (error) {
        console.error('Error syncing role to Postgres:', error);
        return false;
    }
}
