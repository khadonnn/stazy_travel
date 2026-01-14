'use client';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useNotificationStore } from '@/store/useNotificationStore';
import { toast } from 'sonner'; // Hoặc thư viện bạn đang dùng
import { useRouter } from 'next/navigation';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3005';

export const useAdminSocket = () => {
    const { addNotification } = useNotificationStore();
    const router = useRouter(); // Dùng để điều hướng

    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('🟢 Connected to Socket Service (Admin)');
            socket.emit('join-admin-room');
        });

        socket.on('admin-new-booking', (data) => {
            // 1. Lưu vào Store (để hiện trong danh sách thông báo)
            addNotification({
                id: Date.now().toString(),
                title: data.title,
                message: data.message,
                isRead: false,
                createdAt: new Date(),
                link: `/admin/bookings/${data.bookingId}`, // ✅ Lưu link vào store luôn
            });

            // 2. Hiện Popup (Toast) có nút bấm
            toast.success(data.title, {
                description: data.message,
                duration: 8000, // Hiện lâu một chút để kịp bấm
                action: {
                    label: 'Xem ngay',
                    onClick: () => router.push(`/admin/bookings/${data.bookingId}`),
                },
            });

            // Hoặc phát âm thanh thông báo nếu muốn
            // new Audio('/notification-sound.mp3').play().catch(() => {});
        });

        return () => {
            socket.disconnect();
        };
    }, [addNotification, router]);
};
