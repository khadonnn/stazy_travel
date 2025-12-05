'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Dùng Textarea cho ô nhập liệu chính
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Image as ImageIcon, SendHorizontal } from 'lucide-react';
import { BotMessageSquare, X } from 'lucide-react';
// Đã loại bỏ: import Image from 'next/image'; // Sử dụng thẻ <img> chuẩn thay thế

type Message = {
    id: number;
    text: string;
    sender: 'ai' | 'user';
    imagePreview?: string | null; // Lưu URL ảnh đã upload
};

export default function ChatBox() {
    const [inputMessage, setInputMessage] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null); // Đổi tên state để dễ quản lý
    const [preview, setPreview] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            sender: 'ai',
            text: '🤖 Tôi có thể giúp bạn tìm phòng, chỉ cần gửi ảnh minh hoạ hoặc câu lệnh đặt phòng!',
        },
    ]);

    // Cuộn xuống cuối mỗi khi có tin nhắn mới
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = () => {
        const trimmedMessage = inputMessage.trim();
        if (!trimmedMessage && !imageFile) return;

        // 1. Thêm tin nhắn của người dùng
        const newMessage: Message = {
            id: messages.length + 1,
            sender: 'user',
            text: trimmedMessage,
            imagePreview: preview,
        };
        setMessages((prev) => [...prev, newMessage]);

        // 2. Giả lập phản hồi từ AI
        const aiReply = imageFile
            ? 'Đã nhận ảnh. Tôi đang sử dụng SmartSearchService để phân tích và tìm phòng tương đồng...'
            : `Đang xử lý câu lệnh: "${trimmedMessage}". Tôi sẽ gọi ConversationalService để trích xuất ý định...`;

        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                {
                    id: prev.length + 1,
                    sender: 'ai',
                    text: aiReply,
                },
            ]);
        }, 800);

        // 3. Reset input
        setInputMessage('');
        setImageFile(null);
        setPreview(null);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    return (
        // Đảm bảo container chính có flex-col và flex-1 để chiếm đủ không gian còn lại
        <div className='flex flex-col flex-1 bg-white  overflow-hidden border-none'>
            {/* LỊCH SỬ CHAT CONTAINER */}
            {/* Thêm p-3 ở đây để đảm bảo padding cho khu vực cuộn */}

            <div
                ref={chatContainerRef}
                className='flex-1 overflow-y-auto space-y-3 p-3'
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${
                            msg.sender === 'user'
                                ? 'justify-end'
                                : 'justify-start'
                        }`}
                    >
                        {/* Avatar AI */}
                        {msg.sender === 'ai' && (
                            <Avatar className='w-7 h-7 mr-2 mt-auto shrink-0'>
                                <AvatarFallback className='bg-[#54b09c] text-white text-xs'>
                                    AI
                                </AvatarFallback>
                            </Avatar>
                        )}

                        {/* Bong bóng Chat */}
                        <div
                            className={`
                                max-w-[85%] p-3 rounded-xl text-sm break-words shadow-sm
                                ${
                                    msg.sender === 'user'
                                        ? 'bg-green-600 text-white rounded-br-md' // User: phải, xanh dương
                                        : 'bg-gray-100 text-gray-800 rounded-tl-md' // AI: trái, xám
                                }
                            `}
                        >
                            {msg.imagePreview && (
                                <div className='mb-2 w-full max-w-xs'>
                                    <img // Dùng thẻ <img> chuẩn thay cho Next/Image
                                        src={msg.imagePreview}
                                        alt='Uploaded Preview'
                                        className='rounded-lg object-cover w-full h-auto max-w-full'
                                    />
                                </div>
                            )}
                            {msg.text && <div>{msg.text}</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* PREVIEW ẢNH */}
            {preview && (
                // Đã loại bỏ mx-3 để phù hợp với padding của khu vực nhập liệu
                <div className='flex items-center justify-between p-2 border-t rounded-t-md bg-gray-50'>
                    <div className='flex items-center gap-2'>
                        {/* Dùng <img> chuẩn cho preview */}
                        <img
                            src={preview}
                            alt='Preview'
                            className='w-7 h-7 object-cover rounded-md'
                        />
                        <p className='text-xs text-gray-500'>
                            Ảnh sẵn sàng gửi
                        </p>
                    </div>
                    <Button
                        variant='ghost'
                        size='sm'
                        className='h-6'
                        onClick={() => {
                            setPreview(null);
                            setImageFile(null);
                        }}
                    >
                        Xóa
                    </Button>
                </div>
            )}

            {/* KHU VỰC NHẬP LIỆU */}
            {/* Đã loại bỏ padding-từ-top và thay bằng border-t để kiểm soát tốt hơn */}
            <div className='p-3 border-t flex  gap-2 bg-white  items-center'>
                {/* 2. Nút Upload Ảnh (ImageIcon) */}
                <Label
                    htmlFor='upload-image'
                    className='cursor-pointer shrink-0'
                >
                    <Button
                        variant='ghost'
                        size='icon'
                        asChild
                        className='w-8 h-8 text-gray-600 hover:text-green-600 p-0!' // Sử dụng !p-0 để ghi đè padding và căn chỉnh icon
                    >
                        {/* Tăng kích thước icon lên w-7 h-7 (28x28) */}
                        <ImageIcon className='w-7 h-7' />
                    </Button>
                </Label>
                <input
                    id='upload-image'
                    type='file'
                    accept='image/*'
                    onChange={handleImageChange}
                    className='hidden'
                    key={preview || 'file-input'} // Đảm bảo input reset khi xóa ảnh
                />

                {/* 3. Vùng nhập Text (Textarea) */}
                <div className='relative flex-1'>
                    <Textarea
                        placeholder='Nhập mô tả...'
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        rows={1}
                        className='min-h-10 max-h-24 resize-none rounded-2xl py-2 px-4 focus-visible:ring-2 focus-visible:ring-green-500 border-none bg-gray-100 text-sm overflow-hidden'
                    />
                </div>

                {/* 4. Nút Gửi (SendHorizontal) */}
                <Button
                    onClick={handleSubmit}
                    size='icon'
                    className='w-10 h-10 shrink-0 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 transition-colors'
                    disabled={!inputMessage.trim() && !imageFile}
                >
                    <SendHorizontal className='w-5 h-5 ml-0.5' />
                </Button>
            </div>
        </div>
    );
}
