"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BotMessageSquare, Expand, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import ChatBox from "./ChatBox";
import { motion, AnimatePresence } from "motion/react";
import { useChatContextStore } from "@/store/useChatContextStore";
import { useExploreStore, type ChatMessage } from "@/store/useExploreStore";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const disabledRoutes = ["/about", "/login", "/register"];

  // Hide widget on /chat/ pages (explore page has its own chat panel)
  if (
    pathname &&
    (disabledRoutes.includes(pathname) || pathname.startsWith("/chat/"))
  ) {
    return null;
  }

  const WIDGET_WIDTH = "w-96";
  const WIDGET_HEIGHT = "h-[500px]";

  const chatVariants = {
    closed: {
      opacity: 0,
      y: 50,
      scale: 0.85,
    },
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Navigate to the full explore/chat page with context preserved
  const handleExpand = () => {
    const currentHotel = useChatContextStore.getState().currentHotel;
    const setExploreHotels = useExploreStore.getState().setHotels;

    let url = `/chat/explore-${Date.now()}`;

    // If we have a current hotel context (user is on Hotel Detail page),
    // pass hotelId as query param so the full page can detect context
    if (currentHotel) {
      url += `?hotelId=${currentHotel.id}`;
      // Also transfer hotel to explore store for column 2 & map
      setExploreHotels([
        {
          id: currentHotel.id,
          title: currentHotel.name,
          price: currentHotel.price,
          address: currentHotel.address,
          rating: currentHotel.rating,
          image: currentHotel.image,
          slug: currentHotel.slug,
          description: currentHotel.description,
          map: currentHotel.map ?? null,
        },
      ]);
    }

    router.push(url);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* ChatBox */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-card"
            initial="closed"
            animate="open"
            exit="closed"
            variants={chatVariants}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              duration: 0.4,
            }}
            className="mb-4"
          >
            <Card
              className={`${WIDGET_WIDTH} ${WIDGET_HEIGHT} flex flex-col shadow-2xl rounded-xl overflow-hidden p-0 border-none`}
            >
              <div className="relative flex items-center p-3 border-b bg-[#3B7F70] text-white shadow-md shrink-0">
                <h3 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold">
                  Welcome to Stazy AI 🎉
                </h3>

                <div className="ml-auto flex gap-2">
                  <button
                    onClick={handleExpand}
                    className="p-1 rounded-full hover:bg-[#2e6459] cursor-pointer"
                    title="Mở rộng"
                  >
                    <Expand className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1 rounded-full hover:bg-[#2e6459] cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <ChatBox />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nút bật chat — Đã gom lại và fix hiệu ứng sóng */}
      <div className="relative w-14 h-14">
        {!isOpen &&
          [0, 1, 2].map((delay) => (
            <motion.div
              key={delay}
              className="absolute inset-0 rounded-full border-2 border-blue-400"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                scale: [1, 2.2],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeOut",
                delay: delay,
                times: [0, 0.1, 0.95],
              }}
            />
          ))}

        {/* Nút bấm chính giữ nguyên */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl relative z-10 transition-colors ${
            isOpen
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          aria-label={isOpen ? "Đóng Chat" : "Mở Chat"}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <BotMessageSquare className="w-6 h-6" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
