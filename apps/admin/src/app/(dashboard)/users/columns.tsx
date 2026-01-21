'use client';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';

export type User = {
    id: string;
    email: string;
    name: string;
    nickname?: string | null;
    phone?: string | null;
    gender?: string | null;
    dob?: Date | null;
    address?: string | null;
    avatar?: string | null;
    bgImage?: string | null;
    jobName?: string | null;
    desc?: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
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
            const user = row.original;
            return (
                <div className="relative h-9 w-9">
                    <Image
                        src={user.avatar || '/assets/default-avatar.png'}
                        alt={user.name}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-full object-cover"
                    />
                </div>
            );
        },
    },
    {
        accessorKey: 'name',
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
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
            const role = row.getValue('role');

            return (
                <div
                    className={cn(
                        `w-max rounded-md p-1 text-xs font-medium`,
                        role === 'ADMIN' && 'bg-red-500/40 text-red-700 dark:bg-red-500/30 dark:text-red-400',
                        role === 'HOST' && 'bg-purple-500/40 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400',
                        role === 'AUTHOR' && 'bg-purple-500/40 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400',
                        role === 'USER' && 'bg-green-500/40 text-green-700 dark:bg-green-500/30 dark:text-green-400',
                    )}
                >
                    {role as string}
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
