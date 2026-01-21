'use client';

import { useEffect, useState } from 'react';
import { getPendingHotels, approveHotel, rejectHotel } from '@/actions/hotelAdminActions';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';

interface Hotel {
    id: number;
    title: string;
    slug: string;
    featuredImage: string;
    price: any;
    status: string;
    author: {
        id: string;
        name: string;
        email: string;
    };
    category: {
        name: string;
    };
    submittedAt: Date | null;
}

export default function HotelApprovalsPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const { setPendingHotelApprovals } = useNotificationStore();

    useEffect(() => {
        loadHotels();
    }, []);

    const loadHotels = async () => {
        setLoading(true);
        const data = await getPendingHotels();
        setHotels(data as any);
        setPendingHotelApprovals(data.length); // Cập nhật badge count
        setLoading(false);
    };

    const handleApprove = async (hotel: Hotel) => {
        if (!confirm(`Duyệt khách sạn "${hotel.title}"?`)) return;

        setProcessing(true);
        const result = await approveHotel(hotel.id);

        if (result.success) {
            toast.success(result.message);
            loadHotels();
        } else {
            toast.error(result.message);
        }
        setProcessing(false);
    };

    const openRejectDialog = (hotel: Hotel) => {
        setSelectedHotel(hotel);
        setRejectionReason('');
        setRejectDialogOpen(true);
    };

    const handleReject = async () => {
        if (!selectedHotel) return;
        if (!rejectionReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối');
            return;
        }

        setProcessing(true);
        const result = await rejectHotel(selectedHotel.id, rejectionReason);

        if (result.success) {
            toast.success(result.message);
            setRejectDialogOpen(false);
            loadHotels();
        } else {
            toast.error(result.message);
        }
        setProcessing(false);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Phê duyệt Khách sạn</h1>
                <p className="text-muted-foreground mt-2">
                    Danh sách các khách sạn đang chờ phê duyệt ({hotels.length})
                </p>
            </div>

            {hotels.length === 0 ? (
                <div className="bg-muted/50 rounded-lg py-12 text-center">
                    <p className="text-muted-foreground">Không có khách sạn nào đang chờ duyệt</p>
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ảnh</TableHead>
                                <TableHead>Tên khách sạn</TableHead>
                                <TableHead>Loại</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead>Giá</TableHead>
                                <TableHead>Ngày gửi</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {hotels.map((hotel) => (
                                <TableRow key={hotel.id}>
                                    <TableCell>
                                        <Image
                                            src={hotel.featuredImage}
                                            alt={hotel.title}
                                            width={80}
                                            height={60}
                                            className="rounded object-cover"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{hotel.title}</p>
                                            <p className="text-muted-foreground text-sm">{hotel.slug}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{hotel.category.name}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="text-sm font-medium">{hotel.author.name}</p>
                                            <p className="text-muted-foreground text-xs">{hotel.author.email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>${Number(hotel.price).toLocaleString()}</TableCell>
                                    <TableCell>
                                        {hotel.submittedAt
                                            ? new Date(hotel.submittedAt).toLocaleDateString('vi-VN')
                                            : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href={`/products/${hotel.id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => handleApprove(hotel)}
                                                disabled={processing}
                                            >
                                                <Check className="mr-1 h-4 w-4" />
                                                Duyệt
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => openRejectDialog(hotel)}
                                                disabled={processing}
                                            >
                                                <X className="mr-1 h-4 w-4" />
                                                Từ chối
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối khách sạn</DialogTitle>
                        <DialogDescription>
                            Vui lòng nhập lý do từ chối khách sạn &quot;{selectedHotel?.title}&quot;
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Lý do từ chối (ví dụ: Thông tin không đầy đủ, hình ảnh không rõ ràng...)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={processing}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleReject} disabled={processing}>
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                'Từ chối'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
