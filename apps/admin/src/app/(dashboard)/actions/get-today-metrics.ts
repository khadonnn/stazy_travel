'use server';

// 1. Import MongoDB Model (để lấy doanh thu)
import { Booking, connectBookingDB } from '@repo/booking-db';
// 2. Import Prisma & Enum (để lấy views từ Postgres)
import { prisma, InteractionType } from '@repo/product-db';
import { startOfDay, endOfDay } from 'date-fns';

export async function getTodayMetrics() {
    try {
        // Connect to MongoDB first
        await connectBookingDB();

        const start = startOfDay(new Date()); // 00:00 hôm nay
        const end = endOfDay(new Date()); // 23:59 hôm nay

        // --- BƯỚC 2: QUERY MONGODB (DOANH THU & BOOKING) ---
        // Logic: Tính tổng tiền các đơn CONFIRMED/COMPLETED
        const bookingPromise = Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lte: end }, // Đơn tạo hôm nay
                },
            },
            {
                $group: {
                    _id: null,
                    revenue: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['CONFIRMED', 'COMPLETED']] }, '$totalPrice', 0],
                        },
                    },
                    bookings: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['CONFIRMED', 'COMPLETED']] }, 1, 0],
                        },
                    },
                    cancels: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0],
                        },
                    },
                },
            },
        ]);

        // --- BƯỚC 3: QUERY POSTGRES (VIEWS) ---
        // Logic: Đếm số dòng trong bảng Interaction có type = VIEW và timestamp hôm nay
        const viewPromise = prisma.interaction.count({
            where: {
                timestamp: {
                    gte: start,
                    lte: end,
                },
                type: InteractionType.VIEW, // Hoặc chuỗi "VIEW" nếu enum lỗi
            },
        });

        // --- BƯỚC 4: CHẠY SONG SONG (Promise.all) ---
        // Để tối ưu tốc độ, ta chạy cả 2 query cùng lúc
        const [bookingStats, totalViews] = await Promise.all([bookingPromise, viewPromise]);

        // Xử lý kết quả Mongo (nếu mảng rỗng thì trả về 0)
        const result = bookingStats[0] || { revenue: 0, bookings: 0, cancels: 0 };

        // --- BƯỚC 5: TRẢ VỀ KẾT QUẢ GỘP ---
        return {
            revenue: result.revenue, // Từ Mongo
            bookings: result.bookings, // Từ Mongo
            cancels: result.cancels, // Từ Mongo
            views: totalViews, // Từ Postgres (Prisma)
        };
    } catch (error) {
        console.error('❌ Lỗi getTodayMetrics:', error);
        // Trả về số 0 hết nếu lỗi để UI không chết
        return { revenue: 0, bookings: 0, cancels: 0, views: 0 };
    }
}
