'use server';
import { prisma } from '@repo/product-db';

export interface WordCloudItem {
    text: string;
    value: number;
}

/**
 * Lấy dữ liệu Word Cloud từ Review.comment
 * Hỗ trợ filter theo sentiment (POSITIVE/NEGATIVE/NEUTRAL) để phân tích Hybrid.
 * Dùng on-the-fly processing (không cần lưu extractedKeywords vào DB).
 */
export async function getWordCloudData(
    sentimentFilter?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
): Promise<WordCloudItem[]> {
    try {
        // Build where clause - filter theo sentiment nếu có
        const where: Record<string, unknown> = {
            comment: { not: null },
        };
        if (sentimentFilter) {
            where.sentiment = sentimentFilter;
        }

        // Lấy comments từ Review (giới hạn 2000 để tối ưu performance)
        const reviews = await prisma.review.findMany({
            where,
            select: { comment: true, sentiment: true },
            take: 2000,
            orderBy: { createdAt: 'desc' },
        });

        if (reviews.length === 0) return [];

        // Đếm tần suất từ khóa
        const wordCount = new Map<string, number>();

        // Stopwords tiếng Việt (mở rộng từ vietnamese-stopwords.txt)
        const stopwords = new Set([
            // Đại từ & từ nối phổ biến
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
            'cũng',
            'như',
            'đang',
            'vẫn',
            'nữa',
            'từ',
            'còn',
            'nên',
            'vào',
            'ra',
            'lại',
            'lên',
            'xuống',
            'sau',
            'trước',
            'trên',
            'dưới',
            'giữa',
            'ngoài',
            'trong',
            'đến',
            'tới',
            'qua',
            'hơn',
            'nhất',
            'thứ',
            'mỗi',
            'nhiều',
            'ít',
            'hết',
            'cả',
            'bởi',
            'tuy',
            'mà',
            'nếu',
            'hoặc',
            'vậy',
            'thế',
            // Stopwords chức năng
            'làm',
            'đi',
            'ấy',
            'ạ',
            'ơi',
            'nhé',
            'nha',
            'à',
            'ừ',
            'đây',
            'đâu',
            'nào',
            'sao',
            'bao',
            'biết',
            'chỉ',
            'chưa',
            'đang',
            'phải',
            'thì',
            'vẫn',
            'rằng',
            'ngay',
            'lúc',
            // English stopwords
            'the',
            'a',
            'an',
            'is',
            'was',
            'are',
            'were',
            'be',
            'been',
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
            'and',
            'or',
            'but',
            'if',
            'of',
            'at',
            'by',
            'for',
            'with',
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
            'some',
            'we',
            'you',
            'they',
            'he',
            'she',
            'no',
            'yes',
        ]);

        reviews.forEach((r) => {
            if (!r.comment) return;
            // Tách từ, normalize, giữ Unicode tiếng Việt
            const words = r.comment
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, ' ')
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
