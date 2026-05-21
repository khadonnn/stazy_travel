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
    deletedAt?: Date | null;
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
import { ArrowUpDown, MoreHorizontal, Shield, Trash2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
// Thêm vào phần imports
import Image from 'next/image';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
            const user = row.original;

            return (
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            `w-max rounded-md p-1 text-xs font-medium`,
                            role === 'ADMIN' && 'bg-red-500/40 text-red-700 dark:bg-red-500/30 dark:text-red-400',
                            role === 'HOST' &&
                                'bg-purple-500/40 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400',
                            role === 'AUTHOR' &&
                                'bg-purple-500/40 text-purple-700 dark:bg-purple-500/30 dark:text-purple-400',
                            role === 'USER' &&
                                'bg-green-500/40 text-green-700 dark:bg-green-500/30 dark:text-green-400',
                        )}
                    >
                        {role as string}
                    </div>
                    {user.deletedAt && (
                        <span className="w-max rounded-md bg-gray-500/40 p-1 text-xs font-medium text-gray-700 dark:bg-gray-500/30 dark:text-gray-400">
                            ĐÃ XOÁ
                        </span>
                    )}
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
            const [showDeleteDialog, setShowDeleteDialog] = useState(false);
            const [isDeleting, setIsDeleting] = useState(false);

            const isDeleted = !!user.deletedAt;

            const handleRoleChange = async (newRole: string) => {
                if (isUpdating) return;

                setIsUpdating(true);
                try {
                    const token = await getToken();
                    const apiUrl = `${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/users/${user.id}/role`;

                    const response = await fetch(apiUrl, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ role: newRole }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || 'Failed to update role');
                    }

                    toast.success(`Đã đổi role thành ${newRole}`, {
                        description: `User ${user.name} giờ là ${newRole}`,
                        duration: 3000,
                    });

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

            const handleDeleteUser = async () => {
                setIsDeleting(true);
                try {
                    const response = await fetch(`/api/users/${user.id}`, {
                        method: 'DELETE',
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || 'Failed to delete user');
                    }

                    toast.success('Đã xoá người dùng', {
                        description: `${user.name} đã được đánh dấu xoá (soft delete)`,
                        duration: 3000,
                    });

                    queryClient.invalidateQueries({ queryKey: ['users'] });
                    setShowDeleteDialog(false);
                } catch (error) {
                    console.error('❌ Error deleting user:', error);
                    toast.error('Không thể xoá người dùng', {
                        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
                        duration: 4000,
                    });
                } finally {
                    setIsDeleting(false);
                }
            };

            const handleRestoreUser = async () => {
                setIsDeleting(true);
                try {
                    const response = await fetch(`/api/users/${user.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'restore' }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || 'Failed to restore user');
                    }

                    toast.success('Đã khôi phục người dùng', {
                        description: `${user.name} đã được khôi phục`,
                        duration: 3000,
                    });

                    queryClient.invalidateQueries({ queryKey: ['users'] });
                } catch (error) {
                    console.error('❌ Error restoring user:', error);
                    toast.error('Không thể khôi phục', {
                        description: error instanceof Error ? error.message : 'Vui lòng thử lại',
                        duration: 4000,
                    });
                } finally {
                    setIsDeleting(false);
                }
            };

            return (
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isUpdating || isDeleting}>
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

                            <DropdownMenuSeparator />
                            {isDeleted ? (
                                <DropdownMenuItem
                                    onClick={handleRestoreUser}
                                    className="text-green-600 focus:bg-green-50 focus:text-green-700"
                                    disabled={isDeleting}
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Khôi phục
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Xoá (Soft Delete)
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Xác nhận xoá người dùng?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Người dùng <strong>{user.name}</strong> ({user.email}) sẽ bị đánh dấu xoá (soft
                                    delete). Dữ liệu vẫn được giữ lại và có thể khôi phục sau.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Huỷ</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteUser}
                                    disabled={isDeleting}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {isDeleting ? 'Đang xoá...' : 'Xoá'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            );
        },
    },
];
