// components/NotificationDropdown.tsx
import Link from 'next/link';
import { useNotificationStore } from '@/store/useNotificationStore';

export default function NotificationDropdown() {
    const { notifications, markAsRead } = useNotificationStore();

    return (
        <div className="max-h-96 w-80 overflow-y-auto rounded-lg bg-white shadow-lg">
            {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Không có thông báo nào</div>
            ) : (
                notifications.map((notif) => (
                    <Link
                        key={notif.id}
                        href={notif.link || '#'} // ✅ Link tới trang chi tiết
                        onClick={() => markAsRead(notif.id)}
                        className={`block border-b p-4 transition hover:bg-gray-50 ${
                            notif.isRead ? 'opacity-60' : 'bg-blue-50'
                        }`}
                    >
                        <h4 className="text-sm font-semibold text-gray-900">{notif.title}</h4>
                        <p className="mt-1 text-sm text-gray-600">{notif.message}</p>
                        <span className="mt-2 block text-xs text-gray-400">
                            {new Date(notif.createdAt).toLocaleTimeString()}
                        </span>
                    </Link>
                ))
            )}
        </div>
    );
}
