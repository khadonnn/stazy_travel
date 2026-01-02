'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { debounce, filter } from 'lodash'; // Import các hàm cần thiết từ lodash
import { columns, Product } from './columns'; // Import columns và type Payment
import { DataTable } from '@/app/(dashboard)/payments/data-table';
import { Search } from 'lucide-react';
// Giả định bạn có component Input của riêng mình (ví dụ từ shadcn/ui)
// import { Input } from '@/components/ui/input';

interface ProductsTableWrapperProps {
    initialData: Product[];
}

export function ProductsTableWrapper({ initialData }: ProductsTableWrapperProps) {
    const [searchText, setSearchText] = useState('');

    // --- 1. Debounce cho chức năng tìm kiếm ---
    // Sử dụng useMemo để đảm bảo debounce function chỉ tạo một lần
    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                setSearchText(value.toLowerCase().trim());
            }, 300), // Delay 300ms
        [],
    );

    const handleSearchChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            debouncedSearch(event.target.value);
        },
        [debouncedSearch],
    );

    // --- 2. Logic lọc dữ liệu với Lodash ---
    const filteredData = useMemo(() => {
        if (!searchText) {
            return initialData;
        }

        const searchLower = searchText;

        // Kiểm tra fullName hoặc email có chứa chuỗi tìm kiếm không
        return filter(initialData, (item) => {
            return (
                item.name.toLowerCase().includes(searchLower) ||
                item.shortDescription.toLowerCase().includes(searchLower)
            );
        });
    }, [initialData, searchText]);

    return (
        <div className="">
            <div className="bg-secondary mb-4 flex items-center justify-between rounded-md px-1 py-1">
                <h1 className="px-2 font-semibold">All Payments</h1>
                {/*  Ô TÌM KIẾM */}
                <div className="relative w-1/3">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        placeholder="Search name or email..."
                        onChange={handleSearchChange}
                        // Thêm padding-left (pl-10) để icon không bị che
                        className="w-full rounded-md border p-2 pl-10 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <DataTable columns={columns} data={filteredData} />
        </div>
    );
}
