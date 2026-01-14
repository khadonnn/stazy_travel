import { create } from 'zustand';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    link?: string; // ✅ Thêm trường này để biết click vào đi đâu
}

interface NotificationState {
    notifications: NotificationItem[];
    addNotification: (item: NotificationItem) => void;
    markAsRead: (id: string) => void;
    resetCount: () => void;
    unreadCount: number;
    increment: () => void;
    setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    unreadCount: 0,
    notifications: [],
    increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
    setUnreadCount: (count) => set({ unreadCount: count }),
    addNotification: (item) =>
        set((state) => ({
            notifications: [item, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        })),

    markAsRead: (id) =>
        set((state) => ({
            notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
            // Logic giảm count tùy bạn xử lý
            unreadCount: state.unreadCount, // Thường thì click vào xem mới giảm count tổng
        })),

    resetCount: () => set({ unreadCount: 0 }),
}));
