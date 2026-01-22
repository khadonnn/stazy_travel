'use client';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, MoreHorizontal, Shield } from 'lucide-react';
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
                        role === 'HOST' &&
                            'bg-purple-500/40 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400',
                        role === 'AUTHOR' &&
                            'bg-purple-500/40 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400',
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
            const { getToken } = useAuth();
            const queryClient = useQueryClient();
            const [isUpdating, setIsUpdating] = useState(false);

            const handleRoleChange = async (newRole: string) => {
                if (isUpdating) return;

                setIsUpdating(true);
                try {
                    const token = await getToken();
                    const apiUrl = `${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/users/${user.id}/role`;

                    console.log('🔍 Calling API:', apiUrl);
                    console.log('📦 Payload:', { role: newRole });

                    const response = await fetch(apiUrl, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ role: newRole }),
                    });

                    console.log('📡 Response status:', response.status);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('❌ Error response:', errorData);
                        throw new Error(errorData.message || 'Failed to update role');
                    }

                    const result = await response.json();
                    console.log('✅ Success:', result);

                    // Show success toast
                    toast.success(`Đã đổi role thành ${newRole}`, {
                        description: `User ${user.name} giờ là ${newRole}`,
                        duration: 3000,
                    });

                    // Invalidate query to refresh data
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                } catch (error) {
                    console.error('❌ Error updating role:', error);
                    toast.error('Lỗi khi đổi role', {
                        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
                        duration: 4000,
                    });
                } finally {
                    setIsUpdating(false);
                }
            };

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isUpdating}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                            Copy User ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Shield className="mr-2 h-4 w-4" />
                                Change Role
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem
                                    onClick={() => handleRoleChange('USER')}
                                    disabled={user.role === 'USER' || isUpdating}
                                >
                                    USER
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleRoleChange('AUTHOR')}
                                    disabled={user.role === 'AUTHOR' || isUpdating}
                                >
                                    AUTHOR
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleRoleChange('ADMIN')}
                                    disabled={user.role === 'ADMIN' || isUpdating}
                                    className="text-red-600"
                                >
                                    ADMIN
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Link href={`/users/${user.id}`}>View user profile</Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
