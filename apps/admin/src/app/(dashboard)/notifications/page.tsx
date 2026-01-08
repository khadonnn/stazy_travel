'use client';
import { useEffect } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';

export default function NotificationsPage() {
    const { resetCount } = useNotificationStore();

    useEffect(() => {
        // Khi vào trang này thì reset số đếm về 0
        resetCount();
    }, [resetCount]);

    return (
        <div>
            <h1>Danh sách thông báo</h1>
            {/* List thông báo */}
        </div>
    );
}
