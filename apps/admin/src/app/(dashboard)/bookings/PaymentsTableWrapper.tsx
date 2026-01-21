'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { debounce, filter } from 'lodash';
import { columns, Booking } from './columns';
import { DataTable } from '@/app/(dashboard)/bookings/data-table';
import { Search, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

export function PaymentsTableWrapper() {
    const { getToken } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    // Fetch bookings data với auth token
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setIsLoading(true);
                const token = await getToken();
                const BOOKING_API = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost:8001';

                const response = await fetch(`${BOOKING_API}/bookings`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: 'no-store',
                });

                if (!response.ok) {
                    console.error('Failed to fetch bookings:', response.statusText);
                    setBookings([]);
                    return;
                }

                const data = await response.json();

                // Transform data
                const transformedBookings: Booking[] = data.map((booking: any) => {
                    // Logic xác định payment method:
                    // 1. Nếu có field paymentMethod trong DB -> dùng nó
                    // 2. Nếu không có nhưng có stripeSessionId -> 'stripe'
                    // 3. Nếu status là CONFIRMED/PAID nhưng không có info -> 'stripe' (legacy data)
                    // 4. Còn lại -> 'pending'
                    let paymentMethod = 'pending';
                    if (booking.paymentMethod) {
                        paymentMethod = booking.paymentMethod.toLowerCase();
                    } else if (booking.payment?.stripeSessionId) {
                        paymentMethod = 'stripe';
                    } else if (
                        booking.status?.toLowerCase() === 'confirmed' ||
                        booking.status?.toLowerCase() === 'paid'
                    ) {
                        paymentMethod = 'stripe'; // Legacy bookings trước khi có field paymentMethod
                    }

                    return {
                        id: booking._id,
                        userId: booking.userId,
                        userName: booking.contactDetails?.fullName || 'N/A',
                        userEmail: booking.contactDetails?.email || 'N/A',
                        userPhone: booking.contactDetails?.phone || 'N/A',
                        hotelId: booking.hotelId,
                        hotelName: booking.bookingSnapshot?.hotel?.name || 'Unknown Hotel',
                        hotelImage: booking.bookingSnapshot?.hotel?.image || '',
                        hotelAddress: booking.bookingSnapshot?.hotel?.address || '',
                        checkIn: booking.checkIn,
                        checkOut: booking.checkOut,
                        nights: booking.nights,
                        totalPrice: booking.totalPrice,
                        status: booking.status.toLowerCase(),
                        paymentMethod: paymentMethod,
                        createdAt: booking.createdAt,
                    };
                });

                setBookings(transformedBookings);
            } catch (error) {
                console.error('Error fetching bookings:', error);
                setBookings([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBookings();
    }, [getToken]);

    // Debounce search
    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                setSearchText(value.toLowerCase().trim());
            }, 300),
        [],
    );

    const handleSearchChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            debouncedSearch(event.target.value);
        },
        [debouncedSearch],
    );

    // Filter data
    const filteredData = useMemo(() => {
        if (!searchText) {
            return bookings;
        }

        return filter(bookings, (item) => {
            return (
                item.userName.toLowerCase().includes(searchText) ||
                item.userEmail.toLowerCase().includes(searchText) ||
                item.hotelName.toLowerCase().includes(searchText)
            );
        });
    }, [bookings, searchText]);

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <span className="ml-2">Loading bookings...</span>
            </div>
        );
    }

    return (
        <div className="">
            <div className="bg-secondary mb-4 flex items-center justify-between rounded-md px-1 py-1">
                <h1 className="px-2 font-semibold">All Transactions</h1>
                <div className="relative w-1/3">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        placeholder="Search user, email, or hotel..."
                        onChange={handleSearchChange}
                        className="w-full rounded-md border p-2 pl-10 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <DataTable columns={columns} data={filteredData} />
        </div>
    );
}
