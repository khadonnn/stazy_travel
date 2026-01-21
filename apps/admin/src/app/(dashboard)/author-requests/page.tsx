'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Building2, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { IAuthorRequest } from '@repo/types';
import { getAllAuthorRequests, approveAuthorRequest, rejectAuthorRequest } from '@/actions/authorAdminActions';
import { toast } from 'sonner';
import { useNotificationStore } from '@/store/useNotificationStore';

export default function AuthorRequestsPage() {
    const [requests, setRequests] = useState<IAuthorRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<IAuthorRequest | null>(null);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const { setPendingAuthorRequests } = useNotificationStore();

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        const data = await getAllAuthorRequests();
        setRequests(data);

        // Cập nhật badge count cho pending requests
        const pendingCount = data.filter((r: IAuthorRequest) => r.status === 'PENDING').length;
        setPendingAuthorRequests(pendingCount);

        setLoading(false);
    };

    const handleApprove = async (requestId: string) => {
        if (!confirm('Bạn có chắc muốn duyệt yêu cầu này?')) return;

        setIsProcessing(true);
        const result = await approveAuthorRequest(requestId);

        if (result.success) {
            toast.success(result.message);
            loadRequests();
        } else {
            toast.error(result.message);
        }

        setIsProcessing(false);
    };

    const handleRejectSubmit = async () => {
        if (!selectedRequest || !rejectionReason.trim()) {
            toast.error('Vui lòng nhập lý do từ chối');
            return;
        }

        setIsProcessing(true);
        const result = await rejectAuthorRequest(selectedRequest.id, rejectionReason);

        if (result.success) {
            toast.success(result.message);
            setRejectDialogOpen(false);
            setRejectionReason('');
            setSelectedRequest(null);
            loadRequests();
        } else {
            toast.error(result.message);
        }

        setIsProcessing(false);
    };

    const openRejectDialog = (request: IAuthorRequest) => {
        setSelectedRequest(request);
        setRejectDialogOpen(true);
    };

    const getStatusBadge = (status: string) => {
        const config = {
            PENDING: {
                variant: 'default' as const,
                icon: <Clock className="h-3 w-3" />,
                label: 'Chờ duyệt',
                className: '',
            },
            APPROVED: {
                variant: 'default' as const,
                icon: <CheckCircle className="h-3 w-3" />,
                label: 'Đã duyệt',
                className: 'bg-green-500',
            },
            REJECTED: {
                variant: 'destructive' as const,
                icon: <XCircle className="h-3 w-3" />,
                label: 'Từ chối',
                className: '',
            },
        };

        const s = config[status as keyof typeof config];
        return (
            <Badge variant={s.variant} className={s.className || ''}>
                {s.icon}
                <span className="ml-1">{s.label}</span>
            </Badge>
        );
    };

    const filteredRequests = requests.filter((r) => {
        if (activeTab === 'all') return true;
        return r.status.toLowerCase() === activeTab;
    });

    if (loading) {
        return <div className="p-8">Đang tải...</div>;
    }

    return (
        <div className="space-y-6 p-8">
            <div>
                <h1 className="text-3xl font-bold">Quản lý yêu cầu Author</h1>
                <p className="text-muted-foreground">Duyệt hoặc từ chối các yêu cầu trở thành chủ khách sạn</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">Tất cả ({requests.length})</TabsTrigger>
                    <TabsTrigger value="pending">
                        Chờ duyệt ({requests.filter((r) => r.status === 'PENDING').length})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                        Đã duyệt ({requests.filter((r) => r.status === 'APPROVED').length})
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                        Từ chối ({requests.filter((r) => r.status === 'REJECTED').length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6 space-y-4">
                    {filteredRequests.length === 0 ? (
                        <Card>
                            <CardContent className="text-muted-foreground p-8 text-center">
                                Không có yêu cầu nào
                            </CardContent>
                        </Card>
                    ) : (
                        filteredRequests.map((request: any) => (
                            <Card key={request.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="flex items-center gap-2">
                                                <Building2 className="h-5 w-5" />
                                                {request.businessName}
                                            </CardTitle>
                                            <CardDescription>
                                                {request.businessType === 'COMPANY' ? 'Công ty' : 'Cá nhân'}
                                                {request.taxCode && ` • MST: ${request.taxCode}`}
                                            </CardDescription>
                                        </div>
                                        {getStatusBadge(request.status)}
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <User className="text-muted-foreground h-4 w-4" />
                                            <span>{request.user?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="text-muted-foreground h-4 w-4" />
                                            <span>{request.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="text-muted-foreground h-4 w-4" />
                                            <span>{request.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="text-muted-foreground h-4 w-4" />
                                            <span>{request.identityCard}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
                                        <span className="text-sm">{request.address}</span>
                                    </div>

                                    {request.reason && (
                                        <div className="bg-muted rounded-md p-3">
                                            <p className="text-muted-foreground mb-1 text-xs">Lý do:</p>
                                            <p className="text-sm">{request.reason}</p>
                                        </div>
                                    )}

                                    {request.status === 'REJECTED' && request.rejectionReason && (
                                        <div className="bg-destructive/10 border-destructive/20 rounded-md border p-3">
                                            <p className="text-muted-foreground mb-1 text-xs">Lý do từ chối:</p>
                                            <p className="text-destructive text-sm">{request.rejectionReason}</p>
                                        </div>
                                    )}

                                    {request.status === 'PENDING' && (
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                onClick={() => handleApprove(request.id)}
                                                disabled={isProcessing}
                                                className="flex-1"
                                            >
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Duyệt
                                            </Button>
                                            <Button
                                                onClick={() => openRejectDialog(request)}
                                                disabled={isProcessing}
                                                variant="destructive"
                                                className="flex-1"
                                            >
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Từ chối
                                            </Button>
                                        </div>
                                    )}

                                    <div className="text-muted-foreground text-xs">
                                        Gửi lúc: {new Date(request.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối yêu cầu</DialogTitle>
                        <DialogDescription>Vui lòng nhập lý do từ chối để gửi cho người dùng</DialogDescription>
                    </DialogHeader>

                    <Textarea
                        placeholder="VD: Thông tin không đầy đủ, giấy tờ không hợp lệ..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                    />

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectSubmit}
                            disabled={isProcessing || !rejectionReason.trim()}
                        >
                            {isProcessing ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
