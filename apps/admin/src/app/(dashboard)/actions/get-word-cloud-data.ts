'use server';
import { prisma } from '@repo/product-db';

export interface WordCloudItem {
    text: string;
    value: number;
}

export async function getWordCloudData(): Promise<WordCloudItem[]> {
    try {
        // Lấy tất cả comments từ Review
        const reviews = await prisma.review.findMany({
            where: {
                comment: { not: null },
            },
            select: { comment: true },
        });

        if (reviews.length === 0) return [];

        // Đếm tần suất từ khóa
        const wordCount = new Map<string, number>();
        // Các stopwords tiếng Việt
        const stopwords = new Set([
            'và',
            'của',
            'là',
            'có',
            'được',
            'cho',
            'với',
            'các',
            'này',
            'đó',
            'một',
            'không',
            'đã',
            'tôi',
            'rất',
            'nhưng',
            'hay',
            'thì',
            'ở',
            'vì',
            'nếu',
            'để',
            'khi',
            'hay',
            'cũng',
            'như',
            'đang',
            'vẫn',
            'nữa',
            'từ',
            'the',
            'a',
            'an',
            'is',
            'was',
            'are',
            'were',
            'be',
            'been',
            'being',
            'have',
            'has',
            'had',
            'do',
            'does',
            'did',
            'will',
            'would',
            'could',
            'should',
            'may',
            'might',
            'shall',
            'can',
            'need',
            'dare',
            'ought',
            'and',
            'or',
            'but',
            'if',
            'while',
            'of',
            'at',
            'by',
            'for',
            'with',
            'about',
            'between',
            'through',
            'to',
            'from',
            'in',
            'on',
            'it',
            'this',
            'that',
            'not',
            'so',
            'as',
            'its',
            'my',
            'his',
            'her',
            'our',
            'their',
            'very',
            'too',
            'just',
            'than',
            'more',
            'most',
            'some',
            'any',
            'all',
        ]);

        reviews.forEach((r) => {
            if (!r.comment) return;
            // Tách từ, normalize
            const words = r.comment
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Giữ chữ Unicode (tiếng Việt)
                .split(/\s+/)
                .filter((w) => w.length >= 2 && !stopwords.has(w));

            words.forEach((w) => {
                wordCount.set(w, (wordCount.get(w) || 0) + 1);
            });
        });

        // Sắp xếp theo tần suất, lấy top 30
        const sorted = Array.from(wordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30);

        return sorted.map(([text, value]) => ({ text, value }));
    } catch (error) {
        console.error('❌ Lỗi lấy dữ liệu word cloud:', error);
        return [];
    }
}
