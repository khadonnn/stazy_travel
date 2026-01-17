'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { MoreHorizontal, Edit, Trash, Copy, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { ProductType } from '@repo/types'; // Import type của bạn

interface CellActionProps {
    data: ProductType;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter();
    const { getToken } = useAuth();
    const [open, setOpen] = useState(false); // State mở popup xóa
    const [loading, setLoading] = useState(false);

    // 1. Hàm Xóa
    const onConfirm = async () => {
        try {
            setLoading(true);
            const token = await getToken();

            // Gọi API Delete
            const res = await fetch(`${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/hotels/${data.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error('Xóa thất bại');

            toast.success('Đã xóa khách sạn thành công');
            router.refresh(); // Refresh lại bảng dữ liệu
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra khi xóa.');
        } finally {
            setLoading(false);
            setOpen(false);
        }
    };

    // 2. Hàm Copy
    const onCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        toast.success('Đã copy ID vào clipboard');
    };

    return (
        <>
            {/* Popup xác nhận xóa */}
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này sẽ xóa vĩnh viễn khách sạn <b>{data.title}</b>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                onConfirm();
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tiếp tục
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dropdown Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>

                    <DropdownMenuItem onClick={() => onCopy(data.id.toString())}>
                        <Copy className="mr-2 h-4 w-4" /> Copy ID
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Chuyển hướng sang trang Edit */}
                    <DropdownMenuItem onClick={() => router.push(`/products/${data.id}`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </DropdownMenuItem>

                    {/* Mở popup xóa */}
                    <DropdownMenuItem onClick={() => setOpen(true)} className="text-red-600 focus:text-red-600">
                        <Trash className="mr-2 h-4 w-4" /> Delete Product
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
};
