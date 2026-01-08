// components/AdminSocketListener.tsx
'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useNotificationStore } from '@/store/useNotificationStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3005';

export default function AdminSocketListener() {
    // Lấy hàm increaseCount từ store
    const { increaseCount } = useNotificationStore();

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket'] });

        socket.on('connect', () => {
            socket.emit('join-admin-room');
        });

        socket.on('admin-new-booking', (data: any) => {
            // 1. Hiện thông báo Toast (như cũ)
            toast.success(`Đơn mới: ${data.customerName} - $${data.totalPrice}`);

            // 2. 🔥 Tăng số lượng thông báo trên Sidebar
            increaseCount();
        });

        return () => {
            socket.disconnect();
        };
    }, [increaseCount]);

    return null;
}
