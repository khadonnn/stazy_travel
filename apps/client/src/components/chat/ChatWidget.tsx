"use client";

import { useState } from "react";
import { BotMessageSquare, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import ChatBox from "./ChatBox";
import { motion, AnimatePresence } from "motion/react"; // ✅ Đúng theo docs

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

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
              <div className="flex justify-between items-center p-3 border-b bg-[#3B7F70] text-white shadow-md shrink-0">
                <h3 className="text-base font-semibold w-full text-center">
                  Welcome to Stazy Hotel 🎉
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-[#2e6459] transition-colors"
                  aria-label="Đóng Chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ChatBox />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nút bật chat — hiệu ứng ping sóng bằng Framer Motion thuần */}
      <div className="relative w-14 h-14">
        {/* ✅ Ripple 1 (sớm hơn) */}
        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-blue-400"
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{
              scale: [0, 1.6],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        )}

        {/* ✅ Ripple 2 (delay 0.7s — tạo cảm giác "sóng từng đợt") */}
        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-blue-400"
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{
              scale: [0, 1.6],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 1.8,
              delay: 0.7,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        )}

        {/* ✅ Vòng tròn trung tâm (nút bấm) */}
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
