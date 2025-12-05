'use client';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
export type User = {
    id: string;
    avatar: string;
    fullName: string;
    email: string;
    status: 'active' | 'inactive';
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
import Image from 'next/image';
export const columns: ColumnDef<User>[] = [
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
        accessorKey: 'avatar',
        header: 'Avatar',
        cell: ({ row }) => {
            const user = row.original; // Lấy toàn bộ dữ liệu hàng
            return (
                <div className="relative h-9 w-9">
                    <Image
                        src={user.avatar}
                        alt={user.fullName}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-full object-cover"
                    />
                </div>
            );
        },
    },
    {
        accessorKey: 'fullName',
        header: 'User',
    },
    {
        accessorKey: 'email',
        header: ({ column }) => {
            return (
                <Button
                    className=""
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Email
                    <ArrowUpDown className="h-4 w-4" />
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
                        status === 'active' && 'bg-green-500/40',
                        status === 'inactive' && 'bg-red-500/40',
                    )}
                >
                    {status as string}
                </div>
            );
        },
    },

    {
        id: 'actions',
        cell: ({ row }) => {
            const user = row.original;

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
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                            Copy payment ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Link href={`/users/${user.id}`}>View user profile</Link>
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem>View payment details</DropdownMenuItem> */}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
