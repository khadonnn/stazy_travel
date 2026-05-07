"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SendHorizontal,
  ExternalLink,
  Headset,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useBookingStore } from "@/store/useBookingStore";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";
import { motion } from "motion/react";
import {
  useExploreStore,
  type ChatMessage as StoreChatMessage,
  type ExploreHotel,
} from "@/store/useExploreStore";

// --- TYPES ---
type HotelResult = {
  id: number;
  title: string;
  price: number;
  address: string;
  rating: number;
  image?: string;
  slug: string;
  map?: { lat: number; lng: number } | null;
  amenities?: string[];
  suitableFor?: string[];
  accessibility?: string[];
  [key: string]: any;
};

type Message = {
  id: number;
  text: string;
  sender: "ai" | "user" | "admin";
  imagePreview?: string | null;
  data?: {
    hotels?: HotelResult[];
    bookingLink?: string;
  };
  suggestions?: string[];
};

const AI_SERVICE_URL = "http://localhost:8008";
const SOCKET_URL = "http://localhost:3005";

interface ExploreChatBoxProps {
  onHotelsFound?: (hotels: HotelResult[]) => void;
  initialQuery?: string;
  initialMessages?: StoreChatMessage[];
  /** Current hotels from parent for dynamic tag extraction */
  currentHotels?: ExploreHotel[];
}

/**
 * Extract unique amenity/suitableFor/accessibility tags from hotel data
 */
function extractDynamicTags(hotels: ExploreHotel[]): string[] {
  const tagSet = new Set<string>();
  hotels.forEach((h) => {
    if (h.amenities) h.amenities.forEach((a: string) => tagSet.add(a));
    if (h.suitableFor) h.suitableFor.forEach((s: string) => tagSet.add(s));
    if (h.accessibility) h.accessibility.forEach((a: string) => tagSet.add(a));
  });
  return Array.from(tagSet).slice(0, 5); // max 5 tags
}

export default function ExploreChatBox({
  onHotelsFound,
  initialQuery,
  initialMessages,
  currentHotels: parentHotels = [],
}: ExploreChatBoxProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [isSupportMode, setIsSupportMode] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const setDate = useBookingStore((s) => s.setDate);
  const setGuests = useBookingStore((s) => s.setGuests);
  const { user } = useUser();

  const currentUserId = user?.id || "user_seed_6";
  const currentUserName = user?.fullName || user?.firstName || "Khách hàng";

  const [messages, setMessages] = useState<Message[]>(
    initialMessages && initialMessages.length > 0
      ? initialMessages.map((m) => ({
          id: m.id,
          text: m.text,
          sender: m.sender,
          imagePreview: m.imagePreview ?? null,
          data: m.data
            ? {
                hotels: (m.data.hotels || []).map((h: any) => ({
                  id: h.id,
                  title: h.title,
                  price: h.price,
                  address: h.address,
                  rating: h.rating || 0,
                  image: h.image || "",
                  slug: h.slug || String(h.id),
                  map: h.map ?? null,
                  amenities: h.amenities,
                  suitableFor: h.suitableFor,
                  accessibility: h.accessibility,
                })),
                bookingLink: m.data.bookingLink,
              }
            : undefined,
          suggestions: m.suggestions,
        }))
      : [
          {
            id: 1,
            sender: "ai" as const,
            text: "🤖 Chào bạn! Tôi là Stazy AI. Hãy cho tôi biết bạn muốn tìm khách sạn ở đâu?",
            suggestions: [
              "Khách sạn Đà Lạt",
              "Resort Nha Trang",
              "Homestay Đà Nẵng",
              "Villa Vũng Tàu",
            ],
          },
        ],
  );

  // Read hotels from store as fallback (for initial mount when parent hasn't passed them yet)
  const storeHotels = useExploreStore((s) => s.hotels);
  // Merge: prefer parent's hotels, fallback to store
  const effectiveHotels = parentHotels.length > 0 ? parentHotels : storeHotels;

  // Static FAQ suggestions when no hotels available
  const staticFaqTags = [
    "🕒 Giờ nhận phòng?",
    "🐶 Cho mang thú cưng?",
    "🚗 Có bãi đậu xe?",
    "🍳 Bao gồm bữa sáng?",
  ];

  // Dynamic suggestion tags from current hotel data
  const dynamicTags = useMemo(
    () => extractDynamicTags(effectiveHotels),
    [effectiveHotels],
  );

  // --- SOCKET SETUP ---
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      query: { userId: currentUserId, role: "user" },
    });

    const socket = socketRef.current;

    socket.on("admin_message", (data: { text: string }) => {
      setIsSupportMode(true);
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

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-send initial query (only if no transferred messages)
  useEffect(() => {
    if (initialQuery && (!initialMessages || initialMessages.length === 0)) {
      handleSendMessage(initialQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSupportMode = () => {
    const newMode = !isSupportMode;
    setIsSupportMode(newMode);
    const sysMsg: Message = {
      id: Date.now(),
      sender: newMode ? "admin" : "ai",
      text: newMode
        ? "📞 Đang kết nối với nhân viên hỗ trợ... Vui lòng chờ giây lát."
        : "🤖 Đã quay lại chế độ AI tự động.",
    };
    setMessages((prev) => [...prev, sysMsg]);
  };

  const handleSendMessage = async (text?: string) => {
    const trimmedMessage = (text || inputMessage).trim();
    if (!trimmedMessage) return;

    const newMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: trimmedMessage,
    };
    setMessages((prev) => [...prev, newMessage]);

    setInputMessage("");

    // A. Support mode -> send via socket
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

    // B. AI mode -> send to Python API
    setIsLoading(true);
    try {
      const formattedHistory = messages.map((m) => {
        if (m.sender === "ai" && m.data?.hotels && m.data.hotels.length > 0) {
          const hotelList = m.data.hotels
            .map(
              (h, idx) => `${idx + 1}. ${h.title} - ${h.price}đ (${h.address})`,
            )
            .join("\n");
          return {
            sender: m.sender,
            text: `${m.text}\n\n[Đã gợi ý các khách sạn:\n${hotelList}]`,
          };
        }
        return { sender: m.sender, text: m.text };
      });

      const res = await fetch(`${AI_SERVICE_URL}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedMessage,
          user_id: currentUserId,
          history: formattedHistory,
        }),
      });

      if (!res.ok) throw new Error("Lỗi AI Server");
      const data = await res.json();

      if (data) {
        if (data.intent) {
          const { dates, guests_adults } = data.intent;
          if (dates?.start && dates?.end)
            setDate({ from: new Date(dates.start), to: new Date(dates.end) });
          if (guests_adults)
            setGuests({ adults: guests_adults, children: 0, infants: 0 });
        }

        const hotels = data.data?.hotels || [];

        // Generate contextual suggestions
        const suggestions: string[] = [];
        if (hotels.length > 0) {
          suggestions.push("Khách sạn nào rẻ nhất?");
          suggestions.push("Có hồ bơi không?");
          suggestions.push("Đặt phòng ngay");
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "ai",
            text: data.agent_response,
            data: {
              hotels: hotels,
              bookingLink: data.data?.booking_link,
            },
            suggestions: suggestions.length > 0 ? suggestions : undefined,
          },
        ]);

        // Notify parent about hotels for map display
        if (hotels.length > 0 && onHotelsFound) {
          onHotelsFound(hotels);
        }
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

  const handleSubmit = () => handleSendMessage();

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <motion.div
      layoutId="main-chat-box"
      className="flex flex-col h-full w-full bg-gray-50/50"
    >
      {/* --- HEADER (#3B7F70 Stazy Green) --- */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200 bg-[#3B7F70] text-white shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <div className="bg-white/20 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">
              {isSupportMode ? "Nhân viên hỗ trợ" : "Trợ lý AI Trip"}
            </h2>
            <p className="text-xs text-white/70 flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${isSupportMode ? "bg-blue-300" : "bg-green-300"}`}
              />
              {isSupportMode ? "Live Support" : "Đang hỗ trợ tìm kiếm..."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSupportMode}
          className="h-7 text-xs border-white/30 text-white bg-white/10 hover:bg-white/20"
        >
          {isSupportMode ? "Dùng AI" : "Gặp nhân viên"}
        </Button>
      </div>

      {/* --- CHAT AREA --- */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender !== "user" && (
              <Avatar className="w-6 h-6 mr-2 mt-1 shrink-0">
                <AvatarFallback
                  className={`${msg.sender === "admin" ? "bg-[#3B7F70]" : "bg-[#3B7F70]"} text-white text-[10px]`}
                >
                  {msg.sender === "admin" ? <Headset size={12} /> : "AI"}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="max-w-[90%] space-y-2">
              {/* Message bubble */}
              <div
                className={`p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                  msg.sender === "user"
                    ? "bg-[#3B7F70] text-white rounded-tr-sm"
                    : msg.sender === "admin"
                      ? "bg-blue-50 text-gray-800 border border-blue-200 rounded-tl-sm"
                      : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                }`}
              >
                {msg.text}
              </div>

              {/* Suggestion chips */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.suggestions.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => handleSuggestionClick(sug)}
                      className="px-3 py-1.5 bg-[#3B7F70]/10 text-[#3B7F70] border border-[#3B7F70]/20 rounded-full text-xs font-medium hover:bg-[#3B7F70]/20 transition"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}

              {/* Hotel cards (horizontal scroll) */}
              {msg.sender === "ai" && msg.data?.hotels && (
                <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                  {msg.data.hotels.map((hotel) => (
                    <Link
                      href={`/hotels/${hotel.slug}`}
                      key={hotel.id}
                      className="snap-center"
                    >
                      <Card className="w-44 shrink-0 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="h-20 bg-gray-200 w-full relative overflow-hidden rounded-t-xl">
                          <img
                            src={hotel.image || "https://placehold.co/400x300"}
                            className="w-full h-full object-cover"
                          />
                          {hotel.rating > 0 && (
                            <Badge className="absolute top-1 right-1 bg-white/90 text-black text-[10px]">
                              ⭐ {hotel.rating}
                            </Badge>
                          )}
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

              {/* Booking link */}
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

      {/* --- SUGGESTION TAGS (Dynamic when hotels exist, Static FAQ when empty) --- */}
      {(dynamicTags.length > 0 || effectiveHotels.length === 0) && (
        <div className="px-4 py-2 border-t border-gray-100 bg-white shrink-0">
          <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-hide">
            {dynamicTags.length > 0
              ? dynamicTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSendMessage(`Tìm khách sạn có ${tag}`)}
                    className="px-3 py-1.5 bg-white text-[#3B7F70] border border-gray-200 rounded-full text-[11px] font-medium hover:bg-[#3B7F70] hover:text-white hover:border-[#3B7F70] transition shrink-0"
                  >
                    + {tag}
                  </button>
                ))
              : staticFaqTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSendMessage(tag)}
                    className="px-3 py-1.5 bg-white text-[#3B7F70] border border-gray-200 rounded-full text-[11px] font-medium hover:bg-[#3B7F70] hover:text-white hover:border-[#3B7F70] transition shrink-0"
                  >
                    {tag}
                  </button>
                ))}
          </div>
        </div>
      )}

      {/* --- INPUT AREA --- */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder={
              isSupportMode
                ? "Nhắn tin cho nhân viên..."
                : "Nhập yêu cầu của bạn..."
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-[#3B7F70] focus:ring-2 focus:ring-[#3B7F70]/20 rounded-full py-3 pl-4 pr-12 text-sm transition"
          />
          <button
            onClick={handleSubmit}
            className="absolute right-1.5 p-2 bg-[#3B7F70] hover:bg-[#2e6459] text-white rounded-full transition"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
