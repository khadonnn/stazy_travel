'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, MoreHorizontal, Star, MapPin } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { HotelColumn } from '@repo/types';
// 1. Định nghĩa Type khớp với Prisma Model Hotel
// Lưu ý: Các field relation (category, author) cần được include khi query từ Prisma

export const columns: ColumnDef<HotelColumn>[] = [
    // --- SELECT BOX ---
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

    // --- IMAGE & TITLE (Gộp chung để tiết kiệm diện tích) ---
    {
        accessorKey: 'title',
        header: 'Hotel Name',
        cell: ({ row }) => {
            const hotel = row.original;
            return (
                <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 min-w-[3rem] overflow-hidden rounded-md border border-gray-200">
                        <Image
                            src={hotel.featuredImage || '/placeholder-hotel.jpg'}
                            alt={hotel.title}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="max-w-[200px] truncate font-medium" title={hotel.title}>
                            {hotel.title}
                        </span>
                        {hotel.isAds && (
                            <span className="w-fit rounded bg-yellow-100 px-1 text-[10px] text-yellow-800">ADS</span>
                        )}
                    </div>
                </div>
            );
        },
    },

    // --- CATEGORY ---
    {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => {
            return (
                <Badge variant="outline" className="font-normal">
                    {row.original.category?.name || 'Uncategorized'}
                </Badge>
            );
        },
    },

    // --- PRICE (Format VND) ---
    {
        accessorKey: 'price',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Price / Night
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const price = parseFloat(row.getValue('price'));
            const formatted = new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
            }).format(price);

            return <div className="pr-4 text-right font-medium">{formatted}</div>;
        },
    },

    // --- RATING & REVIEWS ---
    {
        accessorKey: 'reviewStart',
        header: 'Rating',
        cell: ({ row }) => {
            const rating = parseFloat(row.getValue('reviewStart')) || 0;
            const count = row.original.reviewCount;

            return (
                <div className="flex items-center gap-1 text-slate-600">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{rating.toFixed(1)}</span>
                    <span className="text-muted-foreground text-xs">({count})</span>
                </div>
            );
        },
    },

    // --- ADDRESS (Rút gọn) ---
    {
        accessorKey: 'address',
        header: 'Location',
        cell: ({ row }) => {
            return (
                <div className="text-muted-foreground flex max-w-[150px] items-center">
                    <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="truncate text-xs" title={row.original.address}>
                        {row.original.address}
                    </span>
                </div>
            );
        },
    },

    // --- ACTIONS ---
    {
        id: 'actions',
        cell: ({ row }) => {
            const hotel = row.original;

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
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(hotel.id.toString())}>
                            Copy Hotel ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            {/* Link tới trang Admin Edit */}
                            <Link href={`/admin/hotels/${hotel.id}/edit`}>Edit Hotel</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            {/* Link tới trang Public xem thử */}
                            <Link href={`/hotels/${hotel.slug}`} target="_blank">
                                View on Site
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600">Delete Hotel</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
