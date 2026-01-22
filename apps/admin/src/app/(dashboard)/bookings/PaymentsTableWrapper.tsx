'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { debounce, filter } from 'lodash';
import { columns, Booking } from './columns';
import { DataTable } from '@/app/(dashboard)/bookings/data-table';
import { Search, Loader2 } from 'lucide-react';
import { getAllBookingsFromPostgres } from '@/app/(dashboard)/actions/get-all-bookings-postgres';

export function PaymentsTableWrapper() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    // 🔥 Fetch bookings từ PostgreSQL
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setIsLoading(true);
                const data = await getAllBookingsFromPostgres();
                setBookings(data);
            } catch (error: any) {
                console.error('❌ Error fetching bookings from PostgreSQL:', error);
                setBookings([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBookings();
    }, []);

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
