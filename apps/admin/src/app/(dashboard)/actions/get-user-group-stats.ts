'use server';
import { prisma } from '@repo/product-db';

export interface UserGroupStat {
    name: string;
    Registered: number;
    Guest: number;
}

export async function getUserGroupStats(): Promise<UserGroupStat[]> {
    try {
        // Registered users = có userId trong bảng User
        // Guests = có userId nhưng role = USER và chưa có booking
        // Tuy nhiên trong schema hiện tại, tất cả interaction đều có userId
        // Vậy ta phân biệt dựa trên: user đã từng BOOK vs chưa BOOK

        // Đếm interaction theo type cho users đã từng đặt phòng (BOOK interaction)
        const bookedUserIds = await prisma.interaction.findMany({
            where: { type: 'BOOK' },
            distinct: ['userId'],
            select: { userId: true },
        });
        const bookedSet = new Set(bookedUserIds.map((u) => u.userId));

        // Lấy tất cả interactions trong 30 ngày gần nhất
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const interactions = await prisma.interaction.findMany({
            where: {
                timestamp: { gte: thirtyDaysAgo },
            },
            select: { userId: true, type: true },
        });

        let registeredViews = 0,
            guestViews = 0;
        let registeredBookings = 0,
            guestBookings = 0;
        let registeredCancels = 0,
            guestCancels = 0;

        interactions.forEach((i) => {
            const isRegistered = bookedSet.has(i.userId);
            if (i.type === 'VIEW') {
                if (isRegistered) registeredViews++;
                else guestViews++;
            } else if (i.type === 'BOOK') {
                if (isRegistered) registeredBookings++;
                else guestBookings++;
            } else if (i.type === 'CANCEL') {
                if (isRegistered) registeredCancels++;
                else guestCancels++;
            }
        });

        return [
            { name: 'Views', Registered: registeredViews, Guest: guestViews },
            { name: 'Đặt phòng', Registered: registeredBookings, Guest: guestBookings },
            { name: 'Hủy phòng', Registered: registeredCancels, Guest: guestCancels },
        ];
    } catch (error) {
        console.error('❌ Lỗi lấy thống kê nhóm người dùng:', error);
        return [];
    }
}
