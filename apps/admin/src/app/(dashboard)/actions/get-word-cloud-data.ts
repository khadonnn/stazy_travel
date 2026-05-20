'use server';
import { prisma } from '@repo/product-db';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface WordCloudItem {
    text: string;
    value: number;
}

// Load stopwords from dataset files (cached in memory)
let _stopwords: Set<string> | null = null;

function loadStopwords(): Set<string> {
    if (_stopwords) return _stopwords;
    _stopwords = new Set<string>();

    // Try loading from search-service dataset files
    const basePath = join(process.cwd(), '..', 'search-service', 'dataset');

    try {
        // Load TuDon.txt (single-character Vietnamese words / particles)
        const tudon = readFileSync(join(basePath, 'TuDon.txt'), 'utf-8');
        tudon.split('\n').forEach((line) => {
            const w = line.trim().toLowerCase();
            if (w) _stopwords!.add(w);
        });
    } catch {
        console.log('[wordcloud] TuDon.txt not found, using fallback');
    }

    try {
        // Load vietnamese-stopwords.txt (multi-word stopwords)
        const vnStopwords = readFileSync(join(basePath, 'vietnamese-stopwords.txt'), 'utf-8');
        vnStopwords.split('\n').forEach((line) => {
            const w = line.trim().toLowerCase();
            if (w) _stopwords!.add(w);
        });
    } catch {
        console.log('[wordcloud] vietnamese-stopwords.txt not found, using fallback');
    }

    // Add common English stopwords
    const enStops = [
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
        'ok',
    ];
    enStops.forEach((w) => _stopwords!.add(w));

    // Add common Vietnamese functional words that might not be in the files
    const extraViStops = [
        'ạ',
        'ơi',
        'nhé',
        'nha',
        'à',
        'ừ',
        'ừm',
        'ủa',
        'dạ',
        'vâng',
        'ok',
        'okay',
        'thanks',
        'good',
        'nice',
        'great',
        'best',
    ];
    extraViStops.forEach((w) => _stopwords!.add(w));

    console.log(`[wordcloud] Loaded ${_stopwords.size} stopwords`);
    return _stopwords;
}

/**
 * Extract meaningful Vietnamese word/phrase tokens from text.
 * Uses unigrams + bigrams for compound words like "hồ bơi", "phòng sạch".
 */
function tokenizeVietnamese(text: string, stopwords: Set<string>): string[] {
    // Normalize: lowercase, remove punctuation, keep Vietnamese chars
    const cleaned = text
        .toLowerCase()
        .normalize('NFC')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const rawWords = cleaned.split(' ').filter((w) => w.length >= 2);

    const tokens: string[] = [];

    // Unigrams (single meaningful words)
    for (const word of rawWords) {
        if (!stopwords.has(word) && word.length >= 2) {
            tokens.push(word);
        }
    }

    // Bigrams (2-word compounds — common in Vietnamese)
    // e.g., "hồ bơi", "phòng sạch", "nhà hàng", "bãi biển", "nhân viên"
    for (let i = 0; i < rawWords.length - 1; i++) {
        const w1 = rawWords[i]!;
        const w2 = rawWords[i + 1]!;

        // Only create bigram if BOTH words are not stopwords
        // This filters out compounds like "của tôi" but keeps "phòng sạch"
        if (!stopwords.has(w1) && !stopwords.has(w2) && w1.length >= 2 && w2.length >= 2) {
            tokens.push(`${w1} ${w2}`);
        }
    }

    return tokens;
}

/**
 * Lấy dữ liệu Word Cloud từ Review.comment
 * Hỗ trợ filter theo sentiment (POSITIVE/NEGATIVE/NEUTRAL).
 * Dùng on-the-fly processing — không cần lưu embedding.
 *
 * Improvements:
 * - Loads stopwords from TuDon.txt + vietnamese-stopwords.txt
 * - Extracts Vietnamese bigrams (compound words)
 * - Returns top 50 instead of 30
 */
export async function getWordCloudData(
    sentimentFilter?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
): Promise<WordCloudItem[]> {
    try {
        const stopwords = loadStopwords();

        // Build where clause
        const where: Record<string, unknown> = {
            comment: { not: null },
        };
        if (sentimentFilter) {
            where.sentiment = sentimentFilter;
        }

        // Lấy comments từ Review (giới hạn 3000 để bao quát hơn)
        const reviews = await prisma.review.findMany({
            where,
            select: { comment: true, sentiment: true },
            take: 3000,
            orderBy: { createdAt: 'desc' },
        });

        if (reviews.length === 0) return [];

        // Đếm tần suất từ khóa (unigrams + bigrams)
        const wordCount = new Map<string, number>();

        for (const r of reviews) {
            if (!r.comment) continue;
            const tokens = tokenizeVietnamese(r.comment, stopwords);
            for (const token of tokens) {
                wordCount.set(token, (wordCount.get(token) || 0) + 1);
            }
        }

        // Filter: keep tokens that appear at least 2 times (removes noise)
        // For bigrams, single occurrence is also fine (they're already meaningful)
        const filtered = Array.from(wordCount.entries()).filter(([word, count]) => {
            // Single words need >= 2 occurrences
            if (!word.includes(' ')) return count >= 2;
            // Bigrams are meaningful even at 1 occurrence
            return count >= 1;
        });

        // Sort by frequency, take top 50
        const sorted = filtered.sort((a, b) => b[1] - a[1]).slice(0, 50);

        console.log(
            `[wordcloud] Processed ${reviews.length} reviews → ${wordCount.size} unique tokens → top ${sorted.length}`,
        );

        return sorted.map(([text, value]) => ({ text, value }));
    } catch (error) {
        console.error('❌ Lỗi lấy dữ liệu word cloud:', error);
        return [];
    }
}
