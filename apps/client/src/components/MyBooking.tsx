'use client';

import React, { useState, useEffect } from 'react';
import { Eye, Calendar, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Thay thế useNavigate
import Image from 'next/image'; // Thêm Image component nếu cần hiển thị hình ảnh trong tương lai (không dùng trong file này nhưng tốt cho tiêu chuẩn Next.js)
import { useAuthStore } from '@/store/useAuthStore';
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
    const getBadgeColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
            case 'paid':
                return 'Đã thanh toán';
            case 'pending':
                return 'Chờ thanh toán';
            case 'failed':
                return 'Thất bại';
            case 'cancelled':
                return 'Đã hủy';
            default:
                return status;
        }
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(
                status,
            )}`}
        >
            {getStatusText(status)}
        </span>
    );
};

const MyBooking: React.FC = () => {
    const router = useRouter(); // Thay thế useNavigate()
    const { authUser } = useAuthStore();
    const [bookings, setBookings] = useState<UserBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const getPaymentStatus = (booking: UserBooking) => {
        if (booking.payments && booking.payments.length > 0) {
            const latestPayment = booking.payments.sort(
                (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
            )[0];
            return latestPayment?.status === 'completed'
                ? 'paid'
                : latestPayment?.status === 'failed'
                ? 'failed'
                : 'pending';
        }
        return 'pending';
    };

    const loadBookings = async () => {
        if (!authUser) {
            setError('Vui lòng đăng nhập để xem lịch sử đặt phòng');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await bookingApi.getUserBookings({
                per_page: 50,
                sort_by: 'created_at',
                sort_order: 'desc',
            });

            if (response.success && response.data) {
                // Handle different response structures
                let bookingData;

                if (Array.isArray(response.data)) {
                    // Direct array (like debug mode)
                    bookingData = response.data;
                } else if (
                    response.data.data &&
                    Array.isArray(response.data.data)
                ) {
                    // Paginated structure
                    bookingData = response.data.data;
                } else {
                    // Fallback
                    bookingData = [];
                }

                setBookings(bookingData);
                setLastRefreshed(new Date());
            } else {
                throw new Error('Invalid API response');
            }
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải lịch sử đặt phòng',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBookings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authUser?.id]); // Thêm authUser?.id vào dependency array để tải lại khi người dùng thay đổi

    const handleViewHotel = (hotelId: number) => {
        router.push(`/hotels/${hotelId}`); // Thay thế navigate
    };

    const handleRefresh = async () => {
        await loadBookings();
    };

    if (!authUser) {
        return (
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
                <div className='text-center'>
                    <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                        Lịch sử đặt phòng
                    </h1>
                    <p className='text-gray-600'>
                        Vui lòng đăng nhập để xem lịch sử đặt phòng của bạn.
                    </p>
                </div>
            </div>
        );
    }

    if (loading && bookings.length === 0) {
        return (
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
                <div className='animate-pulse'>
                    <div className='h-8 bg-gray-200 rounded w-1/4 mb-6'></div>
                    <div className='space-y-3'>
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className='h-16 bg-gray-200 rounded'
                            ></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error && bookings.length === 0) {
        return (
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
                <div className='text-center'>
                    <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                        Lịch sử đặt phòng
                    </h1>
                    <p className='text-red-600 mb-4'>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors'
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
            <div className='mb-8 flex justify-between items-center'>
                <div>
                    <h1 className='text-3xl font-bold text-gray-900'>
                        Lịch sử đặt phòng
                    </h1>
                    <p className='text-gray-600 mt-2'>
                        Quản lý và theo dõi tất cả các đặt phòng của bạn
                        {lastRefreshed && (
                            <span className='text-sm text-gray-400 ml-2'>
                                (Cập nhật lúc:{' '}
                                {lastRefreshed.toLocaleTimeString('vi-VN')})
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2'
                >
                    <RefreshCw
                        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                    />
                    {loading ? 'Đang tải...' : 'Tải lại'}
                </button>
            </div>

            {bookings.length === 0 ? (
                <div className='text-center py-12'>
                    <div className='text-gray-400 mb-4'>
                        <Calendar className='w-16 h-16 mx-auto' />
                    </div>
                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                        Chưa có đặt phòng nào
                    </h3>
                    <p className='text-gray-600 mb-6'>
                        Bạn chưa có lịch sử đặt phòng nào. Hãy khám phá các
                        khách sạn tuyệt vời của chúng tôi!
                    </p>
                    <button
                        onClick={() => router.push('/hotels')} // Thay thế navigate
                        className='bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors'
                    >
                        Khám phá khách sạn
                    </button>
                </div>
            ) : (
                <div className='bg-white rounded-lg shadow overflow-hidden'>
                    <div className='overflow-x-auto'>
                        <table className='min-w-full divide-y divide-gray-200'>
                            <thead className='bg-gray-50'>
                                <tr>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Mã đặt phòng
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Khách hàng
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Khách sạn
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Ngày check-in/out
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Số đêm
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Trạng thái
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Tổng tiền
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='bg-white divide-y divide-gray-200'>
                                {bookings.map((booking) => (
                                    <tr
                                        key={booking.id}
                                        className='hover:bg-gray-50'
                                    >
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='text-sm font-medium text-gray-900'>
                                                {booking.booking_number ||
                                                    `#${booking.id}`}
                                            </div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div>
                                                <div className='text-sm font-medium text-gray-900'>
                                                    {authUser?.name || 'N/A'}
                                                </div>
                                                <div className='text-sm text-gray-500'>
                                                    {authUser?.email || 'N/A'}
                                                </div>
                                                {authUser?.phone && (
                                                    <div className='text-sm text-gray-500'>
                                                        {authUser.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div>
                                                <div className='text-sm font-medium text-gray-900'>
                                                    {booking.hotel?.title ||
                                                        booking.hotel_id ||
                                                        'N/A'}
                                                </div>
                                                {booking.price_per_night && (
                                                    <div className='text-sm text-gray-500'>
                                                        {formatCurrency(
                                                            booking.price_per_night,
                                                        )}
                                                        /đêm
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='flex items-center text-sm'>
                                                <Calendar className='w-4 h-4 mr-1 text-gray-400' />
                                                <div>
                                                    {booking.check_in_date && (
                                                        <div className='text-gray-900'>
                                                            {formatDate(
                                                                booking.check_in_date,
                                                            )}
                                                        </div>
                                                    )}
                                                    {booking.check_out_date && (
                                                        <div className='text-gray-500'>
                                                            {formatDate(
                                                                booking.check_out_date,
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='text-sm text-gray-900'>
                                                {booking.nights || 'N/A'}{' '}
                                                {booking.nights ? 'đêm' : ''}
                                            </div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='space-y-1'>
                                                {booking.status && (
                                                    <PaymentStatusBadge
                                                        status={getPaymentStatus(
                                                            booking,
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <div className='text-sm font-medium text-gray-900'>
                                                {booking.total_amount
                                                    ? formatCurrency(
                                                          booking.total_amount,
                                                      )
                                                    : 'Chưa có thông tin'}
                                            </div>
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap'>
                                            <button
                                                onClick={() =>
                                                    handleViewHotel(
                                                        booking.hotel_id,
                                                    )
                                                }
                                                className='text-blue-600 hover:text-blue-800 transition-colors'
                                                title='Xem chi tiết khách sạn'
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