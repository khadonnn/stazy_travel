'use server';
import { prisma } from '@repo/product-db';

export async function getActivityHistogram() {
    // 1. Đếm tổng số interaction của từng user
    // (Group by UserId)
    const userActivities = await prisma.interaction.groupBy({
        by: ['userId'],
        _count: {
            _all: true,
        },
    });

    // 2. Chia vào các giỏ (bins)
    // Ví dụ: Nhóm 0-5, 6-10, 11-20, 20+
    const bins = {
        '0-5': 0,
        '6-10': 0,
        '11-20': 0,
        '20+': 0,
    };

    userActivities.forEach((user: any) => {
        const count = user._count._all;
        if (count <= 5) bins['0-5']++;
        else if (count <= 10) bins['6-10']++;
        else if (count <= 20) bins['11-20']++;
        else bins['20+']++;
    });

    // 3. Format lại dạng mảng cho Recharts
    return [
        { bin: 'Low (0-5)', count: bins['0-5'] },
        { bin: 'Medium (6-10)', count: bins['6-10'] },
        { bin: 'High (11-20)', count: bins['11-20'] },
        { bin: 'Super (20+)', count: bins['20+'] },
    ];
}
