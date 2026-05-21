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
import { ArrowUpDown, MoreHorizontal, Star, Eye, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ProductType } from '@repo/types'; // Import type mới sửa
import { CellAction } from './CellAction';
// --- MAP CATEGORY ID SANG TÊN ---
// Trong thực tế, bạn nên fetch cái này từ 1 API categories riêng
export const CATEGORY_MAP: Record<number, string> = {
    1: 'Khách sạn', // 🏨
    2: 'Homestay', // 🏡
    3: 'Resort', // 🏖️
    4: 'Biệt thự', // 🏰
    5: 'Căn hộ', // 🏢
    6: 'Nhà gỗ', // 🏕️
    7: 'Khác', // 🌍
};

export const columns: ColumnDef<ProductType>[] = [
    // 1. SELECT BOX
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

    // 2. INFO (Image + Title + Ads Badge)
    {
        accessorKey: 'title',
        header: 'Product Info',
        cell: ({ row }) => {
            const item = row.original;
            return (
                <div className="flex items-center gap-3">
                    {/* Ảnh thumbnail */}
                    <div className="relative h-14 w-14 min-w-[3.5rem] overflow-hidden rounded-md border border-gray-100 bg-gray-50">
                        <Image
                            src={item.featuredImage}
                            alt={item.title}
                            fill
                            className="object-cover"
                            onError={(e) => {
                                // Fallback nếu ảnh lỗi (Optional)
                                e.currentTarget.src = '/placeholder.png';
                            }}
                        />
                    </div>

                    {/* Tên và Badge */}
                    <div className="flex flex-col gap-1">
                        <span className="max-w-[200px] truncate text-sm font-semibold" title={item.title}>
                            {item.title}
                        </span>
                        <div className="flex gap-2">
                            {/* Check Category ID để hiển thị tên */}
                            <Badge variant="secondary" className="h-5 px-1 py-0 text-[10px]">
                                {CATEGORY_MAP[item.categoryId ?? 7] || `Cat-${item.categoryId}`}
                            </Badge>
                            {item.deletedAt && (
                                <Badge variant="destructive" className="h-5 px-1 py-0 text-[10px]">
                                    DELETED
                                </Badge>
                            )}
                            {item.isAds && (
                                <Badge className="h-5 bg-yellow-500 px-1 py-0 text-[10px] hover:bg-yellow-600">
                                    ADS
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            );
        },
    },

    // 3. PRICE (Hiển thị giá gốc và giá giảm nếu có)
    {
        accessorKey: 'price',
        header: ({ column }) => {
            return (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                    Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const price = row.original.price;
            const saleOff = row.original.saleOff;

            const formatCurrency = (val: number) =>
                new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

            return (
                <div className="items-star flex flex-col pr-4">
                    <span className="text-sm font-medium">{formatCurrency(price)}</span>
                    {/* Nếu có giảm giá thì hiển thị thêm */}
                    {saleOff && (
                        <span className="text-xs text-green-600 line-through opacity-70">
                            -{row.original.saleOffPercent}%
                        </span>
                    )}
                </div>
            );
        },
    },

    // 4. METRICS (View, Comment, Rating - Gộp chung để tiết kiệm chỗ)
    {
        id: 'metrics',
        header: 'Performance',
        cell: ({ row }) => {
            const { viewCount, commentCount, reviewStar, reviewCount } = row.original;

            return (
                <div className="flex flex-col gap-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="font-semibold text-gray-700">{reviewStar}</span>
                        <span>({reviewCount})</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1" title="Views">
                            <Eye className="h-3 w-3" /> {viewCount}
                        </span>
                        <span className="flex items-center gap-1" title="Comments">
                            <MessageSquare className="h-3 w-3" /> {commentCount}
                        </span>
                    </div>
                </div>
            );
        },
    },

    // 5. CAPACITY (Phòng ngủ/Khách)
    {
        accessorKey: 'maxGuests', // Dùng accessor để sort được nếu cần
        header: 'Capacity',
        cell: ({ row }) => (
            <div className="text-xs text-gray-600">
                <div>Guests: {row.original.maxGuests}</div>
                <div>Beds: {row.original.bedrooms}</div>
            </div>
        ),
    },

    // 6. ACTIONS
    {
        id: 'actions',
        cell: ({ row }) => <CellAction data={row.original} />,
    },
];
