import { prisma } from '@repo/product-db';

async function main() {
    // Lấy các aspect keys duy nhất từ explicitSentiments
    const result: Array<{ explicitSentiments: any }> = await prisma.$queryRawUnsafe(`
        SELECT DISTINCT jsonb_object_keys(COALESCE(explicit_sentiments, '{}'::jsonb)) AS aspect
        FROM reviews
        WHERE explicit_sentiments IS NOT NULL AND explicit_sentiments != '{}'::jsonb
        ORDER BY aspect
    `);

    console.log('=== Các Aspect Keys trong DB ===');
    console.log(result.map((r: any) => r.aspect));

    // Lấy 3 mẫu dữ liệu
    const samples: Array<{ id: string; explicit_sentiments: any; comment: string; rating: number; sentiment: string }> =
        await prisma.$queryRawUnsafe(`
        SELECT id, explicit_sentiments, LEFT(comment, 150) as comment, rating, sentiment
        FROM reviews
        WHERE explicit_sentiments IS NOT NULL AND explicit_sentiments != '{}'::jsonb
        LIMIT 5
    `);

    console.log('\n=== Mẫu dữ liệu ===');
    for (const s of samples) {
        console.log(`\n--- Review ${s.id} (rating: ${s.rating}, sentiment: ${s.sentiment}) ---`);
        if (s.comment) console.log(`Comment: ${s.comment}...`);
        console.log('explicitSentiments:', JSON.stringify(s.explicit_sentiments, null, 2));
    }

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
