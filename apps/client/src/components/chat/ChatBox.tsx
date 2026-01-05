"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Image as ImageIcon, SendHorizontal, Loader2 } from "lucide-react";
import { useBookingStore } from "@/store/useBookingStore"; // <--- 1. Import Store

type Message = {
  id: number;
  text: string;
  sender: "ai" | "user";
  imagePreview?: string | null;
};

// URL Backend AI (Lấy từ biến môi trường hoặc hardcode tạm)
const AI_SERVICE_URL = "http://localhost:8008";

export default function ChatBox() {
  // --- State UI cũ ---
  const [inputMessage, setInputMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // <--- Thêm state loading
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- Store Actions ---
  const setDate = useBookingStore((s) => s.setDate);
  const setGuests = useBookingStore((s) => s.setGuests);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: '🤖 Chào bạn! Tôi là trợ lý AI. Bạn muốn tìm phòng ở đâu, ngày nào? (Ví dụ: "Tìm villa Đà Lạt cuối tuần này cho 4 người")',
    },
  ]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // --- HÀM XỬ LÝ GỬI TIN NHẮN (LOGIC CHÍNH) ---
  const handleSubmit = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage && !imageFile) return;

    // 1. UI: Hiển thị tin nhắn User ngay lập tức
    const newMessage: Message = {
      id: Date.now(), // Dùng timestamp để ID không trùng
      sender: "user",
      text: trimmedMessage,
      imagePreview: preview,
    };
    setMessages((prev) => [...prev, newMessage]);

    // Reset input UI ngay để user cảm thấy nhanh
    setInputMessage("");
    setImageFile(null);
    setPreview(null);
    setIsLoading(true);

    try {
      let data;

      // TRƯỜNG HỢP 1: GỬI ẢNH (Visual Search)
      if (preview && imageFile) {
        // Logic gửi ảnh (bạn có thể implement sau hoặc dùng base64 như search page)
        // Tạm thời giả lập hoặc gọi API search ảnh
        // ... code xử lý ảnh ...
        data = {
          agent_response:
            "Tính năng tìm bằng ảnh đang được cập nhật vào Chatbot...",
        };
      }

      // TRƯỜNG HỢP 2: GỬI TEXT (Agent Chat)
      else {
        const res = await fetch(`${AI_SERVICE_URL}/agent/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmedMessage }),
        });

        if (!res.ok) throw new Error("Lỗi kết nối AI Server");
        data = await res.json();
      }

      // 2. XỬ LÝ PHẢN HỒI TỪ AI (Agent Action)
      if (data) {
        // A. Tự động điền Form (Date & Guests)
        if (data.intent) {
          const { dates, guests_adults, guests_children } = data.intent;

          // Update Date Store
          if (dates?.start && dates?.end) {
            const fromDate = new Date(dates.start);
            const toDate = new Date(dates.end);
            if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
              setDate({ from: fromDate, to: toDate });
            }
          }

          // Update Guest Store
          if (guests_adults !== undefined || guests_children !== undefined) {
            setGuests({
              adults: guests_adults || 2,
              children: guests_children || 0,
              infants: 0,
            });
          }
        }

        // B. Hiển thị tin nhắn AI trả lời
        // Nếu AI tìm thấy kết quả (data.results), có thể format tin nhắn đẹp hơn
        let botText =
          data.agent_response || "Tôi đã cập nhật thông tin tìm kiếm cho bạn.";

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "ai",
            text: botText,
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
          text: "⚠️ Xin lỗi, tôi đang gặp sự cố kết nối với bộ não trung tâm. Vui lòng thử lại sau.",
        },
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
    <div className="flex flex-col flex-1 bg-white overflow-hidden border-none h-full">
      {/* LỊCH SỬ CHAT */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto space-y-3 p-3"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {/* Avatar AI */}
            {msg.sender === "ai" && (
              <Avatar className="w-7 h-7 mr-2 mt-auto shrink-0">
                <AvatarFallback className="bg-[#54b09c] text-white text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
            )}

            {/* Bong bóng Chat */}
            <div
              className={`max-w-[85%] p-3 rounded-xl text-sm break-words shadow-sm ${
                msg.sender === "user"
                  ? "bg-green-600 text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-tl-md"
              }`}
            >
              {msg.imagePreview && (
                <div className="mb-2 w-full max-w-xs">
                  <img
                    src={msg.imagePreview}
                    alt="Uploaded"
                    className="rounded-lg object-cover w-full h-auto"
                  />
                </div>
              )}
              <div>{msg.text}</div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <Avatar className="w-7 h-7 mr-2 mt-auto shrink-0">
              <AvatarFallback className="bg-[#54b09c] text-white text-xs">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="bg-gray-100 p-3 rounded-xl rounded-tl-md text-gray-500 text-xs italic flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Đang suy nghĩ...
            </div>
          </div>
        )}
      </div>

      {/* PREVIEW ẢNH */}
      {preview && (
        <div className="flex items-center justify-between p-2 border-t rounded-t-md bg-gray-50">
          <div className="flex items-center gap-2">
            <img
              src={preview}
              alt="Preview"
              className="w-7 h-7 object-cover rounded-md"
            />
            <p className="text-xs text-gray-500">Ảnh sẵn sàng gửi</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6"
            onClick={() => {
              setPreview(null);
              setImageFile(null);
            }}
          >
            Xóa
          </Button>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="p-3 border-t flex gap-2 bg-white items-center">
        <Label htmlFor="upload-image" className="cursor-pointer shrink-0">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="w-8 h-8 text-gray-600 hover:text-green-600 !p-0"
          >
            <ImageIcon className="w-7 h-7" />
          </Button>
        </Label>
        <input
          id="upload-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          key={preview || "file-input"}
        />

        <div className="relative flex-1">
          <Textarea
            placeholder="Nhập yêu cầu (VD: Villa Đà Lạt 2tr)..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            className="min-h-10 max-h-24 resize-none rounded-2xl py-2 px-4 focus-visible:ring-2 focus-visible:ring-green-500 border-none bg-gray-100 text-sm overflow-hidden"
          />
        </div>

        <Button
          onClick={handleSubmit}
          size="icon"
          className="w-10 h-10 shrink-0 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          disabled={(!inputMessage.trim() && !imageFile) || isLoading}
        >
          <SendHorizontal className="w-5 h-5 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
