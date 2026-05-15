'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRef, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface UserBooking {
    id: string;
    hotelId?: number;
    hotelTitle: string;
    featuredImage: string;
    address: string;
    reviewStar: number;
    price: number;
    amount: number;
    status: string;
    checkIn: string | Date;
    checkOut: string | Date;
    nights: number;
    createdAt: string | Date;
}

interface UserBookingsCardListProps {
    bookings: UserBooking[];
    isLoadingMore?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
}

const formatCurrency = (amount: number) => {
    const valueInThousands = amount / 1000;
    const formattedValue = new Intl.NumberFormat('vi-VN').format(valueInThousands);
    return `${formattedValue}K`;
};

const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

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

const UserBookingsCardList = ({
    bookings,
    isLoadingMore = false,
    hasMore = false,
    onLoadMore,
}: UserBookingsCardListProps) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const lastBookingRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (isLoadingMore) return;
            if (observerRef.current) observerRef.current.disconnect();

            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0]?.isIntersecting && hasMore && onLoadMore) {
                        onLoadMore();
                    }
                },
                { threshold: 0.1 },
            );

            if (node) {
                observerRef.current.observe(node);
                sentinelRef.current = node;
            }
        },
        [isLoadingMore, hasMore, onLoadMore],
    );

    useEffect(() => {
        return () => {
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, []);

    if (!bookings || bookings.length === 0) {
        return (
            <div className="w-full">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-lg font-medium">Booked Stays</h1>
                    <span className="text-[10px] font-bold text-gray-400">● 0 bookings</span>
                </div>
                <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                    No bookings found
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-lg font-medium">Booked Stays</h1>
                <span className="animate-pulse text-[10px] font-bold text-green-500">● {bookings.length} bookings</span>
            </div>

            <ScrollArea className="max-h-[500px] border-r border-white/[0.04] [&>[data-radix-scroll-area-viewport]]:pr-4 [&>[data-radix-scroll-area-viewport]]:[scrollbar-color:rgba(255,255,255,0.08)_transparent] [&>[data-radix-scroll-area-viewport]]:[scrollbar-width:thin] [&>[data-radix-scroll-area-viewport]::-webkit-scrollbar]:w-[2px] [&>[data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb]:rounded-full [&>[data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb]:bg-transparent hover:[&>[data-radix-scroll-area-viewport]::-webkit-scrollbar-thumb]:bg-white/[0.08] [&>[data-radix-scroll-area-viewport]::-webkit-scrollbar-track]:bg-transparent">
                <div className="flex flex-col gap-3">
                    {bookings.map((item, index) => {
                        const statusClass = getStatusClasses(item.status);
                        const variant = statusClass === 'destructive' ? 'destructive' : 'secondary';
                        const className = statusClass === 'destructive' ? '' : statusClass;
                        const isLast = index === bookings.length - 1;

                        return (
                            <Card
                                key={item.id}
                                ref={isLast ? lastBookingRef : undefined}
                                className="hover:bg-accent/50 flex flex-row items-center gap-3 p-2 transition"
                            >
                                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border">
                                    <Image
                                        src={item.featuredImage}
                                        alt={item.hotelTitle}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col justify-center">
                                    <CardTitle className="mb-1 truncate text-sm font-medium">
                                        {item.hotelTitle}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className="h-5 w-fit max-w-[140px] truncate px-1.5 text-[10px]"
                                        >
                                            {item.address}
                                        </Badge>
                                        <span className="text-muted-foreground text-[10px]">
                                            {formatDate(item.checkIn)} - {formatDate(item.checkOut)}
                                        </span>
                                    </div>
                                    <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                                        <span className="text-foreground font-bold underline decoration-dotted underline-offset-2">
                                            {formatCurrency(item.amount)}
                                        </span>
                                        <span className="text-[10px]">({item.nights} nights)</span>
                                        <span className="text-[10px]">⭐ {item.reviewStar}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant={variant} className={`h-auto px-2 py-0.5 text-[10px] ${className}`}>
                                        {item.status}
                                    </Badge>
                                </div>
                            </Card>
                        );
                    })}
                    {isLoadingMore && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                            <span className="text-muted-foreground ml-2 text-sm">Loading more...</span>
                        </div>
                    )}
                    {!hasMore && bookings.length > 0 && (
                        <div className="text-muted-foreground py-2 text-center text-xs">All bookings loaded</div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default UserBookingsCardList;
