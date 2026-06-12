import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, BIData } from '../types/chat';

const SEARCH_SERVICE_URL = process.env.NEXT_PUBLIC_SEARCH_SERVICE_URL || 'http://127.0.0.1:8008';

const WELCOME_MESSAGE: Message = {
    id: 0,
    role: 'assistant',
    content:
        'Xin chào! Mình là **BI Agent** 🤖. Hãy hỏi mình về doanh thu, booking, hoặc xu hướng kinh doanh.\n\nChọn một gợi ý bên dưới hoặc tự nhập câu hỏi:',
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
};

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [skeletonType, setSkeletonType] = useState<'chart' | 'card' | 'text'>('text');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = useCallback(
        async (query: string) => {
            if (!query.trim() || loading) return;

            // Determine skeleton type based on query content
            const q = query.toLowerCase();
            if (q.includes('khách sạn') || q.includes('người dùng') || q.includes('phân tích')) {
                setSkeletonType('card');
            } else if (
                q.includes('doanh thu') ||
                q.includes('booking') ||
                q.includes('dự báo') ||
                q.includes('xu hướng')
            ) {
                setSkeletonType('chart');
            } else {
                setSkeletonType('text');
            }

            const userText = query.trim();
            const userMsg: Message = {
                id: Date.now(),
                role: 'user',
                content: userText,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            };

            setMessages((prev) => [...prev, userMsg]);
            setInput('');
            setLoading(true);

            try {
                const response = await fetch(`${SEARCH_SERVICE_URL}/api/admin/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: userText }),
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();

                const aiMsg: Message = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: data.agent_response || data.data?.summary || 'Không có phản hồi.',
                    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    biData: data.data || undefined,
                };

                setMessages((prev) => [...prev, aiMsg]);
            } catch (error) {
                const errorMsg: Message = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: `❌ Lỗi kết nối: ${error instanceof Error ? error.message : 'Không xác định'}. Kiểm tra Search Service tại ${SEARCH_SERVICE_URL}`,
                    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages((prev) => [...prev, errorMsg]);
            } finally {
                setLoading(false);
            }
        },
        [loading],
    );

    const handleChipClick = useCallback(
        (query: string) => {
            sendMessage(query);
        },
        [sendMessage],
    );

    return {
        messages,
        input,
        setInput,
        loading,
        skeletonType,
        scrollRef,
        sendMessage,
        handleChipClick,
    };
}
