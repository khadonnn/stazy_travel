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
  Headset,
  Bot,
  Loader2,
} from "lucide-react";
import { useBookingStore } from "@/store/useBookingStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useExploreStore, type ChatMessage } from "@/store/useExploreStore";
import { useChatContextStore } from "@/store/useChatContextStore";
import { motion } from "motion/react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";

// Rich UI sub-components
import SuggestedChips from "./SuggestedChips";
import AISummaryCard, {
  type AISummaryData,
  MOCK_SUMMARY_DATA,
} from "./AISummaryCard";
import AICompareTable, {
  type AICompareData,
  MOCK_COMPARE_DATA,
} from "./AICompareTable";

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

/** Rich UI payload attached to AI messages */
type RichUIData = {
  hotels?: HotelResult[];
  bookingLink?: string;
  /** Structured AI response for rich rendering */
  richUI?: AISummaryData | AICompareData;
  /** Action buttons rendered inside chat bubble */
  actionButtons?: { label: string; action: string }[];
};

type Message = {
  id: number;
  text: string;
  sender: "ai" | "user" | "admin";
  imagePreview?: string | null;
  data?: RichUIData;
};

const AI_SERVICE_URL = "http://localhost:8008";
const SOCKET_URL = "http://localhost:3005";

export default function ChatBox() {
  const [inputMessage, setInputMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [isSupportMode, setIsSupportMode] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Store & User
  const setDate = useBookingStore((s) => s.setDate);
  const setGuests = useBookingStore((s) => s.setGuests);
  const { user } = useUser();
  const router = useRouter();
  const setExploreHotels = useExploreStore((s) => s.setHotels);
  const setExploreMessages = useExploreStore((s) => s.setMessages);

  // Context-aware: read current hotel from chat context store
  const currentHotel = useChatContextStore((s) => s.currentHotel);

  const currentUserId = user?.id || "user_seed_6";
  const currentUserName = user?.fullName || user?.firstName || "Khách hàng";

  // Determine if we're on a hotel detail page (context-aware mode)
  const isContextAware = !!currentHotel;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "🤖 Chào bạn! Tôi là Stazy AI. Tôi có thể giúp gì cho bạn?",
    },
  ]);

  // Track previous hotel context to detect changes
  const prevHotelIdRef = useRef<number | null>(null);

  // --- REACT TO CONTEXT CHANGES (dynamic welcome when entering hotel page) ---
  useEffect(() => {
    if (currentHotel && currentHotel.id !== prevHotelIdRef.current) {
      // User just navigated to a hotel detail page
      prevHotelIdRef.current = currentHotel.id;
      setMessages([
        {
          id: Date.now(),
          sender: "ai",
          text: `🏨 Xin chào! Tôi thấy bạn đang xem **${currentHotel.name}** tại ${currentHotel.address}. Tôi có thể giúp bạn tìm hiểu thêm về khách sạn này. Hãy chọn một gợi ý bên dưới hoặc hỏi tôi bất cứ điều gì!`,
        },
      ]);
    } else if (!currentHotel && prevHotelIdRef.current !== null) {
      // User left the hotel detail page
      prevHotelIdRef.current = null;
      setMessages([
        {
          id: Date.now(),
          sender: "ai",
          text: "🤖 Chào bạn! Tôi là Stazy AI. Tôi có thể giúp gì cho bạn?",
        },
      ]);
    }
  }, [currentHotel]);

  // --- SOCKET ---
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

  // --- TOGGLE SUPPORT ---
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

  // --- MOCK CONTEXTUAL RESPONSE LOGIC ---
  const generateMockResponse = (
    userMessage: string,
  ): {
    text: string;
    data?: RichUIData;
  } | null => {
    const lower = userMessage.toLowerCase();

    // Compare chip → contextual reply with action buttons
    if (lower.includes("so sánh") || lower.includes("compare")) {
      return {
        text: `Bạn muốn so sánh ${currentHotel?.name || "khách sạn này"} với khách sạn nào trong danh sách yêu thích của bạn, hay để tôi gợi ý một khách sạn cùng phân khúc?`,
        data: {
          actionButtons: [
            { label: "Gợi ý cho tôi", action: "suggest_compare" },
            { label: "Chọn từ yêu thích", action: "pick_favorite" },
          ],
        },
      };
    }

    // Highlights / Summary chip
    if (
      lower.includes("điểm nổi bật") ||
      lower.includes("tóm tắt") ||
      lower.includes("summary") ||
      lower.includes("highlights")
    ) {
      return {
        text: "",
        data: {
          richUI: {
            ...MOCK_SUMMARY_DATA,
            title: `Đánh giá AI: ${currentHotel?.name || "Khách sạn"}`,
          },
        },
      };
    }

    // Vibe
    if (lower.includes("vibe")) {
      return {
        text: `✨ ${currentHotel?.name || "Khách sạn này"} mang đến vibe yên tĩnh, lãng mạn非常适合 cho kỳ nghỉ dưỡng. Không gian xanh mát, gần gũi thiên nhiên với kiến trúc hiện đại pha lẫn truyền thống Việt Nam.`,
      };
    }

    // Nearby
    if (lower.includes("quanh đây") || lower.includes("nearby")) {
      return {
        text: `📍 Xung quanh ${currentHotel?.name || "khách sạn"} có nhiều điểm tham quan hấp dẫn:\n• Bãi biển cách 5 phút đi bộ\n• Chợ đêm địa phương cách 1km\n• Các quán cafe view biển dọc đường\n• Khu vui chơi giải trí cách 2km`,
      };
    }

    // Itinerary
    if (lower.includes("lịch trình") || lower.includes("itinerary")) {
      return {
        text: `📅 Gợi ý lịch trình 3 ngày tại ${currentHotel?.destination || "khu vực"}:\n\n🌅 Ngày 1: Nhận phòng → Nghỉ ngơi → Sunset dinner tại nhà hàng khách sạn\n🌊 Ngày 2: Tour đảo → Lặn biển → BBQ bãi biển\n🏞️ Ngày 3: Trekking → Spa → Check-out`,
      };
    }

    // Suitable for
    if (
      lower.includes("couple") ||
      lower.includes("family") ||
      lower.includes("phù hợp")
    ) {
      return {
        text: `👥 ${currentHotel?.name || "Khách sạn này"} phù hợp với:\n\n💑 **Couple**: Không gian lãng mạn, view đẹp, có hồ bơi riêng\n👨‍👩‍👧‍👦 **Family**: Phòng rộng rãi, có khu vui chơi trẻ em, bữa sáng đa dạng\n\nĐánh giá: ⭐ 8.5/10 cho Couple, ⭐ 7.5/10 cho Family`,
      };
    }

    // Worth it
    if (lower.includes("đáng tiền") || lower.includes("worth")) {
      return {
        text: `💰 Với mức giá ${currentHotel?.price ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(currentHotel.price) : "tương đối"}/đêm, đây là đánh giá của tôi:\n\n✅ Đáng tiền nếu: Bạn muốn view biển, không gian yên tĩnh\n❌ Có thể tìm rẻ hơn nếu: Chỉ cần chỗ ngủ cơ bản\n\n🏆 Điểm giá trị: 7.5/10`,
      };
    }

    return null;
  };

  // --- HANDLE ACTION BUTTON CLICK ---
  const handleActionButton = async (action: string) => {
    if (action === "suggest_compare") {
      setIsLoading(true);
      try {
        // Fetch top 5 similar hotels by reviewStar from AI service
        const res = await fetch(
          `${AI_SERVICE_URL}/similar/${currentHotel?.id}?top_k=5`,
        );
        if (!res.ok) throw new Error("Failed to fetch similar hotels");
        const similarHotels = await res.json();

        // Filter to get top 5 by reviewStar, excluding current hotel
        const top5 = (similarHotels || [])
          .filter((h: any) => h.id !== currentHotel?.id)
          .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 5);

        if (top5.length > 0) {
          // Show the first comparison with the best rated hotel
          const bestMatch = top5[0];
          const compareMsg: Message = {
            id: Date.now(),
            sender: "ai",
            text: `Đây là so sánh giữa ${currentHotel?.name} và ${bestMatch.title} (đánh giá cao nhất trong phân khúc). Tôi cũng tìm thấy ${top5.length} khách sạn tương tự.`,
            data: {
              richUI: {
                ...MOCK_COMPARE_DATA,
                title: `So sánh tại ${currentHotel?.destination || "khu vực"}`,
                hotelA: {
                  name: currentHotel?.name || MOCK_COMPARE_DATA.hotelA.name,
                  price: currentHotel?.price
                    ? `${new Intl.NumberFormat("vi-VN").format(currentHotel.price)}đ`
                    : MOCK_COMPARE_DATA.hotelA.price,
                },
                hotelB: {
                  name: bestMatch.title || MOCK_COMPARE_DATA.hotelB.name,
                  price: bestMatch.price
                    ? `${new Intl.NumberFormat("vi-VN").format(bestMatch.price)}đ`
                    : MOCK_COMPARE_DATA.hotelB.price,
                },
              },
              // Also store the similar hotels list for explore navigation
              hotels: top5.map((h: any) => ({
                id: h.id,
                title: h.title,
                price: h.price,
                address: h.address,
                rating: h.rating || 0,
                image: h.image,
                slug: h.slug,
              })),
            },
          };
          setMessages((prev) => [...prev, compareMsg]);
        } else {
          // Fallback to mock data if no similar hotels found
          const compareMsg: Message = {
            id: Date.now(),
            sender: "ai",
            text: `Tôi chưa tìm thấy khách sạn tương tự trong cơ sở dữ liệu. Dưới đây là so sánh mẫu để bạn tham khảo:`,
            data: {
              richUI: {
                ...MOCK_COMPARE_DATA,
                hotelA: {
                  name: currentHotel?.name || MOCK_COMPARE_DATA.hotelA.name,
                  price: currentHotel?.price
                    ? `${new Intl.NumberFormat("vi-VN").format(currentHotel.price)}đ`
                    : MOCK_COMPARE_DATA.hotelA.price,
                },
              },
            },
          };
          setMessages((prev) => [...prev, compareMsg]);
        }
      } catch (error) {
        // On error, use mock data as fallback
        const compareMsg: Message = {
          id: Date.now(),
          sender: "ai",
          text: "Đây là so sánh mẫu (dữ liệu đang được cập nhật):",
          data: {
            richUI: {
              ...MOCK_COMPARE_DATA,
              hotelA: {
                name: currentHotel?.name || MOCK_COMPARE_DATA.hotelA.name,
                price: currentHotel?.price
                  ? `${new Intl.NumberFormat("vi-VN").format(currentHotel.price)}đ`
                  : MOCK_COMPARE_DATA.hotelA.price,
              },
            },
          },
        };
        setMessages((prev) => [...prev, compareMsg]);
      } finally {
        setIsLoading(false);
      }
    } else if (action === "pick_favorite") {
      const msg: Message = {
        id: Date.now(),
        sender: "ai",
        text: "📋 Vui lòng chọn khách sạn từ danh sách yêu thích của bạn. Tính năng này sẽ sớm được cập nhật!",
      };
      setMessages((prev) => [...prev, msg]);
    }
  };

  // --- SUBMIT ---
  const handleSubmit = async (overrideMessage?: string) => {
    const trimmedMessage = (overrideMessage || inputMessage).trim();
    if (!trimmedMessage && !imageFile) return;

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

    // A. Support mode
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

    setIsLoading(true);

    // B. Check for mock contextual response first
    const mockResponse = generateMockResponse(trimmedMessage);
    if (mockResponse) {
      // Simulate a small delay for realism
      await new Promise((r) => setTimeout(r, 600));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: mockResponse.text,
          data: mockResponse.data,
        },
      ]);
      setIsLoading(false);
      return;
    }

    // C. Call real AI API
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

      // Inject hotel context into the message if available
      const contextualMessage = currentHotel
        ? `[Context: User đang xem khách sạn "${currentHotel.name}" tại ${currentHotel.address}, giá ${currentHotel.price}đ/đêm, rating ${currentHotel.rating}]\n\n${trimmedMessage}`
        : trimmedMessage;

      const res = await fetch(`${AI_SERVICE_URL}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: contextualMessage,
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

  // --- RENDER RICH UI INSIDE BUBBLE ---
  const renderRichUI = (data: RichUIData) => {
    if (!data.richUI) return null;

    if (data.richUI.type === "summary") {
      return <AISummaryCard data={data.richUI as AISummaryData} />;
    }

    if (data.richUI.type === "compare") {
      return <AICompareTable data={data.richUI as AICompareData} />;
    }

    return null;
  };
  const shortenName = (name: string) => {
    if (!name) return "";
    return name.length > 18 ? `${name.substring(0, 18)}...` : name;
  };
  return (
    <motion.div
      layoutId="main-chat-box"
      className="flex flex-col flex-1 bg-white overflow-hidden border-none h-full w-full"
    >
      {/* --- HEADER --- */}
      <div
        className={`p-3 border-b flex items-center justify-between transition-colors ${isSupportMode ? "bg-blue-50" : isContextAware ? "bg-emerald-50" : "bg-green-50"}`}
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
              {isSupportMode
                ? "Nhân viên hỗ trợ"
                : isContextAware
                  ? `AI · ${shortenName(currentHotel?.name)}`
                  : "Stazy AI"}
            </h3>
            <p
              className={`text-[10px] flex items-center gap-1 ${isSupportMode ? "text-blue-600" : "text-green-600"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${isSupportMode ? "bg-blue-500" : "bg-green-500"}`}
              />
              {isSupportMode
                ? "Live Support"
                : isContextAware
                  ? "Contextual AI"
                  : "Automated"}
            </p>
          </div>
        </div>

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
              {/* Text bubble */}
              {msg.text && (
                <div
                  className={`p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                    msg.sender === "user"
                      ? "bg-green-600 text-white rounded-br-none"
                      : msg.sender === "admin"
                        ? "bg-blue-100 text-gray-800 border-blue-200 border rounded-tl-none"
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
              )}

              {/* Rich UI: Summary Card */}
              {msg.sender === "ai" &&
                msg.data?.richUI?.type === "summary" &&
                renderRichUI(msg.data)}

              {/* Rich UI: Compare Table */}
              {msg.sender === "ai" &&
                msg.data?.richUI?.type === "compare" &&
                renderRichUI(msg.data)}

              {/* Action Buttons inside bubble */}
              {msg.sender === "ai" &&
                msg.data?.actionButtons &&
                msg.data.actionButtons.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.data.actionButtons.map((btn, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                        onClick={() => handleActionButton(btn.action)}
                      >
                        {btn.label}
                      </Button>
                    ))}
                  </div>
                )}

              {/* Rich UI: Hotel cards */}
              {msg.sender === "ai" && msg.data?.hotels && (
                <div className="grid grid-cols-2 gap-2">
                  {msg.data.hotels.map((hotel) => (
                    <Link href={`/hotels/${hotel.slug}`} key={hotel.id}>
                      <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden">
                        <div className="h-24 bg-gray-200 w-full relative">
                          <img
                            src={hotel.image || "https://placehold.co/400x300"}
                            className="w-full h-full object-cover"
                          />
                          <Badge className="absolute top-1 right-1 bg-white/90 text-black text-[10px]">
                            ⭐ {hotel.rating}
                          </Badge>
                        </div>
                        <CardContent className="p-2">
                          <h4 className="font-bold text-xs line-clamp-2">
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

              {/* Explore on map */}
              {msg.sender === "ai" &&
                msg.data?.hotels &&
                msg.data.hotels.length > 0 &&
                !msg.data.bookingLink && (
                  <div className="mt-2">
                    <Button
                      onClick={() => {
                        const hotelsWithMap = msg.data!.hotels!.map((h) => ({
                          ...h,
                          map: (h as any).map ?? null,
                        }));
                        setExploreHotels(hotelsWithMap);

                        const serializable: ChatMessage[] = messages.map(
                          (m) => ({
                            id: m.id,
                            text: m.text,
                            sender: m.sender,
                            imagePreview: m.imagePreview ?? null,
                            data: m.data
                              ? {
                                  hotels: m.data.hotels?.map((h) => ({
                                    ...h,
                                    map: (h as any).map ?? null,
                                  })),
                                  bookingLink: m.data.bookingLink,
                                }
                              : undefined,
                          }),
                        );
                        setExploreMessages(serializable);
                        router.push(`/chat/explore-${Date.now()}`);
                      }}
                      variant="outline"
                      className="cursor-pointer w-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 font-semibold shadow-sm"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Xem trên bản đồ ({msg.data.hotels.length} kết quả)
                    </Button>
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

      {/* SUGGESTED CHIPS (only in context-aware mode, above input) */}
      {isContextAware && !isSupportMode && (
        <div className="px-3 pt-2 pb-1 border-t border-gray-100 bg-white">
          <SuggestedChips
            destination={currentHotel?.destination}
            onChipClick={(prompt) => handleSubmit(prompt)}
          />
        </div>
      )}

      {/* INPUT AREA */}
      <div className="p-3 border-t flex gap-2 bg-white items-center">
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
                : isContextAware
                  ? `Hỏi về ${currentHotel?.name || "khách sạn"}...`
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
          onClick={() => handleSubmit()}
          size="icon"
          className={`rounded-full shrink-0 ${isSupportMode ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
        >
          <SendHorizontal className="w-5 h-5 ml-0.5" />
        </Button>
      </div>
    </motion.div>
  );
}
