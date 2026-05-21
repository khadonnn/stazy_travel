'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // Import hook của Next.js
import { columns } from './columns';
import { DataTable } from './data-table';
import { ProductType } from '@repo/types';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/export';
import { useExportStore } from '@/store/useExportStore';

interface ProductsTableWrapperProps {
    initialData: ProductType[];
    showDeleted: boolean;
    pageCount: number; // Tổng số trang
    totalItems: number; // Tổng số dòng
    pageIndex: number; // Trang hiện tại (bắt đầu từ 0)
    pageSize: number; // Số dòng mỗi trang
}

export function ProductsTableWrapper({
    initialData,
    showDeleted,
    pageCount,
    totalItems,
    pageIndex,
    pageSize,
}: ProductsTableWrapperProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const registerExportAction = useExportStore((state) => state.registerExportAction);

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

    useEffect(() => {
        const exportAction = async () => {
            exportToExcel(initialData, 'stazy_hotels', 'Khách sạn', {
                id: 'ID',
                title: 'Tên KS',
                slug: 'Slug',
                status: 'Trạng thái',
                destination: 'Điểm đến',
                price: 'Giá',
                reviewStar: 'Đánh giá',
                createdAt: 'Ngày tạo',
                deletedAt: 'Ngày xóa',
            });
        };

        registerExportAction(exportAction, 'Xuất Excel');

        return () => registerExportAction(null);
    }, [initialData, registerExportAction]);

    return (
        <div>
            <div className="bg-secondary mb-4 flex items-center justify-between rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                    <h1 className="font-semibold">All Hotels</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            router.push(
                                `${pathname}?${createQueryString({
                                    page: 1,
                                    showDeleted: showDeleted ? null : 'true',
                                })}`,
                            );
                        }}
                    >
                        {showDeleted ? 'Hide deleted' : 'Show deleted'}
                    </Button>
                </div>
                {showDeleted && <span className="text-muted-foreground text-xs">Showing deleted hotels</span>}
            </div>

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
