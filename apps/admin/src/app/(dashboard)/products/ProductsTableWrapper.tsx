'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // Import hook của Next.js
import { columns } from './columns';
import { DataTable } from './data-table';
import { ProductType } from '@repo/types';

interface ProductsTableWrapperProps {
    initialData: ProductType[];
    pageCount: number; // Tổng số trang
    totalItems: number; // Tổng số dòng
    pageIndex: number; // Trang hiện tại (bắt đầu từ 0)
    pageSize: number; // Số dòng mỗi trang
}

export function ProductsTableWrapper({
    initialData,
    pageCount,
    totalItems,
    pageIndex,
    pageSize,
}: ProductsTableWrapperProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Hàm cập nhật URL khi chuyển trang
    const createQueryString = useCallback(
        (params: Record<string, string | number | null>) => {
            const newSearchParams = new URLSearchParams(searchParams?.toString());

            for (const [key, value] of Object.entries(params)) {
                if (value === null) {
                    newSearchParams.delete(key);
                } else {
                    newSearchParams.set(key, String(value));
                }
            }

            return newSearchParams.toString();
        },
        [searchParams],
    );

    // Hàm được gọi khi Table thay đổi phân trang
    const onPaginationChange = (newPageIndex: number, newPageSize: number) => {
        // Cập nhật URL -> Server sẽ nhận được và fetch lại data
        // Lưu ý: newPageIndex của Table bắt đầu từ 0, nên lên URL phải +1
        router.push(
            `${pathname}?${createQueryString({
                page: newPageIndex + 1,
                limit: newPageSize,
            })}`,
        );
    };

    return (
        <div>
            {/* ... Phần Search giữ nguyên ... */}

            <DataTable
                columns={columns}
                data={initialData}
                // Truyền props phân trang Server-side vào DataTable
                pageCount={pageCount}
                rowCount={totalItems}
                pagination={{ pageIndex, pageSize }}
                onPaginationChange={onPaginationChange}
            />
        </div>
    );
}
