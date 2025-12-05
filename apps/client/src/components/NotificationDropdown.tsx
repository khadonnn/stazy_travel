'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import NotificationItem from './NotificationItem';
import { useAuthStore } from '@/store/useAuthStore';
import notificationApi, {
    type PaymentNotification,
} from '@/lib/api/notification';
import Link from 'next/link';

export default function NotificationDropdown({
    children,
}: {
    children: React.ReactNode;
}) {
    const { authUser } = useAuthStore();
    const [notifications, setNotifications] = useState<PaymentNotification[]>(
        [],
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!authUser) return;

        setLoading(true);
        setError(null);

        try {
            const response = await notificationApi.getPaymentNotifications();
            setNotifications(response.data);
            setUnreadCount(response.unread_count);
        } catch (err: unknown) {
            console.error('Failed to fetch notifications:', err);
            setError('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    }, [authUser]);

    // Fetch notifications when component mounts or user changes
    useEffect(() => {
        if (authUser) {
            fetchNotifications();
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [authUser, fetchNotifications]);

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await notificationApi.markAsRead(notificationId);
            // Update local state
            setNotifications((prev) =>
                prev.map((notification) =>
                    notification.id === notificationId
                        ? { ...notification, read: true }
                        : notification,
                ),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err: unknown) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    if (!authUser) {
        return (
            <Button variant='ghost' className='relative p-2'>
                {children}
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='relative p-2 mr-2'>
                    {children}
                    {unreadCount > 0 && (
                        <Link href='/my-bookings'>
                            <span className='absolute top-1 right-1 bg-red-500 text-white rounded-full text-xs px-1 min-w-[20px] h-5 flex items-center justify-center'>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        </Link>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-80 max-h-96 overflow-auto mt-2'>
                <div className='p-2 font-semibold border-b'>
                    Thông báo thanh toán
                    {loading && (
                        <span className='text-sm font-normal text-gray-500 ml-2'>
                            Đang tải...
                        </span>
                    )}
                </div>
                <div>
                    {error ? (
                        <div className='p-4 text-center text-red-500'>
                            {error}
                            <button
                                onClick={fetchNotifications}
                                className='block mx-auto mt-2 text-blue-500 hover:underline'
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : notifications.length === 0 && !loading ? (
                        <div className='p-4 text-center text-gray-500'>
                            Không có thông báo nào
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                {...notification}
                                onMarkAsRead={() =>
                                    handleMarkAsRead(notification.id)
                                }
                            />
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
