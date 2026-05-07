"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import {
  Star,
  MapPin,
  SlidersHorizontal,
  Map as MapIcon,
  X,
  Eye,
} from "lucide-react";
import ExploreChatBox from "@/components/chat/ExploreChatBox";
import { useExploreStore, type ExploreHotel } from "@/store/useExploreStore";
import Link from "next/link";

// Dynamic import for map (avoid SSR issues with Leaflet)
const ExploreMap = dynamic(() => import("@/components/chat/ExploreMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-gray-400 text-sm">Đang tải bản đồ...</div>
    </div>
  ),
});

export default function ExploreWorkspacePage() {
  const router = useRouter();
  const params = useParams();

  // Centralized store
  const storeHotels = useExploreStore((s) => s.hotels);
  const storeMessages = useExploreStore((s) => s.messages);
  const storeActiveHotelId = useExploreStore((s) => s.activeHotelId);
  const setActiveHotelId = useExploreStore((s) => s.setActiveHotelId);
  const clearAll = useExploreStore((s) => s.clearAll);

  const [hotels, setHotels] = useState<ExploreHotel[]>(storeHotels);
  const [selectedHotel, setSelectedHotel] = useState<ExploreHotel | null>(null);

  // Clear store on unmount
  useEffect(() => {
    return () => {
      clearAll();
    };
  }, [clearAll]);

  // Callback when AI returns hotel results in explore page
  const handleHotelsFound = useCallback(
    (foundHotels: ExploreHotel[]) => {
      setHotels(foundHotels);
      setActiveHotelId(null);
      setSelectedHotel(null);
    },
    [setActiveHotelId],
  );

  // When a hotel card is clicked in the list -> highlight on map
  const handleHotelCardClick = useCallback(
    (hotel: ExploreHotel) => {
      setActiveHotelId(hotel.id);
      setSelectedHotel(hotel);
    },
    [setActiveHotelId],
  );

  // When a marker is clicked on the map
  const handleMarkerClick = useCallback(
    (hotelId: number) => {
      setActiveHotelId(hotelId);
      const found = hotels.find((h) => h.id === hotelId);
      if (found) setSelectedHotel(found);
    },
    [hotels, setActiveHotelId],
  );

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
      {/* ==========================================
          CỘT 1: CHATBOX AI (Rộng 350px)
          ========================================== */}
      <div className="w-[350px] flex flex-col border-r border-gray-200 bg-gray-50/50 flex-shrink-0 z-20">
        <ExploreChatBox
          onHotelsFound={handleHotelsFound}
          initialMessages={storeMessages.length > 0 ? storeMessages : undefined}
          currentHotels={hotels}
        />
      </div>

      {/* ==========================================
          CỘT 2: DANH SÁCH KHÁCH SẠN (Rộng 400px)
          ========================================== */}
      <div className="w-[400px] flex flex-col border-r border-gray-200 bg-white flex-shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 bg-white shrink-0">
          <h2 className="font-bold text-gray-800 text-sm">
            {hotels.length > 0
              ? `${hotels.length} kết quả tìm được`
              : "Kết quả tìm kiếm"}
          </h2>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Hotel List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-gray-50/30">
          {hotels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MapIcon className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm text-center">
                Chưa có kết quả. Hãy thử tìm kiếm ở cột chat bên trái!
              </p>
            </div>
          ) : (
            hotels.map((hotel) => (
              <div
                key={hotel.id}
                onClick={() => handleHotelCardClick(hotel)}
                className={`bg-white rounded-2xl border overflow-hidden transition cursor-pointer group ${
                  storeActiveHotelId === hotel.id
                    ? "border-[#3B7F70] shadow-lg ring-2 ring-[#3B7F70]/20"
                    : "border-gray-100 hover:border-amber-300 hover:shadow-md"
                }`}
              >
                {/* Ảnh khách sạn (h-44, full width) */}
                <div className="relative h-44 bg-gray-200 overflow-hidden">
                  <img
                    src={
                      hotel.image || "https://placehold.co/600x400?text=Hotel"
                    }
                    alt={hotel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/600x400?text=Hotel";
                    }}
                  />
                  {/* Price overlay (bottom-right) */}
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg">
                    <span className="text-sm font-bold">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(hotel.price)}
                    </span>
                    <span className="text-xs opacity-80"> /đêm</span>
                  </div>
                  {/* Rating badge (top-left) */}
                  {hotel.rating > 0 && (
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <Star className="w-3 h-3 fill-amber-500" />
                      {hotel.rating}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1.5">
                    {hotel.title}
                  </h3>
                  {hotel.address && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 shrink-0 text-[#3B7F70]" />
                      <span className="truncate">{hotel.address}</span>
                    </div>
                  )}
                  {hotel.description && (
                    <p className="line-clamp-2 text-sm text-gray-500 mt-1">
                      {hotel.description}
                    </p>
                  )}
                  <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-50">
                    <Link
                      href={`/hotels/${hotel.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-[#3B7F70] hover:text-[#2e6459] font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ==========================================
          CỘT 3: BẢN ĐỒ (Chiếm phần còn lại)
          ========================================== */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden">
        <ExploreMap
          hotels={hotels}
          activeHotelId={storeActiveHotelId}
          onMarkerClick={handleMarkerClick}
          height="100%"
        />

        {/* Overlay label khi chưa có data */}
        {hotels.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-gray-600 font-medium flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-[#3B7F70]" />
              Bản đồ sẽ hiển thị khi có kết quả
            </div>
          </div>
        )}

        {/* Nút đóng */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition z-[1000]"
        >
          <span className="flex items-center gap-1">
            <X className="w-4 h-4" />
            Đóng
          </span>
        </button>

        {/* Selected hotel detail overlay */}
        {selectedHotel && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-[1000] max-w-md">
            <button
              onClick={() => setSelectedHotel(null)}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                <img
                  src={
                    selectedHotel.image ||
                    "https://placehold.co/400x300?text=Hotel"
                  }
                  alt={selectedHotel.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://placehold.co/400x300?text=Hotel";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm line-clamp-1">
                  {selectedHotel.title}
                </h3>
                {selectedHotel.address && (
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{selectedHotel.address}</span>
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-amber-600">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(selectedHotel.price)}
                    <span className="text-xs text-gray-500 font-normal">
                      {" "}
                      /đêm
                    </span>
                  </span>
                  <Link
                    href={`/hotels/${selectedHotel.slug}`}
                    className="bg-[#3B7F70] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#2e6459] transition"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
