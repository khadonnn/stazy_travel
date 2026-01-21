import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    link?: string;
}

interface NotificationState {
    // Notifications
    notifications: NotificationItem[];
    addNotification: (item: NotificationItem) => void;
    markAsRead: (id: string) => void;
    resetCount: () => void;

    // Inbox (Messages)
    unreadCount: number;
    setUnreadCount: (count: number) => void;
    increment: () => void;
    decrement: () => void;
    reset: () => void;

    // Author Requests
    pendingAuthorRequests: number;
    setPendingAuthorRequests: (count: number) => void;
    incrementAuthorRequests: () => void;
    decrementAuthorRequests: () => void;

    // Hotel Approvals
    pendingHotelApprovals: number;
    setPendingHotelApprovals: (count: number) => void;
    incrementHotelApprovals: () => void;
    decrementHotelApprovals: () => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            // Notifications
            notifications: [],
            addNotification: (item) =>
                set((state) => ({
                    notifications: [item, ...state.notifications],
                })),
            markAsRead: (id) =>
                set((state) => ({
                    notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
                })),
            resetCount: () => set({ unreadCount: 0 }),

            // Inbox
            unreadCount: 0,
            setUnreadCount: (count) => set({ unreadCount: count }),
            increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
            decrement: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
            reset: () => set({ unreadCount: 0 }),

            // Author Requests
            pendingAuthorRequests: 0,
            setPendingAuthorRequests: (count) => set({ pendingAuthorRequests: count }),
            incrementAuthorRequests: () => set((state) => ({ pendingAuthorRequests: state.pendingAuthorRequests + 1 })),
            decrementAuthorRequests: () =>
                set((state) => ({ pendingAuthorRequests: Math.max(0, state.pendingAuthorRequests - 1) })),

            // Hotel Approvals
            pendingHotelApprovals: 0,
            setPendingHotelApprovals: (count) => set({ pendingHotelApprovals: count }),
            incrementHotelApprovals: () => set((state) => ({ pendingHotelApprovals: state.pendingHotelApprovals + 1 })),
            decrementHotelApprovals: () =>
                set((state) => ({ pendingHotelApprovals: Math.max(0, state.pendingHotelApprovals - 1) })),
        }),
        {
            name: 'notification-storage', // Tên key trong localStorage
            storage: createJSONStorage(() => localStorage),
            // Chỉ persist các count, không persist notifications array (tránh lưu quá nhiều data)
            partialize: (state) => ({
                unreadCount: state.unreadCount,
                pendingAuthorRequests: state.pendingAuthorRequests,
                pendingHotelApprovals: state.pendingHotelApprovals,
            }),
        },
    ),
);
