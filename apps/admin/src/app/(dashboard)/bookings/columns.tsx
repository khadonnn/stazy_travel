'use client';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';

// Type cho Booking data từ API
export type Booking = {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    hotelId: number;
    hotelName: string;
    hotelImage: string;
    hotelAddress: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'; // ✅ Match BookingStatus enum
    paymentMethod: 'stripe' | 'paypal' | 'vnpay' | 'bank_transfer' | 'cash_on_checkin' | 'pending'; // ✅ Match PaymentMethod enum (lowercase)
    createdAt: string;
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const columns: ColumnDef<Booking>[] = [
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
    // COLUMN 1: USER
    {
        accessorKey: 'userName',
        header: 'User',
        cell: ({ row }) => {
            const booking = row.original;
            const initial = booking.userName.charAt(0).toUpperCase();

            return (
                <div className="flex items-center space-x-3">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary">{initial}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium">{booking.userName}</span>
                        <span className="text-muted-foreground text-xs">{booking.userEmail}</span>
                    </div>
                </div>
            );
        },
    },
    // COLUMN 2: PRODUCT (HOTEL)
    {
        accessorKey: 'hotelName',
        header: 'Product',
        cell: ({ row }) => {
            const booking = row.original;

            return (
                <div className="flex items-center space-x-3">
                    {booking.hotelImage && (
                        <div className="relative h-10 w-14 overflow-hidden rounded">
                            <Image src={booking.hotelImage} alt={booking.hotelName} fill className="object-cover" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="font-medium">{booking.hotelName}</span>
                        <span className="text-muted-foreground text-xs">
                            {booking.nights} nights • {new Date(booking.checkIn).toLocaleDateString('vi-VN')}
                        </span>
                    </div>
                </div>
            );
        },
    },
    // COLUMN 3: PRICE
    {
        accessorKey: 'totalPrice',
        header: ({ column }) => {
            return (
                <div className="flex justify-end text-right">
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="ml-2 flex justify-end p-0 hover:bg-transparent"
                    >
                        Price
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            );
        },
        cell: ({ row }) => {
            const price = parseFloat(row.getValue('totalPrice'));
            const formatted = new Intl.NumberFormat('vi-VN', {
                currency: 'VND',
            }).format(price);

            return <div className="mr-4 text-right font-semibold">{formatted} đ</div>;
        },
    },
    // COLUMN 4: STATUS
    {
        accessorKey: 'status',
        header: () => <div className="text-center">Status</div>,
        cell: ({ row }) => {
            const status = row.getValue('status') as string;

            return (
                <div className="flex justify-center">
                    <div
                        className={cn(
                            'w-max rounded-full px-3 py-1 text-xs font-medium',
                            status === 'pending' && 'bg-yellow-500/20 text-yellow-700',
                            status === 'confirmed' && 'bg-blue-500/20 text-blue-700',
                            status === 'completed' && 'bg-green-500/20 text-green-700',
                            status === 'cancelled' && 'bg-red-500/20 text-red-700',
                        )}
                    >
                        {status.toUpperCase()}
                    </div>
                </div>
            );
        },
    },
    // COLUMN 5: PAYMENT METHOD
    {
        accessorKey: 'paymentMethod',
        header: () => <div className="text-center">Payment Method</div>,
        cell: ({ row }) => {
            const method = row.getValue('paymentMethod') as string;

            const methodColors = {
                stripe: 'bg-purple-100 text-purple-700',
                paypal: 'bg-blue-100 text-blue-700',
                vnpay: 'bg-orange-100 text-orange-700',
                bank_transfer: 'bg-green-100 text-green-700',
                cash_on_checkin: 'bg-gray-100 text-gray-700',
                pending: 'bg-yellow-100 text-yellow-700',
            };

            return (
                <div className="flex justify-center">
                    <span
                        className={cn(
                            'rounded-full px-3 py-1 text-xs font-medium',
                            methodColors[method as keyof typeof methodColors] || 'bg-gray-100 text-gray-700',
                        )}
                    >
                        {method.replace(/_/g, ' ').toUpperCase()}
                    </span>
                </div>
            );
        },
    },
    // COLUMN 6: ACTIONS
    {
        id: 'actions',
        cell: ({ row }) => {
            const booking = row.original;

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
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(booking.id)}>
                            Copy booking ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Link href={`/bookings/${booking.id}`}> View booking details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Link href={`/products/${booking.hotelId}`}> View hotel details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Link href={`/users/${booking.userId}`}> View customer profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-blue-600"> Mark as Completed</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600"> Cancel booking</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
