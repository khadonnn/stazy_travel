"use client";

import React from "react";
import {
  Sparkles,
  Send,
  Map as MapIcon,
  SlidersHorizontal,
  Star,
  MapPin,
} from "lucide-react";

export default function ExploreWorkspacePage() {
  return (
    // Container bao phủ 100% màn hình, không cho cuộn toàn trang (overflow-hidden)
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
      {/* ==========================================
          CỘT 1: CHATBOX AI (Rộng 350px)
          ========================================== */}
      <div className="w-[350px] flex flex-col border-r border-gray-200 bg-gray-50/50 flex-shrink-0 z-20">
        {/* Header Chat */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">
                Trợ lý AI Trip
              </h2>
              <p className="text-xs text-gray-500">Đang hỗ trợ tìm kiếm...</p>
            </div>
          </div>
        </div>

        {/* Nội dung Chat (Cuộn độc lập) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {/* Tin nhắn User */}
          <div className="flex justify-end">
            <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm shadow-sm">
              Khách sạn Đà Lạt dưới 1 triệu, gần trung tâm.
            </div>
          </div>

          {/* Tin nhắn AI */}
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm max-w-[90%] text-sm shadow-sm text-gray-700">
              Mình đã tìm thấy 12 khách sạn dưới 1 triệu ở Đà Lạt. Bạn có muốn
              lọc thêm theo các tiện ích này không?
              {/* Suggestion Chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                {["Bao bữa sáng", "Có hồ bơi", "View thung lũng"].map((opt) => (
                  <button
                    key={opt}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-medium hover:bg-blue-100 transition"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Khung Input Chat */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Nhập yêu cầu của bạn..."
              className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full py-3 pl-4 pr-12 text-sm transition"
            />
            <button className="absolute right-1.5 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          CỘT 2: DANH SÁCH KHÁCH SẠN (Rộng 450px)
          ========================================== */}
      <div className="w-[450px] flex flex-col border-r border-gray-200 bg-white flex-shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Header Danh sách */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 bg-white">
          <h2 className="font-bold text-gray-800">12 kết quả tìm được</h2>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Khung List (Cuộn độc lập) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin bg-gray-50/30">
          {/* Card Mockup (Thẻ Ngang) */}
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="flex gap-4 bg-white p-3 rounded-2xl border border-gray-100 hover:border-amber-300 hover:shadow-md transition cursor-pointer group"
            >
              {/* Ảnh KS */}
              <div className="w-32 h-28 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0">
                <img
                  src={`https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=400&auto=format&fit=crop`}
                  alt="Hotel"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>

              {/* Info KS */}
              <div className="flex flex-col justify-between py-1">
                <div>
                  <div className="flex items-center gap-1 text-xs text-amber-600 font-medium mb-1">
                    <Star className="w-3 h-3 fill-amber-500" /> 4.9 (120)
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2">
                    Dalat Edensee Lake Resort & Spa
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3 shrink-0" /> Khu Tuyền Lâm
                  </div>
                </div>

                <div className="mt-2">
                  <span className="text-sm font-bold text-gray-900">
                    850.000đ
                  </span>
                  <span className="text-xs text-gray-500"> / đêm</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==========================================
          CỘT 3: BẢN ĐỒ (Chiếm phần diện tích còn lại)
          ========================================== */}
      <div className="flex-1 bg-gray-200 relative overflow-hidden">
        {/* Ở đây sau này bạn nhúng <MapComponent /> vào */}
        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dtj7wfwzu/image/upload/v1720000000/map-placeholder_abcd.png')] bg-cover bg-center opacity-50" />

        {/* Mockup giao diện Map chưa load */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-gray-600 font-medium flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-blue-500" />
            Khu vực Đà Lạt
          </div>
        </div>

        {/* Nút thoát toàn màn hình (Tuỳ chọn) */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Đóng X
        </button>
      </div>
    </div>
  );
}
