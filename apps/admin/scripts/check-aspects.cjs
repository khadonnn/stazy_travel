const { prisma } = require('../../packages/product-db/dist/index.js');

async function main() {
    // Lấy 3 review đầu tiên có explicitSentiments để xem aspect keys
    const reviews = await prisma.review.findMany({
        where: {
            explicitSentiments: { not: null },
        },
        take: 10,
        select: {
            id: true,
            explicitSentiments: true,
            sentiment: true,
            rating: true,
            comment: true,
        },
    });

    console.log(`Total reviews with explicitSentiments: ${reviews.length}\n`);

    // Collect tất cả aspect keys duy nhất
    const allAspects = new Set();
    for (const r of reviews) {
        if (r.explicitSentiments && typeof r.explicitSentiments === 'object') {
            Object.keys(r.explicitSentiments).forEach((k) => allAspects.add(k));
        }
    }

    console.log('=== 7 Aspect Keys ===');
    console.log(Array.from(allAspects));

    // In chi tiết từng review
    console.log('\n=== Chi tiết từng review ===');
    for (const r of reviews) {
        console.log(`\n--- Review ${r.id} (rating: ${r.rating}, sentiment: ${r.sentiment}) ---`);
        if (r.comment) console.log(`Comment: ${r.comment.substring(0, 100)}...`);
        if (r.explicitSentiments && typeof r.explicitSentiments === 'object') {
            console.log('explicitSentiments:', JSON.stringify(r.explicitSentiments, null, 2));
        }
    }

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
