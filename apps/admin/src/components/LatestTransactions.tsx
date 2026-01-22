'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { getLatestTransactions } from '@/app/(dashboard)/actions/get-latest-transactions';

// --- 1. MOCK DATA (Dự phòng) ---
const mockTransactions = [
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
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
};

// Hàm chọn màu Badge
const getStatusClasses = (status: string) => {
    switch (status) {
        case 'Confirmed':
            return 'bg-green-600 text-white hover:bg-green-700';
        case 'Pending':
            return 'bg-blue-600 text-white hover:bg-blue-700';
        case 'Cancelled':
            return 'destructive'; // Dùng variant có sẵn của Shadcn
        default:
            return 'secondary';
    }
};

const LatestTransactions = () => {
    // --- 2. FETCH DATA TỪ SERVER ---
    const { data: realTransactions, isLoading } = useQuery({
        queryKey: ['latest-transactions'], // Key này sẽ được reload khi bấm nút ở Navbar
        queryFn: async () => await getLatestTransactions(),
        refetchInterval: 10000, // Auto-refresh mỗi 10 giây
        staleTime: 3000, // Data cũ sau 3 giây
        refetchOnWindowFocus: true, // Refetch khi user quay lại tab
    });

    // --- 3. LOGIC CHỌN DATA (QUAN TRỌNG) ---
    // Nếu đang load -> Dùng Mock (hoặc skeleton nếu muốn)
    // Nếu đã load xong mà có dữ liệu thật -> Dùng Real
    // Nếu đã load xong mà dữ liệu thật rỗng ([]) -> Dùng Mock
    const displayData = realTransactions && realTransactions.length > 0 ? realTransactions : mockTransactions;

    return (
        <div className="w-full">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-lg font-medium">Recent Bookings</h1>
                {/* Badge nhỏ báo hiệu đang dùng data thật hay giả (Optional - để debug) */}
                {realTransactions && realTransactions.length > 0 ? (
                    <span className="animate-pulse text-xs font-medium text-green-500">● Live Data</span>
                ) : (
                    <span className="text-xs font-medium text-gray-400">● Mock Data</span>
                )}
            </div>

            <ScrollArea className="h-[400px] w-full pr-4">
                <div className="flex flex-col gap-2">
                    {displayData.map((item: any) => {
                        const statusClass = getStatusClasses(item.status);
                        const variant = statusClass === 'destructive' ? 'destructive' : 'secondary';
                        // Nếu không phải destructive thì gán className custom, nếu là destructive thì để trống (vì badge shadcn tự xử lý)
                        const className = statusClass === 'destructive' ? '' : statusClass;

                        return (
                            <Card
                                key={item.id}
                                className="hover:bg-accent/50 flex flex-row items-center justify-between gap-1.5 p-2 transition-colors"
                            >
                                {/* Avatar & Info */}
                                <div className="flex w-[145px] min-w-0 items-center gap-1.5">
                                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border">
                                        <Image
                                            src={item.customerAvatar}
                                            alt={item.customerName}
                                            fill
                                            className="object-cover"
                                            sizes="32px"
                                        />
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <CardTitle className="truncate text-sm font-medium" title={item.customerName}>
                                            {item.customerName}
                                        </CardTitle>
                                        <div
                                            className="text-muted-foreground truncate text-xs leading-tight"
                                            title={item.hotelTitle}
                                        >
                                            {item.hotelTitle}
                                        </div>
                                    </div>
                                </div>

                                {/* Amount & Status */}
                                <div className="flex w-[115px] shrink-0 flex-col items-end gap-0.5">
                                    <span className="text-sm font-semibold whitespace-nowrap">
                                        {formatCurrency(item.amount)}
                                    </span>
                                    <Badge
                                        variant={variant}
                                        className={`h-auto px-1.5 py-0.5 text-[10px] whitespace-nowrap ${className}`}
                                    >
                                        {item.status}
                                    </Badge>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};

export default LatestTransactions;
