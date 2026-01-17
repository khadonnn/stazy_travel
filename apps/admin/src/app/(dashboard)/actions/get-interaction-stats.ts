'use server';

import { InteractionType, prisma } from '@repo/product-db'; // Đảm bảo đường dẫn import đúng
import { format, subMonths, startOfDay, endOfDay } from 'date-fns';

// Định nghĩa kiểu dữ liệu trả về cho rõ ràng
interface ChartDataPoint {
    name: string;
    Views: number;
    Bookings: number;
    Cancellations: number;
}

export async function getInteractionStats(): Promise<ChartDataPoint[]> {
    try {
        // 1. Xác định khoảng thời gian (6 tháng gần nhất)
        const endDate = endOfDay(new Date());
        const startDate = startOfDay(subMonths(new Date(), 6));

        // 2. Fetch dữ liệu thô từ bảng Interaction
        // CHÚ Ý: Nếu dữ liệu quá lớn (triệu dòng), nên dùng raw SQL hoặc bảng DailyStat
        const interactions = await prisma.interaction.findMany({
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
                // Lọc trước các type cần thiết để giảm tải DB
                type: {
                    in: [InteractionType.VIEW, InteractionType.BOOK, InteractionType.CANCEL],
                },
            },
            select: {
                type: true,
                timestamp: true,
            },
            orderBy: {
                timestamp: 'asc',
            },
        });

        // 3. Xử lý Aggregate (Gộp nhóm theo ngày)
        // Map: Key là ngày (string) -> Value là object chứa số liệu
        const statsMap = new Map<string, { Views: number; Bookings: number; Cancellations: number }>();

        for (const record of interactions) {
            // Format ngày: dd/MM (Ví dụ: 01/10)
            const dateKey = format(record.timestamp, 'dd/MM');

            if (!statsMap.has(dateKey)) {
                statsMap.set(dateKey, { Views: 0, Bookings: 0, Cancellations: 0 });
            }

            const currentStat = statsMap.get(dateKey)!;

            // Cộng dồn dựa trên Enum chuẩn từ Schema
            switch (record.type) {
                case InteractionType.VIEW:
                    currentStat.Views += 1;
                    break;
                case InteractionType.BOOK:
                    currentStat.Bookings += 1;
                    break;
                case InteractionType.CANCEL:
                    currentStat.Cancellations += 1;
                    break;
                // Các trường hợp khác (LIKE, SEARCH...) đã bị lọc ở bước query
            }
        }

        // 4. Chuyển Map thành Array & Fill dữ liệu trống (Optional)
        // Nếu bạn muốn biểu đồ liên tục kể cả ngày không có data, cần loop từ startDate đến endDate.
        // Hiện tại mình giữ nguyên logic convert Map -> Array của bạn:
        const chartData: ChartDataPoint[] = Array.from(statsMap.entries()).map(([date, stats]) => ({
            name: date,
            Views: stats.Views,
            Bookings: stats.Bookings,
            Cancellations: stats.Cancellations,
        }));

        return chartData;
    } catch (error) {
        console.error('❌ Lỗi lấy thống kê Interaction:', error);
        return [];
    }
}
