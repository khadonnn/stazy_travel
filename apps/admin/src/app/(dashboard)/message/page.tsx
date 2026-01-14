'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Send, MoreVertical, Phone, Video, CheckCheck, User, Moon, Sun, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';
import { useNotificationStore } from '@/store/useNotificationStore';

const SOCKET_URL = 'http://localhost:3005';
const API_URL = process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || 'http://localhost:8001/api/chat';

type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: Date;
    isRead: boolean;
};

type ChatSession = {
    userId: string;
    userName: string;
    lastMessage: string;
    lastTimestamp: Date;
    unreadCount: number;
    status: 'online' | 'offline';
    messages: Message[];
};

export default function AdminSupportChat() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const { setTheme, theme } = useTheme();
    const { getToken, userId } = useAuth();
    const { setUnreadCount } = useNotificationStore();

    // --- 1. FETCH DANH SÁCH USER ---
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const token = await getToken();
                if (!token) return;

                const res = await fetch(`${API_URL}/conversations`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) throw new Error('Failed to fetch conversations');
                const data = await res.json();

                const formattedSessions: ChatSession[] = data.map((c: any) => ({
                    userId: c.userId,
                    userName: c.userName || `Khách hàng (${c.userId.slice(-4)})`,
                    lastMessage: c.lastMessage || 'Hình ảnh',
                    lastTimestamp: new Date(c.lastTimestamp),
                    unreadCount: c.unreadCount || 0,
                    status: 'offline',
                    messages: [],
                }));

                setSessions(formattedSessions);
            } catch (error) {
                console.error('Lỗi tải danh sách chat:', error);
            }
        };

        if (userId) fetchConversations();
    }, [getToken, userId]);

    // --- 2. FETCH LỊCH SỬ TIN NHẮN (CÓ ABORT CONTROLLER) ---
    useEffect(() => {
        if (!selectedUserId) return;

        const controller = new AbortController(); // 🔥 Tạo bộ ngắt request
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const token = await getToken();

                // 1. Lấy tin nhắn
                const res = await fetch(`${API_URL}/messages/${selectedUserId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal, // 🔥 Gắn signal
                });

                if (!res.ok) return; // Silent fail hoặc xử lý lỗi
                const messagesData = await res.json();

                if (!Array.isArray(messagesData)) {
                    console.error('⚠️ API Data Invalid:', messagesData);
                    return;
                }

                const formattedMessages: Message[] = messagesData.map((m: any) => ({
                    id: m._id,
                    senderId: m.sender === 'user' ? m.userId : 'admin',
                    text: m.text,
                    timestamp: new Date(m.createdAt),
                    isRead: m.isRead,
                }));

                // 2. Update UI (Chỉ khi component chưa bị unmount hoặc đổi user khác)
                if (!controller.signal.aborted) {
                    setSessions((prev) =>
                        prev.map((s) =>
                            s.userId === selectedUserId ? { ...s, messages: formattedMessages, unreadCount: 0 } : s,
                        ),
                    );
                }

                // 3. Đánh dấu đã đọc & Update Badge Sidebar
                await fetch(`${API_URL}/messages/mark-read`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId: selectedUserId }),
                    signal: controller.signal,
                });

                const statsRes = await fetch(`${API_URL}/messages/stats/unread`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                const statsData = await statsRes.json();
                setUnreadCount(statsData.count || 0);
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Lỗi tải lịch sử chat:', err);
                }
            } finally {
                if (!controller.signal.aborted) setIsLoadingHistory(false);
            }
        };

        // Logic check cache: Nếu chưa có tin nhắn -> Fetch. Nếu có rồi nhưng unread > 0 -> Fetch lại để update read status
        const currentSession = sessions.find((s) => s.userId === selectedUserId);
        const shouldFetch = !currentSession?.messages.length || (currentSession?.unreadCount || 0) > 0;

        if (shouldFetch) {
            fetchHistory();
        } else {
            // Nếu đã có tin nhắn và unread = 0, thì không cần fetch lại, chỉ cần tắt loading
            setIsLoadingHistory(false);
        }

        return () => controller.abort(); // 🔥 Hủy request cũ khi user đổi sang người khác
    }, [selectedUserId, getToken, setUnreadCount]); // Bỏ 'sessions' khỏi dependency để tránh vòng lặp

    // --- 3. SOCKET REALTIME ---
    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            query: { role: 'admin' },
            transports: ['websocket'],
        });

        newSocket.on('receive_message_from_user', (data: any) => {
            handleIncomingMessage(data.userId, data.text, data.userName);
        });

        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Scroll effect
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [sessions, selectedUserId, isLoadingHistory]);

    // --- LOGIC FUNCTIONS ---
    const handleIncomingMessage = (userId: string, text: string, senderName?: string) => {
        setSessions((prev: any) => {
            const existingIdx = prev.findIndex((s: any) => s.userId === userId);
            const newMessage: Message = {
                id: Date.now().toString(),
                senderId: userId,
                text: text,
                timestamp: new Date(),
                isRead: false,
            };

            if (existingIdx > -1) {
                const updated = [...prev];
                const session = { ...updated[existingIdx] };

                // Luôn push tin nhắn mới vào mảng để update real-time
                // Dù admin đang xem hay không thì tin nhắn cũng phải hiện ra
                session.messages = [...session.messages, newMessage];
                session.lastMessage = text;
                session.lastTimestamp = new Date();

                // Nếu KHÔNG đang xem user này -> Tăng số chưa đọc
                if (selectedUserId !== userId) {
                    session.unreadCount += 1;
                }

                updated.splice(existingIdx, 1);
                return [session, ...updated];
            } else {
                return [
                    {
                        userId,
                        userName: senderName || `Khách hàng (${userId.slice(-4)})`,
                        lastMessage: text,
                        lastTimestamp: new Date(),
                        unreadCount: 1,
                        status: 'online',
                        messages: [newMessage],
                    },
                    ...prev,
                ];
            }
        });
    };

    const handleSendMessage = () => {
        if (!inputText.trim() || !selectedUserId || !socket) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            senderId: 'admin',
            text: inputText,
            timestamp: new Date(),
            isRead: true,
        };

        setSessions((prev) =>
            prev.map((s) =>
                s.userId === selectedUserId
                    ? {
                          ...s,
                          messages: [...s.messages, newMessage],
                          lastMessage: `Bạn: ${inputText}`,
                          lastTimestamp: new Date(),
                      }
                    : s,
            ),
        );

        socket.emit('admin_reply', { targetUserId: selectedUserId, text: inputText });
        setInputText('');
    };

    const activeSession = sessions.find((s) => s.userId === selectedUserId);

    return (
        <div className="m-4 flex h-[calc(100vh-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-950">
            {/* Sidebar Left */}
            <div className="flex w-80 flex-col border-r border-slate-200 bg-slate-50 transition-colors dark:border-zinc-800 dark:bg-zinc-900/50">
                {/* ... Header Sidebar (Giữ nguyên code cũ của bạn) ... */}
                <div className="border-b border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tin nhắn</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="text-slate-500 dark:text-slate-400"
                        >
                            <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                            <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Tìm kiếm..." className="border-none bg-slate-100 pl-9" />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="flex flex-col">
                        {sessions.map((session) => (
                            <button
                                key={session.userId}
                                onClick={() => setSelectedUserId(session.userId)}
                                className={`group flex items-start gap-3 border-b border-slate-100 p-4 text-left transition-all dark:border-zinc-800/50 ${
                                    selectedUserId === session.userId
                                        ? 'border-l-4 border-l-blue-500 bg-blue-50 dark:border-l-blue-500 dark:bg-blue-900/20'
                                        : 'border-l-4 border-l-transparent hover:bg-slate-100 dark:hover:bg-zinc-900'
                                }`}
                            >
                                <div className="relative">
                                    <Avatar>
                                        <AvatarFallback
                                            className={
                                                selectedUserId === session.userId ? 'bg-blue-200 text-blue-700' : ''
                                            }
                                        >
                                            {session.userName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {session.status === 'online' && (
                                        <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span
                                            className={`text-sm font-medium ${session.unreadCount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}
                                        >
                                            {session.userName}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {session.lastTimestamp.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                    <p
                                        className={`truncate text-xs ${session.unreadCount > 0 ? 'font-bold' : 'text-slate-500'}`}
                                    >
                                        {session.lastMessage}
                                    </p>
                                </div>
                                {session.unreadCount > 0 && (
                                    <Badge className="bg-red-500 hover:bg-red-600">{session.unreadCount}</Badge>
                                )}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Window */}
            <div className="flex flex-1 flex-col bg-white transition-colors dark:bg-zinc-950">
                {activeSession ? (
                    <>
                        {/* Header Chat */}
                        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback className="bg-blue-600 text-white">
                                        {activeSession.userName.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        {activeSession.userName}
                                    </h3>
                                    <span className="text-xs text-green-500">Đang hoạt động</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon">
                                    <Phone className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                    <Video className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6 transition-colors dark:bg-black/20"
                            ref={scrollRef}
                        >
                            {isLoadingHistory && activeSession.messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                activeSession.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex w-full ${msg.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl p-3 text-sm shadow-sm ${
                                                msg.senderId === 'admin'
                                                    ? 'rounded-br-none bg-blue-600 text-white'
                                                    : 'rounded-tl-none border bg-white text-slate-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white'
                                            }`}
                                        >
                                            {msg.text}
                                            <span className="mt-1 block text-right text-[10px] opacity-70">
                                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input */}
                        <div className="mt-auto border-t border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                            <div className="flex gap-2">
                                <Input
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Nhập tin nhắn..."
                                />
                                <Button onClick={handleSendMessage}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                        <User className="mb-4 h-16 w-16" />
                        <p>Chọn đoạn chat để bắt đầu</p>
                    </div>
                )}
            </div>
        </div>
    );
}
