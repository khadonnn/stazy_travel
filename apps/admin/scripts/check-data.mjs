import { prisma } from '../../../packages/product-db/dist/index.js';

async function main() {
    const total = await prisma.booking.count();
    const totalViews = await prisma.interaction.count({ where: { type: 'VIEW' } });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    const todayBookings = await prisma.booking.findMany({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        select: { id: true, status: true, totalAmount: true, createdAt: true },
    });
    console.log('Total bookings:', total);
    console.log('Today bookings:', todayBookings.length);
    console.log('Total views:', totalViews);
    console.log('Latest today:', JSON.stringify(todayBookings, null, 2));

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
