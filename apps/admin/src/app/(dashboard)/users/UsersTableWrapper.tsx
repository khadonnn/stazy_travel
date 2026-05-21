'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';
import { columns, User } from './columns';
import { DataTable } from './data-table';
import { Search, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/export';
import { useExportStore } from '@/store/useExportStore';

const PRODUCT_API = process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL;

export function UsersTableWrapper() {
    const { getToken } = useAuth();
    const [searchText, setSearchText] = useState('');
    const [showDeleted, setShowDeleted] = useState(false);
    const registerExportAction = useExportStore((state) => state.registerExportAction);

    const { data: users = [], isLoading } = useQuery<User[]>({
        queryKey: ['users', showDeleted],
        queryFn: async () => {
            const token = await getToken();
            const response = await fetch(`${PRODUCT_API}/users?limit=100&page=1&showDeleted=${showDeleted}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const result = await response.json();
            console.log('Fetched users:', result.data?.length, 'Total:', result.pagination?.total);
            return result.data || [];
        },
        staleTime: 30000, // Cache for 30s
    });

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

    const filteredData = useMemo(() => {
        if (!searchText) {
            return users;
        }

        const searchLower = searchText;

        return users.filter((item) => {
            return (
                item.name.toLowerCase().includes(searchLower) ||
                item.email.toLowerCase().includes(searchLower) ||
                (item.nickname && item.nickname.toLowerCase().includes(searchLower))
            );
        });
    }, [users, searchText]);

    useEffect(() => {
        const exportAction = async () => {
            exportToExcel(filteredData, 'stazy_users', 'Người dùng', {
                id: 'ID',
                name: 'Tên',
                email: 'Email',
                role: 'Vai trò',
                createdAt: 'Ngày tạo',
                deletedAt: 'Ngày xóa',
            });
        };

        registerExportAction(exportAction, 'Xuất Excel');

        return () => registerExportAction(null);
    }, [filteredData, registerExportAction]);

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading users...</span>
            </div>
        );
    }

    return (
        <div className="">
            <div className="bg-secondary mb-4 flex items-center justify-between rounded-md px-1 py-1">
                <div className="flex items-center gap-2 px-2">
                    <h1 className="font-semibold">All Users</h1>
                    <Button variant="outline" size="sm" onClick={() => setShowDeleted((value) => !value)}>
                        {showDeleted ? 'Hide deleted' : 'Show deleted'}
                    </Button>
                </div>
                <div className="relative w-1/3">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        placeholder="Search name or email..."
                        onChange={handleSearchChange}
                        className="w-full rounded-md border p-2 pl-10 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <DataTable<User, any> columns={columns} data={filteredData} />
        </div>
    );
}
