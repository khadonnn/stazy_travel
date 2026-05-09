'use server';

const MOCK_BROWSER_STATS = [
    { browser: 'chrome', visitors: 4500, fill: 'var(--color-chrome)' },
    { browser: 'safari', visitors: 2500, fill: 'var(--color-safari)' },
    { browser: 'firefox', visitors: 1500, fill: 'var(--color-firefox)' },
    { browser: 'edge', visitors: 1000, fill: 'var(--color-edge)' },
    { browser: 'other', visitors: 500, fill: 'var(--color-other)' },
];

export async function getBrowserStats() {
    try {
        const { prisma } = await import('@repo/product-db');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 6);

        const totalInteractions = await prisma.interaction.count({
            where: {
                timestamp: { gte: startDate, lte: endDate },
            },
        });

        if (totalInteractions === 0) return MOCK_BROWSER_STATS;

        return [
            { browser: 'chrome', visitors: Math.floor(totalInteractions * 0.45), fill: 'var(--color-chrome)' },
            { browser: 'safari', visitors: Math.floor(totalInteractions * 0.25), fill: 'var(--color-safari)' },
            { browser: 'firefox', visitors: Math.floor(totalInteractions * 0.15), fill: 'var(--color-firefox)' },
            { browser: 'edge', visitors: Math.floor(totalInteractions * 0.1), fill: 'var(--color-edge)' },
            { browser: 'other', visitors: Math.floor(totalInteractions * 0.05), fill: 'var(--color-other)' },
        ];
    } catch (e) {
        console.warn('[getBrowserStats] DB unavailable, using mock data:', e);
        return MOCK_BROWSER_STATS;
    }
}
