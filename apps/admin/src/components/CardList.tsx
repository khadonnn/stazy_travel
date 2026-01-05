import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

// Dữ liệu mẫu (mock data) cho Hotel Booking

// 1. Dữ liệu Khách sạn Nổi bật (Top Performing Hotels) - Thay thế popularProducts
const topPerformingHotels = [
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

// Hàm format tiền tệ
const formatCurrency = (amount: number) => {
    const valueInThousands = amount / 1000;
    const formattedValue = new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(valueInThousands);
    return `${formattedValue}K`;
};

const CardList = ({ title }: { title: string }) => {
    // Hàm chọn biến thể badge dựa trên trạng thái (status)
    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'Confirmed':
                // Màu xanh lá (Green) cho Confirmed
                return 'bg-green-600 text-white dark:bg-green-700 hover:bg-green-700/80';
            case 'Pending':
                // Màu xanh dương (Blue) cho Pending
                return 'bg-blue-600 text-white dark:bg-blue-700 hover:bg-blue-700/80';
            case 'Cancelled':
                // Sử dụng variant="destructive" của Shadcn UI (sẽ tự động áp dụng màu đỏ)
                return 'destructive';
            default:
                // Màu mặc định
                return 'secondary';
        }
    };

    const isHotelList = title === 'Popular Stays' || title === 'Top Recommended Stays';
    const listData = isHotelList ? topPerformingHotels : recentBookings;
    return (
        <div>
            <h1 className="mb-6 text-lg font-medium">{title}</h1>
            <ScrollArea className="max-h-[400px] overflow-y-auto">
                <div className="flex flex-col gap-2">
                    {listData.map((item, index) => {
                        // HIỂN THỊ DANH SÁCH KHÁCH SẠN (topPerformingHotels)
                        if (isHotelList) {
                            const hotelItem = item as (typeof topPerformingHotels)[0];
                            return (
                                <Card
                                    key={hotelItem.id}
                                    className="flex flex-row items-center justify-between gap-2 p-2"
                                >
                                    {/* 1. KHỐI TRÁI: ẢNH KHÁCH SẠN */}
                                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                                        <Image
                                            src={hotelItem.featuredImage}
                                            alt={hotelItem.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    {/* 2. KHỐI PHẢI (DIV CHÍNH) - Chiếm hết không gian còn lại */}
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        {/* KHỐI TRÊN: Tên Khách sạn */}
                                        <CardTitle className="mb-1 truncate text-sm font-medium">
                                            {hotelItem.title}
                                        </CardTitle>

                                        {/* KHỐI DƯỚI: Chia thành 2 cột (Địa điểm/Đánh giá & Giá/Views) */}
                                        <div className="text-muted-foreground flex items-end justify-between text-xs">
                                            {/* Cột Trái: Địa điểm và Giá/Views */}
                                            <div className="flex min-w-0 flex-col gap-1 pr-2">
                                                {/* Địa chỉ */}
                                                <Badge variant="secondary" className="max-w-[150px] truncate">
                                                    {hotelItem.address}
                                                </Badge>
                                                {/* Giá và Views */}
                                                <div className="flex items-center">
                                                    <span className="text-foreground pr-2 text-sm font-semibold underline decoration-gray-400 underline-offset-2">
                                                        {formatCurrency(hotelItem.price)}
                                                    </span>
                                                    <span className="text-xs">({hotelItem.viewCount} Views)</span>
                                                </div>
                                            </div>

                                            {/* Cột Phải: Đánh giá */}
                                            <div className="text-foreground flex items-center gap-1 font-semibold">
                                                <span>⭐ {hotelItem.reviewStar}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <CardFooter className="hidden"></CardFooter>
                                </Card>
                            );
                        }

                        // HIỂN THỊ DANH SÁCH GIAO DỊCH/NGƯỜI DÙNG (recentBookings)
                        else {
                            const userItem = item as (typeof recentBookings)[0];
                            const statusClass = getStatusClasses(userItem.status);
                            const variant = statusClass === 'destructive' ? 'destructive' : 'secondary';
                            const className = statusClass === 'destructive' ? '' : statusClass;
                            return (
                                <Card
                                    key={userItem.id}
                                    className="flex flex-row items-center justify-between gap-2 p-2"
                                >
                                    {/* Avatar Khách hàng */}
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                                        <Image
                                            src={userItem.customerAvatar}
                                            alt={userItem.customerName}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    <CardContent className="min-w-0 flex-1 p-0">
                                        {/* Tên Khách hàng */}
                                        <CardTitle className="truncate text-sm font-medium">
                                            {userItem.customerName}
                                        </CardTitle>
                                        {/* Tên Khách sạn đã đặt */}
                                        <Badge variant="secondary" className="max-w-[150px] truncate">
                                            {userItem.hotelTitle}
                                        </Badge>
                                    </CardContent>

                                    <CardFooter className="flex flex-col items-end p-0! text-sm font-semibold whitespace-nowrap">
                                        {/* Tổng tiền */}
                                        {formatCurrency(userItem.amount)}
                                        {/* Trạng thái Booking */}
                                        <Badge variant={variant} className={`mt-1 text-xs ${className}`}>
                                            {userItem.status}
                                        </Badge>
                                    </CardFooter>
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
