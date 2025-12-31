'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Eye, RefreshCw, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
// 1. Thay thế import từ store cũ bằng Clerk
import { useAuth, useUser } from '@clerk/nextjs'; 
import { bookingApi } from '@/lib/api/booking';

interface UserBooking {
    id: number;
    booking_number: string;
    hotel_id: number;
    check_in_date: string;
    check_out_date: string;
    nights: number;
    status: string;
    total_amount: number;
    price_per_night: number;
    created_at: string;
    updated_at: string;
    hotel: {
        id: number;
        title: string;
        slug: string;
        featured_image: string;
        address: string;
        price_per_night: number;
    };
    payments?: Array<{
        id: number;
        status: string;
        amount: number;
        created_at: string;
    }>;
}

const PaymentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getBadgeStyle = (status: string) => {
        switch (status) {
            case 'completed':
            case 'paid':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'failed':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
            case 'paid': return 'Đã thanh toán';
            case 'pending': return 'Chờ thanh toán';
            case 'failed': return 'Thất bại';
            case 'cancelled': return 'Đã hủy';
            default: return status;
        }
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(status)}`}>
            {getStatusText(status)}
        </span>
    );
};

const MyBooking: React.FC = () => {
    const router = useRouter();
    
    // 2. Sử dụng hook của Clerk
    const { isLoaded, isSignedIn, userId } = useAuth();
    // const { user } = useUser(); // Nếu cần lấy thông tin chi tiết user (name, email...)

    const [bookings, setBookings] = useState<UserBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getPaymentStatus = (booking: UserBooking) => {
        if (booking.payments && booking.payments.length > 0) {
            const latestPayment = [...booking.payments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            if (latestPayment?.status === 'completed') return 'paid';
            if (latestPayment?.status === 'failed') return 'failed';
            return 'pending';
        }
        return 'pending';
    };

    const loadBookings = useCallback(async () => {
        // 3. Check trạng thái login bằng biến của Clerk
        if (!isLoaded || !isSignedIn) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            // Gọi API (Lưu ý: bookingApi cần token, Clerk tự xử lý token ở tầng middleware hoặc bạn cần getToken() để truyền vào header nếu gọi từ client)
            // Ví dụ nếu bookingApi tự xử lý:
            const response = await bookingApi.getUserBookings({
                per_page: 50,
                sort_by: 'created_at',
                sort_order: 'desc',
            });

            if (response.success && response.data) {
                let bookingData: UserBooking[] = [];
                if (Array.isArray(response.data)) {
                    bookingData = response.data;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    bookingData = response.data.data;
                }
                setBookings(bookingData);
                setLastRefreshed(new Date());
            } else {
                setBookings([]);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Không thể tải lịch sử đặt phòng');
        } finally {
            setLoading(false);
        }
    }, [isLoaded, isSignedIn]); // Dependency thay đổi theo Clerk

    useEffect(() => {
        if (isLoaded) {
             loadBookings();
        }
    }, [isLoaded, loadBookings]);

    // --- RENDER ---
    
    // 4. Hiển thị loading khi Clerk đang khởi tạo
    if (!isLoaded) {
         return (
            <div className='max-w-7xl mx-auto px-4 py-12 text-center animate-pulse'>
                 Loading authentication...
            </div>
        );
    }

    // 5. Nếu chưa đăng nhập -> Hiện thông báo
    if (!isSignedIn) {
        return (
            <div className='max-w-7xl mx-auto px-4 py-12 text-center'>
                 <h1 className='text-2xl font-bold mb-4'>Lịch sử đặt phòng</h1>
                 <p className='text-gray-600 mb-4'>Vui lòng đăng nhập để xem thông tin.</p>
                 {/* Bạn có thể thêm nút redirect tới trang sign-in của Clerk ở đây */}
                 <button 
                    onClick={() => router.push('/sign-in')}
                    className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition'
                 >
                    Đăng nhập
                 </button>
            </div>
        );
    }

    if (loading && bookings.length === 0) {
        return (
            <div className='max-w-7xl mx-auto px-4 py-8 animate-pulse'>
                <div className='h-8 bg-gray-200 rounded w-48 mb-6'></div>
                <div className='space-y-4'>
                    {[1,2,3].map(i => <div key={i} className='h-20 bg-gray-100 rounded'></div>)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
             <div className='max-w-7xl mx-auto px-4 py-8 text-center'>
                <p className='text-red-600 mb-4'>{error}</p>
                <button onClick={loadBookings} className='bg-blue-600 text-white px-4 py-2 rounded'>Thử lại</button>
             </div>
        );
    }

    return (
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
            <div className='mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
                <div>
                    <h1 className='text-3xl font-bold text-gray-900'>Lịch sử đặt phòng</h1>
                    <p className='text-gray-600 mt-1 text-sm'>
                        Cập nhật: {lastRefreshed.toLocaleTimeString('vi-VN')}
                    </p>
                </div>
                <button
                    onClick={loadBookings}
                    disabled={loading}
                    className='bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm'
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>

            {bookings.length === 0 ? (
                <div className='text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100'>
                    <FileText className='w-16 h-16 mx-auto text-gray-300 mb-4' />
                    <h3 className='text-lg font-medium text-gray-900'>Chưa có đặt phòng nào</h3>
                    <p className='text-gray-500 mb-6 mt-2'>Hãy trải nghiệm kỳ nghỉ tuyệt vời cùng Stazy Hotel</p>
                    <button
                        onClick={() => router.push('/hotels')}
                        className='bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition'
                    >
                        Khám phá ngay
                    </button>
                </div>
            ) : (
                <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
                    <div className='overflow-x-auto'>
                        <table className='min-w-full divide-y divide-gray-200'>
                            <thead className='bg-gray-50'>
                                <tr>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Mã Booking</th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Khách sạn</th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Thời gian</th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Tổng tiền</th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Trạng thái</th>
                                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className='bg-white divide-y divide-gray-200'>
                                {bookings.map((booking) => (
                                    <tr key={booking.id} className='hover:bg-gray-50 transition-colors'>
                                        <td className='px-6 py-4 whitespace-nowrap font-medium text-gray-900'>
                                            {booking.booking_number || `#${booking.id}`}
                                        </td>
                                        <td className='px-6 py-4'>
                                            <div className='text-sm text-gray-900 font-medium'>{booking.hotel?.title || 'Unknown Hotel'}</div>
                                            <div className='text-xs text-gray-500 truncate max-w-[200px]'>{booking.hotel?.address}</div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                                            <div>In: {booking.check_in_date ? formatDate(booking.check_in_date) : 'N/A'}</div>
                                            <div>Out: {booking.check_out_date ? formatDate(booking.check_out_date) : 'N/A'}</div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900'>
                                            {formatCurrency(booking.total_amount || 0)}
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <PaymentStatusBadge status={getPaymentStatus(booking)} />
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-right'>
                                            <button
                                                onClick={() => router.push(`/hotels/${booking.hotel_id}`)}
                                                className='text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition'
                                                title="Xem khách sạn"
                                            >
                                                <Eye className='w-5 h-5' />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyBooking;