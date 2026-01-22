'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Building2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

// Mock data - sẽ thay bằng API thực
const mockPendingItems = [
    {
        id: 1,
        type: 'hotel',
        title: 'Luxury Resort Nha Trang',
        owner: 'Nguyễn Văn A',
        status: 'PENDING',
        createdAt: '2026-01-21T10:30:00Z',
        priority: 'high',
    },
    {
        id: 2,
        type: 'hotel',
        title: 'Cozy Homestay Đà Lạt',
        owner: 'Trần Thị B',
        status: 'NEEDS_REVISION',
        createdAt: '2026-01-20T15:20:00Z',
        priority: 'medium',
    },
    {
        id: 3,
        type: 'booking',
        title: 'Yêu cầu hoàn tiền #12345',
        owner: 'Lê Văn C',
        status: 'PENDING',
        createdAt: '2026-01-22T08:00:00Z',
        priority: 'high',
    },
    {
        id: 4,
        type: 'hotel',
        title: 'Grand Hotel Hà Nội',
        owner: 'Phạm Thu D',
        status: 'PENDING',
        createdAt: '2026-01-19T14:10:00Z',
        priority: 'low',
    },
];

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'PENDING':
            return {
                label: 'Chờ duyệt',
                variant: 'default' as const,
                icon: Clock,
                color: 'text-blue-600',
            };
        case 'NEEDS_REVISION':
            return {
                label: 'Cần sửa',
                variant: 'destructive' as const,
                icon: AlertCircle,
                color: 'text-orange-600',
            };
        case 'APPROVED':
            return {
                label: 'Đã duyệt',
                variant: 'secondary' as const,
                icon: CheckCircle,
                color: 'text-green-600',
            };
        default:
            return {
                label: status,
                variant: 'secondary' as const,
                icon: Clock,
                color: 'text-gray-600',
            };
    }
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'high':
            return 'border-l-4 border-l-red-500';
        case 'medium':
            return 'border-l-4 border-l-yellow-500';
        case 'low':
            return 'border-l-4 border-l-green-500';
        default:
            return 'border-l-4 border-l-gray-300';
    }
};

const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
};

const PendingApprovals = () => {
    // Fetch real data - mock for now
    const { data: pendingItems = mockPendingItems, isLoading } = useQuery({
        queryKey: ['pending-approvals'],
        queryFn: async () => {
            // TODO: Call real API
            // const res = await fetch('/api/admin/pending-approvals');
            // return res.json();
            return mockPendingItems;
        },
        refetchInterval: 30000, // Auto-refresh every 30s
    });

    const pendingCount = pendingItems.filter((item) => item.status === 'PENDING').length;
    const needsRevisionCount = pendingItems.filter((item) => item.status === 'NEEDS_REVISION').length;

    return (
        <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-lg font-semibold">Cần xử lý</h1>
                <div className="flex gap-2">
                    <Badge variant="default" className="bg-blue-600">
                        {pendingCount} chờ duyệt
                    </Badge>
                    {needsRevisionCount > 0 && <Badge variant="destructive">{needsRevisionCount} cần sửa</Badge>}
                </div>
            </div>

            <ScrollArea className="h-[420px] w-full pr-4">
                <div className="flex flex-col gap-2">
                    {isLoading ? (
                        <div className="text-muted-foreground py-8 text-center text-sm">Đang tải...</div>
                    ) : pendingItems.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center text-sm">Không có mục nào cần xử lý</div>
                    ) : (
                        pendingItems.map((item) => {
                            const statusConfig = getStatusConfig(item.status);
                            const StatusIcon = statusConfig.icon;

                            return (
                                <Link
                                    key={item.id}
                                    href={item.type === 'hotel' ? `/hotels/${item.id}` : `/bookings/${item.id}`}
                                >
                                    <Card
                                        className={`hover:bg-accent/50 cursor-pointer p-3 transition-colors ${getPriorityColor(item.priority)}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 flex-1 items-start gap-2">
                                                {item.type === 'hotel' ? (
                                                    <Building2 className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                                ) : (
                                                    <StatusIcon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium" title={item.title}>
                                                        {item.title}
                                                    </p>
                                                    <p className="text-muted-foreground truncate text-xs">
                                                        {item.owner}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 text-[10px]">
                                                        {getTimeAgo(item.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={statusConfig.variant} className="shrink-0 text-[9px]">
                                                {statusConfig.label}
                                            </Badge>
                                        </div>
                                    </Card>
                                </Link>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default PendingApprovals;
