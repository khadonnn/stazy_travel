'use client';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
export type Payment = {
    id: string;
    amount: number;
    status: 'pending' | 'processing' | 'success' | 'failed';
    email: string;
    fullName: string;
    userId: string;
    avatarUrl?: string;
};
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
// Thêm vào phần imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
export const columns: ColumnDef<Payment>[] = [
    {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'fullName',
        header: 'User',
        // THAY ĐỔI: Sử dụng 'cell' để render tùy chỉnh
        cell: ({ row }) => {
            const payment = row.original; // Lấy toàn bộ dữ liệu hàng
            const initial = payment.fullName.charAt(0).toUpperCase(); // Lấy chữ cái đầu

            return (
                <div className="flex items-center space-x-2">
                    {/* 1. Component Avatar */}
                    <Avatar className="h-8 w-8">
                        {/* Giả định: Sử dụng avatarUrl nếu có */}
                        <AvatarImage src={payment.avatarUrl} alt={payment.fullName} />
                        {/* Fallback là chữ cái đầu nếu không có ảnh */}
                        <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>

                    {/* 2. Tên người dùng */}
                    <span>{payment.fullName}</span>
                </div>
            );
        },
    },
    {
        accessorKey: 'email',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Email
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status');

            return (
                <div
                    className={cn(
                        `w-max rounded-md p-1 text-xs`,
                        status === 'pending' && 'bg-yellow-500/40',
                        status === 'success' && 'bg-green-500/40',
                        status === 'failed' && 'bg-red-500/40',
                    )}
                >
                    {status as string}
                </div>
            );
        },
    },
    {
        accessorKey: 'amount',
        // Cập nhật để căn phải nội dung của nút sắp xếp
        header: ({ column }) => {
            return (
                // 💡 THAY ĐỔI: Thêm flex và justify-end vào div bọc
                <div className="flex justify-end text-right">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="hover:bg-transparents ml-2 flex justify-end p-0"
                    >
                        Amount
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            );
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('amount'));
            const formatted = new Intl.NumberFormat('vi-VN', {
                currency: 'VND',
            }).format(amount);

            return <div className="mr-12 text-right font-medium">{formatted + 'K Đ'}</div>;
        },
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const payment = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(payment.id)}>
                            Copy payment ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Link href={`/users/${payment.userId}`}>View user profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>View payment details</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
