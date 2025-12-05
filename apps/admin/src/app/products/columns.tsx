'use client';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
export type Product = {
    id: string | number;
    price: number;
    name: string;
    shortDescription: string;
    description: string;
    sizes: string[];
    colors: string[];
    images: Record<string, string>;
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
import Image from 'next/image';
export const columns: ColumnDef<Product>[] = [
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
        accessorKey: 'image',
        header: 'Image',
        cell: ({ row }) => {
            const product = row.original;
            const colorKey = product.colors && product.colors.length > 0 ? product.colors[0] : undefined;

            const imageUrl = colorKey && product.images?.[colorKey] ? product.images[colorKey] : '/placeholder.png';
            return (
                <div className="relative h-9 w-9">
                    <Image
                        src={imageUrl}
                        alt={product.name || 'Product Image'}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-full object-cover"
                    />
                </div>
            );
        },
    },
    { accessorKey: 'name', header: ' Name' },
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
    },

    { accessorKey: 'shortDescription', header: 'Short Description' },
    {
        id: 'actions',
        cell: ({ row }) => {
            const product = row.original;

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
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id.toString())}>
                            Copy product ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Link href={`/products/${product.id}`}>View product profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>View product details</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
