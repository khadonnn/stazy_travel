'use server';
import { prisma } from '@repo/product-db';

export interface SparsityData {
    totalUsers: number;
    totalItems: number;
    totalInteractions: number;
    sparsity: number; // 0-100 percent
}

export async function getSparsityStats(): Promise<SparsityData> {
    try {
        const [totalUsers, totalItems, totalInteractions] = await Promise.all([
            prisma.user.count(),
            prisma.hotel.count(),
            prisma.interaction.count(),
        ]);

        const totalCells = totalUsers * totalItems;
        const sparsity = totalCells > 0 ? ((totalCells - totalInteractions) / totalCells) * 100 : 100;

        return {
            totalUsers,
            totalItems,
            totalInteractions,
            sparsity: parseFloat(sparsity.toFixed(1)),
        };
    } catch (error) {
        console.error('❌ Lỗi lấy thống kê sparsity:', error);
        return { totalUsers: 0, totalItems: 0, totalInteractions: 0, sparsity: 100 };
    }
}
