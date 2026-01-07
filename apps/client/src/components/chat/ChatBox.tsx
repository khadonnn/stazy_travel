"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card"; // Import thêm Card
import { Badge } from "@/components/ui/badge"; // Import Badge
import {
  Image as ImageIcon,
  SendHorizontal,
  Loader2,
  MapPin,
  Star,
  ExternalLink,
} from "lucide-react";
import { useBookingStore } from "@/store/useBookingStore";
import Link from "next/link"; // Để chuyển trang

// --- 1. ĐỊNH NGHĨA TYPE MẠNH HƠN ---
type HotelResult = {
  id: number;
  title: string;
  price: number;
  address: string;
  rating: number;
  image?: string; // Backend nên trả về thêm ảnh thumbnail
  slug: string;
};

type Message = {
  id: number;
  text: string;
  sender: "ai" | "user";
  imagePreview?: string | null;
  // 🔥 Thêm trường data để hiển thị Rich UI
  data?: {
    hotels?: HotelResult[];
    bookingLink?: string;
  };
};

const AI_SERVICE_URL = "http://localhost:8008";

export default function ChatBox() {
  const [inputMessage, setInputMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Store
  const setDate = useBookingStore((s) => s.setDate);
  const setGuests = useBookingStore((s) => s.setGuests);

  // Giả lập User ID (Trong thực tế lấy từ Session/Auth)
  const currentUserId = "user_seed_6";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "🤖 Chào bạn! Tôi là Stazy AI. Tôi có thể giúp bạn tìm phòng, gợi ý địa điểm hoặc đặt chỗ ngay lập tức.",
    },
  ]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage && !imageFile) return;

    // 1. UI User Message
    const newMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: trimmedMessage,
      imagePreview: preview,
    };
    setMessages((prev) => [...prev, newMessage]);

    setInputMessage("");
    setImageFile(null);
    setPreview(null);
    setIsLoading(true);

    try {
      let data;

      // 2. Gọi API Agent
      // Lưu ý: Backend Python agent.py cần sửa nhẹ để trả về JSON có cấu trúc (hotels list) thay vì chỉ text.
      const res = await fetch(`${AI_SERVICE_URL}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedMessage,
          user_id: currentUserId,
          // 🔥 Gửi kèm lịch sử để AI nhớ context
          history: messages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (!res.ok) throw new Error("Lỗi kết nối AI Server");
      data = await res.json();

      // 3. Xử lý Logic Agent
      if (data) {
        // A. Auto-fill Form
        if (data.intent) {
          const { dates, guests_adults, guests_children } = data.intent;
          if (dates?.start && dates?.end) {
            setDate({ from: new Date(dates.start), to: new Date(dates.end) });
          }
          if (guests_adults || guests_children) {
            setGuests({
              adults: guests_adults || 2,
              children: guests_children || 0,
              infants: 0,
            });
          }
        }

        // B. Phản hồi tin nhắn
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "ai",
            text: data.agent_response || "Tôi đã cập nhật thông tin.",
            // 🔥 Nhận dữ liệu Rich Media từ Backend
            data: {
              hotels: data.data?.hotels, // List khách sạn tìm được
              bookingLink: data.data?.booking_link, // Link thanh toán nếu có
            },
          },
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "⚠️ Xin lỗi, hệ thống đang bận. Vui lòng thử lại.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ... (Phần handleImageChange giữ nguyên) ...
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden border-none h-full shadow-xl">
      {/* HEADER */}
      <div className="p-4 border-b bg-green-50 flex items-center gap-3">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-green-600 text-white font-bold">
            AI
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-sm font-bold text-gray-800">Stazy Assistant</h3>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />{" "}
            Online
          </p>
        </div>
      </div>

      {/* CHAT AREA */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-50"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "ai" && (
              <Avatar className="w-8 h-8 mr-2 mt-1 shrink-0">
                <AvatarFallback className="bg-green-600 text-white text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
            )}

            <div className={`max-w-[85%] space-y-2`}>
              {/* TEXT BUBBLE */}
              <div
                className={`p-3 rounded-2xl text-sm shadow-sm ${
                  msg.sender === "user"
                    ? "bg-green-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                }`}
              >
                {msg.imagePreview && (
                  <img
                    src={msg.imagePreview}
                    alt="Upload"
                    className="mb-2 rounded-lg max-w-[200px]"
                  />
                )}
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>

              {/* 🔥 RICH UI: DANH SÁCH KHÁCH SẠN */}
              {msg.sender === "ai" &&
                msg.data?.hotels &&
                msg.data.hotels.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                    {msg.data.hotels.map((hotel) => (
                      <Link
                        href={`/hotels/${hotel.slug || hotel.id}`} // Sử dụng slug nếu có
                        key={hotel.id}
                        className="snap-center"
                      >
                        <Card className="w-48 shrink-0 cursor-pointer hover:shadow-md transition-shadow">
                          <div className="h-28 bg-gray-200 w-full relative">
                            {/* Ảnh giả lập hoặc từ DB */}
                            <img
                              src={
                                hotel.image ||
                                "https://placehold.co/400x300?text=Hotel"
                              }
                              alt={hotel.title}
                              className="w-full h-full object-cover rounded-t-xl"
                            />
                            <Badge className="absolute top-2 right-2 bg-gray-400 text-black border-none text-[10px]">
                              ⭐ {hotel.rating}
                            </Badge>
                          </div>
                          <CardContent className="p-2">
                            <h4
                              className="font-bold text-xs truncate"
                              title={hotel.title}
                            >
                              {hotel.title}
                            </h4>
                            <div className="flex items-center text-[10px] text-gray-500 mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span className="truncate">{hotel.address}</span>
                            </div>
                            <div className="font-bold text-green-600 text-sm mt-1">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(hotel.price)}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}

              {/* 🔥 RICH UI: NÚT THANH TOÁN */}
              {msg.sender === "ai" && msg.data?.bookingLink && (
                <div className="mt-2">
                  <Button
                    asChild
                    className="bg-green-500 hover:bg-green-600 text-white w-full rounded-xl shadow-lg animate-bounce"
                  >
                    <a
                      href={msg.data.bookingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Hoàn tất đặt phòng ngay
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-center gap-2">
            <Avatar className="w-8 h-8 mr-2">
              <AvatarFallback className="bg-green-600 text-white text-xs">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="flex space-x-1 bg-gray-200 p-3 rounded-2xl rounded-tl-none">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT AREA (Giữ nguyên hoặc tùy chỉnh đẹp hơn) */}
      {/* ... (Phần UI Input giữ nguyên như code cũ) ... */}
      <div className="p-3 border-t flex gap-2 bg-white items-center">
        <Label htmlFor="upload-image" className="cursor-pointer shrink-0">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="w-8 h-8 text-gray-600 hover:text-green-600 !p-0"
          >
            <ImageIcon className="w-6 h-6" />
          </Button>
        </Label>
        <input
          id="upload-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        <div className="relative flex-1">
          {preview && (
            <div className="absolute bottom-full left-0 mb-2 w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
              <img src={preview} className="w-full h-full object-cover" />
              <button
                onClick={() => setPreview(null)}
                className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 text-[10px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          )}
          <Textarea
            placeholder="Tìm phòng, đặt chỗ, hỏi giá..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            className="min-h-[44px] max-h-24 resize-none rounded-full py-3 px-5 focus-visible:ring-1 focus-visible:ring-green-500 border border-gray-200 bg-gray-50 text-sm"
          />
        </div>

        <Button
          onClick={handleSubmit}
          size="icon"
          className="w-11 h-11 shrink-0 rounded-full bg-green-600 hover:bg-green-700 shadow-md transition-all active:scale-95"
          disabled={(!inputMessage.trim() && !imageFile) || isLoading}
        >
          <SendHorizontal className="w-5 h-5 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
