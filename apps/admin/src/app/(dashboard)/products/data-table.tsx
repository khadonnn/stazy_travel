'use client';

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
    PaginationState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from '@/components/TablePagination';
import React from 'react';
import { Trash2 } from 'lucide-react';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    // Thêm các props mới
    pageCount: number;
    rowCount: number;
    pagination: PaginationState;
    onPaginationChange: (pageIndex: number, pageSize: number) => void;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pageCount,
    rowCount,
    pagination,
    onPaginationChange,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [rowSelection, setRowSelection] = React.useState({});
    const table = useReactTable({
        data,
        columns,
        pageCount: pageCount, // Báo cho table biết tổng số trang thực tế
        rowCount: rowCount, // Báo cho table biết tổng số dòng thực tế
        state: {
            sorting,
            rowSelection,
            pagination, // State pagination được kiểm soát từ bên ngoài (URL)
        },
        manualPagination: true, // KÍCH HOẠT CHẾ ĐỘ SERVER-SIDE

        // Custom handler khi đổi trang
        onPaginationChange: (updater) => {
            // Logic xử lý update state của TanStack Table hơi đặc biệt (nó có thể là value hoặc function)
            let newPagination = pagination;
            if (typeof updater === 'function') {
                newPagination = updater(pagination);
            } else {
                newPagination = updater;
            }
            // Gọi callback để update URL bên Wrapper
            onPaginationChange(newPagination.pageIndex, newPagination.pageSize);
        },

        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onRowSelectionChange: setRowSelection,
    });
    // console.log(table);
    // console.log(rowSelection);
    return (
        <div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table} rowSelection={rowSelection} />
        </div>
    );
}
