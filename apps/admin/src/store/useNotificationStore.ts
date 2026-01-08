// src/store/useNotificationStore.ts
import { create } from 'zustand';

interface NotificationState {
    unreadCount: number;
    increaseCount: () => void;
    resetCount: () => void;
    setCount: (count: number) => void; // Dùng khi fetch API lần đầu
}

export const useNotificationStore = create<NotificationState>((set) => ({
    unreadCount: 0,
    increaseCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
    resetCount: () => set({ unreadCount: 0 }),
    setCount: (count) => set({ unreadCount: count }),
}));
