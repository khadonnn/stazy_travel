"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Image as ImageIcon,
  SendHorizontal,
  MapPin,
  ExternalLink,
  Headset, // Icon cho nút hỗ trợ
  Bot, // Icon cho Bot
  Loader2,
} from "lucide-react";
import { useBookingStore } from "@/store/useBookingStore";
import Link from "next/link";
// 1. IMPORT SOCKET
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";
// --- TYPES ---
type HotelResult = {
  id: number;
  title: string;
  price: number;
  address: string;
  rating: number;
  image?: string;
  slug: string;
};

type Message = {
  id: number;
  text: string;
  sender: "ai" | "user" | "admin"; // Thêm 'admin'
  imagePreview?: string | null;
  data?: {
    hotels?: HotelResult[];
    bookingLink?: string;
  };
};

const AI_SERVICE_URL = "http://localhost:8008";
const SOCKET_URL = "http://localhost:3005"; // Server Admin Socket

export default function ChatBox() {
  const [inputMessage, setInputMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 🔥 STATE MỚI: Chế độ hỗ trợ
  const [isSupportMode, setIsSupportMode] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Store & User
  const setDate = useBookingStore((s) => s.setDate);
  const setGuests = useBookingStore((s) => s.setGuests);
  const { user } = useUser();
  // Xác định ID và Tên (Nếu chưa đăng nhập thì fallback là 'guest')
  const currentUserId = user?.id || "user_seed_6";
  const currentUserName = user?.fullName || user?.firstName || "Khách hàng";
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "🤖 Chào bạn! Tôi là Stazy AI. Tôi có thể giúp gì cho bạn?",
    },
  ]);

  // --- 2. SETUP SOCKET ---
  useEffect(() => {
    // Chỉ kết nối khi cần thiết hoặc mount component
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      // userId: "user_seed_6" -> Phải khớp với userId gửi trong message
      query: { userId: currentUserId, role: "user" },
    });

    const socket = socketRef.current;

    // Lắng nghe tin nhắn từ Admin
    socket.on("admin_message", (data: { text: string }) => {
      setIsSupportMode(true); // Tự động bật chế độ support nếu Admin nhắn
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "admin", text: data.text },
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  // Cuộn xuống cuối
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // --- 3. HÀM CHUYỂN ĐỔI CHẾ ĐỘ ---
  const toggleSupportMode = () => {
    const newMode = !isSupportMode;
    setIsSupportMode(newMode);

    // Thông báo hệ thống giả
    const sysMsg: Message = {
      id: Date.now(),
      sender: newMode ? "admin" : "ai",
      text: newMode
        ? "📞 Đang kết nối với nhân viên hỗ trợ... Vui lòng chờ giây lát."
        : "🤖 Đã quay lại chế độ AI tự động.",
    };
    setMessages((prev) => [...prev, sysMsg]);
  };

  const handleSubmit = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage && !imageFile) return;

    // UI User Message
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

    // --- LOGIC PHÂN LUỒNG ---

    // A. Gửi cho ADMIN (Socket)
    if (isSupportMode) {
      if (socketRef.current) {
        socketRef.current.emit("client_message", {
          userId: currentUserId,
          userName: currentUserName,
          text: trimmedMessage,
        });
      }
      return;
    }

    // B. Gửi cho AI (Python API)
    setIsLoading(true);
    try {
      const res = await fetch(`${AI_SERVICE_URL}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedMessage,
          user_id: currentUserId,
          history: messages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (!res.ok) throw new Error("Lỗi AI Server");
      const data = await res.json();

      if (data) {
        // Auto-fill logic (giữ nguyên)
        if (data.intent) {
          const { dates, guests_adults } = data.intent;
          if (dates?.start && dates?.end)
            setDate({ from: new Date(dates.start), to: new Date(dates.end) });
          if (guests_adults)
            setGuests({ adults: guests_adults, children: 0, infants: 0 });
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "ai",
            text: data.agent_response,
            data: {
              hotels: data.data?.hotels,
              bookingLink: data.data?.booking_link,
            },
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "ai", text: "⚠️ Lỗi kết nối AI." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden border-none h-full w-full">
      {/* --- HEADER CÓ NÚT CHUYỂN ĐỔI --- */}
      <div
        className={`p-3 border-b flex items-center justify-between transition-colors ${isSupportMode ? "bg-blue-50" : "bg-green-50"}`}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback
              className={`${isSupportMode ? "bg-blue-600" : "bg-green-600"} text-white font-bold`}
            >
              {isSupportMode ? <Headset size={16} /> : <Bot size={18} />}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              {isSupportMode ? "Nhân viên hỗ trợ" : "Stazy AI"}
            </h3>
            <p
              className={`text-[10px] flex items-center gap-1 ${isSupportMode ? "text-blue-600" : "text-green-600"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${isSupportMode ? "bg-blue-500" : "bg-green-500"}`}
              />
              {isSupportMode ? "Live Support" : "Automated"}
            </p>
          </div>
        </div>

        {/* 🔥 NÚT TRIGGER CHUYỂN ĐỔI */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSupportMode}
          className={`h-7 text-xs border-dashed ${isSupportMode ? "border-blue-300 text-blue-700 bg-blue-100 hover:bg-blue-200" : "border-green-300 text-green-700 bg-green-100 hover:bg-green-200"}`}
        >
          {isSupportMode ? "Dùng AI" : "Gặp nhân viên"}
        </Button>
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
            {msg.sender !== "user" && (
              <Avatar className="w-6 h-6 mr-2 mt-1 shrink-0">
                <AvatarFallback
                  className={`${msg.sender === "admin" ? "bg-blue-600" : "bg-green-600"} text-white`}
                >
                  {msg.sender === "admin" ? <Headset size={12} /> : "AI"}
                </AvatarFallback>
              </Avatar>
            )}

            <div className={`max-w-[85%] space-y-2`}>
              <div
                className={`p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                  msg.sender === "user"
                    ? "bg-green-600 text-white rounded-br-none"
                    : msg.sender === "admin"
                      ? "bg-blue-100 text-gray-800 border-blue-200 border rounded-tl-none" // Style Admin
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
                {msg.text}
              </div>

              {/* Rich UI (Hotels) chỉ hiện khi là AI */}
              {msg.sender === "ai" && msg.data?.hotels && (
                /* ... (Giữ nguyên code render hotel list) ... */
                <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                  {msg.data.hotels.map((hotel) => (
                    <Link
                      href={`/hotels/${hotel.slug}`}
                      key={hotel.id}
                      className="snap-center"
                    >
                      <Card className="w-48 shrink-0 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="h-24 bg-gray-200 w-full relative">
                          <img
                            src={hotel.image || "https://placehold.co/400x300"}
                            className="w-full h-full object-cover rounded-t-xl"
                          />
                          <Badge className="absolute top-1 right-1 bg-white/90 text-black text-[10px]">
                            ⭐ {hotel.rating}
                          </Badge>
                        </div>
                        <CardContent className="p-2">
                          <h4 className="font-bold text-xs truncate">
                            {hotel.title}
                          </h4>
                          <div className="font-bold text-green-600 text-xs mt-1">
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
              {msg.sender === "ai" && msg.data?.bookingLink && (
                <div className="mt-2">
                  <Link href={msg.data.bookingLink} target="_blank">
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md transition-transform active:scale-95">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Tiến hành thanh toán ngay
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-xs ml-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Stazy AI đang nhập...
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="p-3 border-t flex gap-2 bg-white items-center">
        {/* ... (Giữ nguyên Input & Upload Image) ... */}
        <div className="relative flex-1">
          {preview && (
            <div className="absolute bottom-full left-0 mb-2 w-16 h-16 border bg-white rounded-lg overflow-hidden">
              <img src={preview} className="w-full h-full object-cover" />
              <button
                onClick={() => setPreview(null)}
                className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center text-[10px]"
              >
                ✕
              </button>
            </div>
          )}
          <Textarea
            placeholder={
              isSupportMode
                ? "Nhắn tin cho nhân viên..."
                : "Tìm phòng, hỏi giá..."
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            className="min-h-[44px] max-h-24 resize-none rounded-full py-3 px-5 border-gray-200 bg-gray-50 text-sm focus-visible:ring-green-500"
          />
        </div>
        <Button
          onClick={handleSubmit}
          size="icon"
          className={`rounded-full shrink-0 ${isSupportMode ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
        >
          <SendHorizontal className="w-5 h-5 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
