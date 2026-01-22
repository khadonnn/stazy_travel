'use server';

import { unstable_noStore as noStore } from 'next/cache';

// 🔥 Fetch từ MongoDB qua Booking Service API
const BOOKING_API = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost:8001';

export async function getLatestTransactions() {
    noStore(); // Disable Next.js cache để luôn lấy data mới nhất

    try {
        // Fetch từ MongoDB (real-time bookings)
        const response = await fetch(`${BOOKING_API}/bookings/recent`, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const bookings = await response.json();

        // Map dữ liệu từ MongoDB sang format UI
        return bookings.slice(0, 5).map((b: any) => ({
            id: b._id || b.bookingId,
            hotelTitle: b.bookingSnapshot?.hotel?.name || 'Unknown Hotel',
            customerName: b.contactDetails?.fullName || 'Anonymous',
            customerAvatar: 'https://github.com/shadcn.png', // MongoDB không lưu avatar
            amount: Number(b.totalPrice),
            status: mapStatus(b.status),
        }));
    } catch (error) {
        console.error('⚠️ Error fetching recent transactions from MongoDB:', error);
        return []; // Trả về mảng rỗng để kích hoạt mock data
    }
}

// Hàm chuyển đổi trạng thái từ Database (Enum) sang hiển thị UI
function mapStatus(dbStatus: string) {
    if (dbStatus === 'CONFIRMED' || dbStatus === 'COMPLETED') return 'Confirmed';
    if (dbStatus === 'PENDING') return 'Pending';
    if (dbStatus === 'CANCELLED') return 'Cancelled';
    return 'Pending';
}
