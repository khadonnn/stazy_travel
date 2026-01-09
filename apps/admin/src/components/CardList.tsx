'use client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { getPopularStays } from '@/app/(dashboard)/actions/get-popular-stays';
import { getLatestTransactions } from '@/app/(dashboard)/actions/get-latest-transactions';

// Dữ liệu mẫu (mock data) cho Hotel Booking

// 1. Dữ liệu Khách sạn Nổi bật (Top Performing Hotels) - Thay thế popularProducts
const mockHotels = [
    {
        id: 1,
        title: 'Khách sạn Rex Sài Gòn',
        featuredImage: 'https://images.pexels.com/photos/5191371/pexels-photo-5191371.jpeg',
        address: 'Quận 1, TP.HCM',
        viewCount: 602, // Có thể dùng làm chỉ số "phổ biến"
        reviewStar: 4.8,
        price: 600000, // Giá/Đêm (VND)
    },
    {
        id: 2,
        title: 'InterContinental Hà Nội',
        featuredImage: 'https://images.pexels.com/photos/2506988/pexels-photo-2506988.jpeg',
        address: 'Quận Tây Hồ, Hà Nội',
        viewCount: 520,
        reviewStar: 4.6,
        price: 1500000,
    },
    {
        id: 3,
        title: 'Khách sạn A La Carte Đà Nẵng',
        featuredImage: 'https://images.pexels.com/photos/2373201/pexels-photo-2373201.jpeg',
        address: 'Quận Sơn Trà, Đà Nẵng',
        viewCount: 480,
        reviewStar: 4.5,
        price: 950000,
    },
    {
        id: 4,
        title: 'The Myst Đồng Khởi',
        featuredImage: 'https://images.pexels.com/photos/1268871/pexels-photo-1268871.jpeg',
        address: 'Quận 1, TP.HCM',
        viewCount: 410,
        reviewStar: 4.9,
        price: 1800000,
    },
    {
        id: 5,
        title: 'Fusion Resort Phú Quốc',
        featuredImage: 'https://images.pexels.com/photos/1179156/pexels-photo-1179156.jpeg',
        address: 'Bãi Ông Lang, Phú Quốc',
        viewCount: 350,
        reviewStar: 4.7,
        price: 2200000,
    },
];

// 2. Dữ liệu Giao dịch Đặt phòng Gần đây (Recent Bookings) - Thay thế latestTransactions
const recentBookings = [
    {
        id: 101,
        hotelTitle: 'Khách sạn Rex Sài Gòn',
        customerName: 'Nguyễn Văn A',
        customerAvatar:
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        amount: 3200000, // Tổng tiền booking
        status: 'Confirmed',
    },
    {
        id: 102,
        hotelTitle: 'InterContinental Hà Nội',
        customerName: 'Trần Thị B',
        customerAvatar:
            'https://images.pexels.com/photos/4969918/pexels-photo-4969918.jpeg?auto=compress&cs=tinysrgb&w=800',
        amount: 4500000,
        status: 'Pending',
    },
    {
        id: 103,
        hotelTitle: 'Khách sạn A La Carte Đà Nẵng',
        customerName: 'Lê Văn C',
        customerAvatar:
            'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=800',
        amount: 1900000,
        status: 'Cancelled', // Hành vi "Cancel" quan trọng cho Behavior Analytics
    },
    {
        id: 104,
        hotelTitle: 'The Myst Đồng Khởi',
        customerName: 'Phạm Thu D',
        customerAvatar:
            'https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg?auto=compress&cs=tinysrgb&w=800',
        amount: 7200000,
        status: 'Confirmed',
    },
    {
        id: 105,
        hotelTitle: 'Fusion Resort Phú Quốc',
        customerName: 'Hoàng Minh E',
        customerAvatar:
            'https://images.pexels.com/photos/1680175/pexels-photo-1680175.jpeg?auto=compress&cs=tinysrgb&w=800',
        amount: 11000000,
        status: 'Confirmed',
    },
];

const mockBookings = [
    {
        id: 'mock-b1',
        hotelTitle: 'Khách sạn Rex (Mock)',
        customerName: 'Nguyễn Văn A',
        customerAvatar: 'https://github.com/shadcn.png',
        amount: 3200000,
        status: 'Confirmed',
    },
    // ... thêm mock data nếu cần
];

// Hàm format tiền
const formatCurrency = (amount: number) => {
    const valueInThousands = amount / 1000;
    const formattedValue = new Intl.NumberFormat('vi-VN').format(valueInThousands);
    return `${formattedValue}K`;
};

const CardList = ({ title }: { title: string }) => {
    // 1. Xác định loại danh sách
    const isHotelList = title === 'Popular Stays' || title === 'Top Recommended Stays';

    // 2. Fetch Data (Chỉ chạy query tương ứng với loại list)
    const { data: hotelData } = useQuery({
        queryKey: ['popular-stays'],
        queryFn: async () => await getPopularStays(),
        enabled: isHotelList, // Chỉ fetch nếu là list khách sạn
    });

    const { data: bookingData } = useQuery({
        queryKey: ['latest-transactions'],
        queryFn: async () => await getLatestTransactions(),
        enabled: !isHotelList, // Chỉ fetch nếu là list booking
    });

    // 3. Logic chọn Data (Real vs Mock)
    // Nếu là Hotel List: lấy hotelData thật, nếu rỗng thì lấy mockHotels
    // Nếu là Booking List: lấy bookingData thật, nếu rỗng thì lấy mockBookings
    const realData = isHotelList ? hotelData : bookingData;
    const listData = realData && realData.length > 0 ? realData : isHotelList ? mockHotels : mockBookings;

    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'Confirmed':
                return 'bg-green-600 text-white hover:bg-green-700';
            case 'Pending':
                return 'bg-blue-600 text-white hover:bg-blue-700';
            case 'Cancelled':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    return (
        <div className="w-full">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-lg font-medium">{title}</h1>
                {/* Chỉ báo trạng thái dữ liệu */}
                {realData && realData.length > 0 ? (
                    <span className="animate-pulse text-[10px] font-bold text-green-500">● LIVE</span>
                ) : (
                    <span className="text-[10px] font-bold text-gray-400">● MOCK</span>
                )}
            </div>

            <ScrollArea className="max-h-[400px] overflow-y-auto pr-4">
                <div className="flex flex-col gap-3">
                    {listData.map((item: any) => {
                        if (isHotelList) {
                            // --- RENDER HOTEL CARD ---
                            return (
                                <Card
                                    key={item.id}
                                    className="hover:bg-accent/50 flex flex-row items-center justify-between gap-3 p-3 transition"
                                >
                                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border">
                                        <Image
                                            src={item.featuredImage}
                                            alt={item.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                                        <CardTitle className="mb-1 truncate text-sm font-medium">
                                            {item.title}
                                        </CardTitle>
                                        <div className="flex items-end justify-between">
                                            <div className="flex flex-col gap-0.5">
                                                <Badge
                                                    variant="secondary"
                                                    className="h-5 w-fit max-w-[120px] truncate px-1.5 text-[10px]"
                                                >
                                                    {item.address}
                                                </Badge>
                                                <div className="text-muted-foreground mt-1 text-xs">
                                                    <span className="text-foreground font-bold underline decoration-dotted underline-offset-2">
                                                        {formatCurrency(item.price)}
                                                    </span>
                                                    <span className="ml-1 text-[10px]">({item.viewCount} views)</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs font-semibold">
                                                ⭐ {item.reviewStar}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        } else {
                            // --- RENDER BOOKING CARD ---
                            const statusClass = getStatusClasses(item.status);
                            const variant = statusClass === 'destructive' ? 'destructive' : 'secondary';
                            const className = statusClass === 'destructive' ? '' : statusClass;

                            return (
                                <Card
                                    key={item.id}
                                    className="hover:bg-accent/50 flex flex-row items-center justify-between gap-3 p-3 transition"
                                >
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border">
                                        <Image
                                            src={item.customerAvatar}
                                            alt={item.customerName || 'User'}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">{item.customerName}</div>
                                        <div className="text-muted-foreground truncate text-xs">{item.hotelTitle}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="text-sm font-semibold">{formatCurrency(item.amount)}</div>
                                        <Badge
                                            variant={variant}
                                            className={`h-auto px-2 py-0.5 text-[10px] ${className}`}
                                        >
                                            {item.status}
                                        </Badge>
                                    </div>
                                </Card>
                            );
                        }
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};

export default CardList;
