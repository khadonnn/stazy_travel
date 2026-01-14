'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { cn } from '@/lib/utils'; // nếu bạn dùng shadcn thì thường có cn helper

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

const listVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.07,
        },
    },
};

export default function NotificationsPage() {
    const { notifications, resetCount, markAsRead } = useNotificationStore();

    useEffect(() => {
        resetCount();
    }, [resetCount]);

    const hasUnread = notifications.some((n) => !n.isRead);

    return (
        <div className="bg-background min-h-screen px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Bell className="text-primary h-7 w-7" />
                            {hasUnread && (
                                <span className="ring-background absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2" />
                            )}
                        </div>
                        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">Thông báo</h1>
                    </div>

                    {notifications.length > 0 && (
                        <span className="text-muted-foreground text-sm">{notifications.length} thông báo</span>
                    )}
                </motion.div>

                <AnimatePresence mode="wait">
                    {notifications.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-16 text-center shadow-sm"
                        >
                            <AlertCircle className="text-muted-foreground/70 mb-4 h-12 w-12" />
                            <h3 className="text-foreground text-lg font-medium">Chưa có thông báo nào</h3>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Khi có cập nhật mới, bạn sẽ thấy thông báo tại đây.
                            </p>
                        </motion.div>
                    ) : (
                        <motion.ul
                            key="list"
                            variants={listVariants}
                            initial="hidden"
                            animate="visible"
                            className="divide-border bg-card divide-y overflow-hidden rounded-xl border shadow-sm"
                        >
                            <AnimatePresence>
                                {notifications.map((notif) => (
                                    <motion.li
                                        key={notif.id}
                                        variants={itemVariants}
                                        exit="exit"
                                        layout
                                        className={cn(
                                            'group relative transition-colors',
                                            !notif.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50',
                                        )}
                                    >
                                        <Link
                                            href={notif.link || '#'}
                                            onClick={() => markAsRead(notif.id)}
                                            className="focus:ring-primary/40 block px-5 py-4 focus:ring-2 focus:outline-none"
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Dot unread */}
                                                {!notif.isRead && (
                                                    <div className="mt-1.5 flex-shrink-0">
                                                        <span className="bg-primary block h-2.5 w-2.5 rounded-full" />
                                                    </div>
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p
                                                            className={cn(
                                                                'text-base font-medium',
                                                                !notif.isRead
                                                                    ? 'text-foreground'
                                                                    : 'text-muted-foreground',
                                                            )}
                                                        >
                                                            {notif.title}
                                                        </p>

                                                        {notif.isRead && (
                                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                        )}
                                                    </div>

                                                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                                                        {notif.message}
                                                    </p>

                                                    <div className="text-muted-foreground/80 mt-2 flex items-center gap-4 text-xs">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {new Date(notif.createdAt).toLocaleString('vi-VN', {
                                                                dateStyle: 'medium',
                                                                timeStyle: 'short',
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.li>
                                ))}
                            </AnimatePresence>
                        </motion.ul>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
