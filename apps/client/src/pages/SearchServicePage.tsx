"use client";

import { useEffect, useState } from "react";
import {
  Upload,
  Search,
  Sparkles,
  Heart,
  Star,
  Tag,
  X,
  Waves,
  Mountain,
  Building2,
  Palmtree,
  Crown,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BackgroundBeams } from "@/components/ui/background-beams";

// --- 1. ĐỊNH NGHĨA TYPE (Theo yêu cầu của bạn) ---
export type LocationMap = {
  lat: number;
  lng: number;
};

export type ProductType = {
  id: number;
  authorId: string;
  date: string;
  slug: string;
  categoryId?: number;
  title: string;
  featuredImage: string;
  galleryImgs: string[];
  amenities: string[];
  description: string;
  price: number;
  address: string;
  reviewStar?: number; // Backend trả về reviewStar
  reviewCount?: number;
  viewCount?: number;
  like?: boolean;
  commentCount?: number;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  saleOff?: number | null;
  saleOffPercent?: number;
  isAds?: boolean;
  map?: LocationMap;
};

export default function SearchServicePage() {
  // --- STATE QUẢN LÝ ---
  // Dữ liệu gốc từ API Backend (thay cho file JSON)
  const [allHotels, setAllHotels] = useState<ProductType[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // State UI
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchDescription, setSearchDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [activeFilter, setActiveFilter] = useState("recommend");

  // Kết quả tìm kiếm hiển thị ra màn hình
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // URL Backend (Lấy từ biến môi trường hoặc hardcode)
  const PRODUCT_API_URL =
    process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || "http://localhost:8000";
  const AI_SERVICE_URL = "http://localhost:8008";

  // --- 2. FETCH DỮ LIỆU TỪ BACKEND KHI LOAD TRANG ---
  useEffect(() => {
    const fetchAllHotels = async () => {
      try {
        setIsLoadingData(true);
        // Gọi API lấy tất cả khách sạn để làm dữ liệu gốc ánh xạ
        const res = await fetch(`${PRODUCT_API_URL}/hotels?limit=1000`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to fetch hotels");

        const data = await res.json();
        // Xử lý trường hợp API trả về { data: [...] } hoặc [...]
        const hotels: ProductType[] = Array.isArray(data)
          ? data
          : data.data || [];
        console.log(
          `✅ Đã tải ${hotels.length} khách sạn từ Database.`,
          hotels,
        );
        setAllHotels(hotels);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu khách sạn:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchAllHotels();
  }, []);

  // --- 3. GỌI Ý RECOMMENDATION (Chỉ chạy khi đã có dữ liệu allHotels) ---
  useEffect(() => {
    if (allHotels.length === 0) return;

    const fetchInitialRecommendations = async () => {
      setIsSearching(true);
      try {
        // Gọi AI Recommend
        const res = await fetch(`${AI_SERVICE_URL}/recommend/user_seed_1`);
        if (res.ok) {
          const matches = await res.json();
          updateUIWithResults(matches);
        }
      } catch (e) {
        console.log("⚠️ Server AI chưa bật, hiển thị data mặc định");
        // Fallback: Lấy 6 cái đầu tiên từ API
        updateUIWithResults(
          allHotels.slice(0, 6).map((s) => ({ id: s.id, score: 0.9 })),
        );
      } finally {
        setIsSearching(false);
      }
    };

    fetchInitialRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allHotels]); // Chạy lại khi allHotels đã load xong

  // --- HÀM BỔ TRỢ: CẬP NHẬT UI TỪ KẾT QUẢ AI ---
  const updateUIWithResults = (matches: any[]) => {
    console.log("1. Dữ liệu AI trả về (Matches):", matches);
    if (!matches || matches.length === 0) {
      console.warn("❌ AI trả về mảng rỗng!");
      console.groupEnd();
      setSearchResults([]);
      return;
    }
    if (allHotels.length === 0) {
      console.warn("❌ Chưa có dữ liệu allHotels để map!");
      console.groupEnd();
      return;
    }
    const matchIds = matches.map((m: any) => String(m.id));
    console.log("2. Danh sách ID cần tìm:", matchIds);
    const foundCount = allHotels.filter((h) =>
      matchIds.includes(String(h.id)),
    ).length;
    console.log(
      `3. Tìm thấy ${foundCount}/${matchIds.length} ID khớp trong Database.`,
    );

    const filteredResults = allHotels
      .filter((stay) => matchIds.includes(String(stay.id)))
      .map((stay) => {
        const matchInfo = matches.find(
          (m: any) => String(m.id) === String(stay.id),
        );
        return {
          id: stay.id,
          name: stay.title,
          price: stay.price.toLocaleString("vi-VN") + "đ",
          rating: stay.reviewStar || 5,
          image: stay.featuredImage,
          amenities: stay.amenities || [],
          score: matchInfo?.score || 0.9,
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    console.log("4. Kết quả cuối cùng render ra màn hình:", filteredResults);

    if (filteredResults.length === 0 && matches.length > 0) {
      alert(
        `LỖI: AI tìm ra ID [${matchIds.slice(0, 3)}...] nhưng Database không có các ID này. Hãy kiểm tra lại Seed!`,
      );
    }

    setSearchResults(filteredResults);
    console.groupEnd();
  };

  // --- 4. CÁC HÀM XỬ LÝ LOGIC TÌM KIẾM ---

  const handleKeywordSearch = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    let targetAmenities: string[] = [];
    let matchedTagId: string | null = null;

    if (lowerText.includes("biển")) {
      targetAmenities = ["beach-view", "sea-view"];
      matchedTagId = "beach";
    } else if (lowerText.includes("núi")) {
      targetAmenities = ["mountain-view"];
      matchedTagId = "mountain";
    } else if (
      lowerText.includes("thành phố") ||
      lowerText.includes("đô thị") ||
      lowerText.includes("trung tâm")
    ) {
      targetAmenities = ["city-view"];
      matchedTagId = "city";
    }

    if (targetAmenities.length > 0) {
      // Lọc từ allHotels (đã fetch từ API)
      const localResults = allHotels
        .filter((stay) =>
          stay.amenities?.some((a) => targetAmenities.includes(a)),
        )
        .map((stay) => ({
          id: stay.id,
          name: stay.title,
          price: stay.price.toLocaleString("vi-VN") + "đ",
          rating: stay.reviewStar || 5,
          image: stay.featuredImage,
          amenities: stay.amenities,
          score: 0.95,
          matchedTagId,
        }))
        .sort(() => 0.5 - Math.random())
        .slice(0, 20);

      setSearchResults(localResults);
      setIsSearching(false);
      return true;
    }
    return false;
  };

  const handleSearch = async (overrideText?: string) => {
    const textToSearch = overrideText || searchDescription.trim();
    if (!selectedImage && !textToSearch) {
      alert("Vui lòng chọn ảnh hoặc nhập mô tả");
      return;
    }

    setIsSearching(true);

    if (selectedImage) {
      // --- Search bằng Ảnh ---
      console.log("📸 Đang tìm kiếm bằng ẢNH...");
      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        try {
          const res = await fetch(`${AI_SERVICE_URL}/search-by-base64`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Image }),
          });
          const matches = await res.json();
          console.log("🔥 AI trả về matches:", matches);
          updateUIWithResults(matches);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      };
    } else {
      // --- Search bằng Text ---
      // 1. Ưu tiên Keyword logic
      const isKeywordSearch = handleKeywordSearch(textToSearch);

      if (!isKeywordSearch) {
        // 2. Gọi AI Search
        try {
          const res = await fetch(`${AI_SERVICE_URL}/search-by-text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: textToSearch }),
          });
          const matches = await res.json();
          updateUIWithResults(matches);
        } catch (error) {
          console.error("Lỗi server AI:", error);
        } finally {
          setIsSearching(false);
        }
      }
    }
  };

  const handleImageUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setSelectedImage(file);
    };
    reader.readAsDataURL(file);
  };

  // --- DỮ LIỆU TĨNH (Tags, Filters) ---
  const hotelTags = [
    {
      id: "beach",
      name: "Tắm biển ",
      icon: Waves,
      color: "bg-cyan-600",
      query: "beach resort ocean",
    },
    {
      id: "mountain",
      name: "Vùng núi",
      icon: Mountain,
      color: "bg-emerald-600",
      query: "mountain forest sapa",
    },
    {
      id: "city",
      name: "Đô thị",
      icon: Building2,
      color: "bg-slate-500",
      query: "city center hotel",
    },
    {
      id: "pool",
      name: "Hồ bơi",
      icon: Palmtree,
      color: "bg-blue-500",
      query: "swimming pool",
    },
    {
      id: "luxury",
      name: "Cao cấp",
      icon: Crown,
      color: "bg-amber-600",
      query: "luxury villa resort",
    },
  ];

  const filters = [
    {
      id: "recommend",
      label: "Gợi ý AI",
      icon: Sparkles,
      color: "bg-blue-500",
    },
    { id: "onsale", label: "Giảm giá", icon: Star, color: "bg-yellow-500" },
    { id: "like", label: "Yêu thích", icon: Heart, color: "bg-pink-500" },
  ];

  // Logic Highlight Tags
  const getRelevantTagIds = () => {
    const relevant: Set<string> = new Set();
    for (const hotel of searchResults) {
      if (
        hotel.amenities?.some((a: string) =>
          ["beach-view", "sea-view"].includes(a),
        )
      )
        relevant.add("beach");
      if (hotel.amenities?.some((a: string) => a === "mountain-view"))
        relevant.add("mountain");
      if (hotel.amenities?.some((a: string) => a === "city-view"))
        relevant.add("city");
    }
    return relevant;
  };
  const relevantTagIds = getRelevantTagIds();

  // --- RENDER UI ---
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 relative">
      <BackgroundBeams />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* === CỘT TRÁI (SEARCH TOOLS) === */}
          <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-8 lg:self-start">
            {/* 1. VISUAL SEARCH CARD */}
            <div className="bg-gray-900/20 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Upload className="text-blue-400" /> AI Visual Search
              </h2>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleImageUpload(e.dataTransfer.files[0] as File);
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
                    : "border-gray-600 hover:border-gray-500"
                }`}
                onClick={() => document.getElementById("img-up")?.click()}
              >
                <Upload size={40} className="mx-auto mb-4 text-gray-500" />
                <p className="text-gray-300 mb-2">Kéo ảnh vào đây</p>
                <p className="text-xs text-gray-500">
                  Hoặc nhấp để chọn ảnh từ máy
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="img-up"
                  onChange={(e) =>
                    e.target.files &&
                    handleImageUpload(e.target.files[0] as File)
                  }
                />
              </div>

              {imagePreview && (
                <div className="mt-6 relative w-full h-52 rounded-xl overflow-hidden ring-2 ring-blue-500/50 shadow-xl">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-3 right-3 bg-red-600 text-white p-1 rounded-full z-20 hover:scale-110 transition-transform"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* 2. TEXT SEARCH CARD */}
            <div className="bg-gray-900/20 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Search className="text-purple-400" /> Tìm bằng mô tả
              </h2>

              {/* Tags suggestion */}
              <div className="bg-gray-800/10 backdrop-blur-md rounded-2xl p-6 border border-gray-700/30 shadow-inner">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Tag size={16} /> Gợi ý chủ đề nhanh
                </h3>
                <div className="flex flex-wrap gap-3">
                  {hotelTags.map((tag) => {
                    const isActive = searchDescription === tag.name;
                    return (
                      <button
                        key={tag.id}
                        disabled={isSearching || isLoadingData}
                        onClick={() => {
                          setSearchDescription(tag.name);
                          handleSearch(tag.query);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase transition-all duration-300
                          ${isActive ? `${tag.color} text-white shadow-lg scale-105` : "bg-gray-700/40 text-gray-400 grayscale hover:grayscale-0 hover:bg-gray-700 hover:text-white"}
                          disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isSearching && isActive ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <tag.icon size={14} />
                        )}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Input */}
              <div className="space-y-4 mt-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Bạn muốn nghỉ dưỡng ở đâu..."
                    value={searchDescription}
                    onChange={(e) => setSearchDescription(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full px-4 py-3.5 bg-gray-900/20 backdrop-blur-sm border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-white placeholder:text-gray-400"
                    disabled={isLoadingData}
                  />
                  <Sparkles
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400/50"
                  />
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={isSearching || isLoadingData}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSearching || isLoadingData ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {isLoadingData
                        ? "Đang tải dữ liệu..."
                        : "AI đang phân tích..."}
                    </>
                  ) : (
                    <>
                      <Search size={20} /> Khám phá ngay
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* === CỘT PHẢI (RESULTS) === */}
          <div className="lg:col-span-3 space-y-8">
            {/* 3. RELATED TAGS HIGHLIGHT */}
            <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-800 shadow-inner">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Tag size={16} /> Các chủ đề tìm kiếm liên quan
              </h3>
              <div className="flex flex-wrap gap-3">
                {hotelTags.map((tag) => {
                  const isActive = searchDescription === tag.name;
                  const isRelevant = relevantTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      disabled={isSearching}
                      onClick={() => {
                        setSearchDescription(tag.name);
                        handleSearch(tag.query);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase transition-all duration-300
                        ${isActive || isRelevant ? `${tag.color} text-white shadow-lg scale-105 ring-2 ring-white/20` : "bg-gray-700/40 text-gray-400 grayscale hover:grayscale-0 hover:bg-gray-700 hover:text-white"}
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSearching && isActive ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <tag.icon size={14} />
                      )}
                      {tag.name}
                      {isRelevant && !isActive && (
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. RESULT GRID */}
            <div className="border border-gray-700/50 bg-gray-800/30 rounded-2xl p-6 backdrop-blur-md ">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <h2 className="text-2xl font-black">
                  Kết quả{" "}
                  <span className="text-blue-400 ml-2">
                    {searchResults.length}
                  </span>
                </h2>
                <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        activeFilter === f.id
                          ? `${f.color} text-white`
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <f.icon size={14} /> {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingData ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <p>Đang đồng bộ dữ liệu khách sạn...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((hotel) => (
                    <Link
                      key={hotel.id}
                      href={`/hotels/${hotel.id}`} // Đảm bảo route này tồn tại trong Client App
                      className="group bg-gray-800/40 rounded-2xl overflow-hidden border border-gray-800 hover:border-blue-500/50 transition-all block"
                    >
                      <div className="relative w-full h-44 overflow-hidden">
                        <Image
                          src={hotel.image}
                          alt={hotel.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-blue-600/80 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold">
                          Khớp: {Math.round((hotel.score || 0.9) * 100)}%
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-sm line-clamp-1 group-hover:text-blue-400">
                          {hotel.name}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-2 mb-3">
                          {hotel.amenities?.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-700/50 text-[9px] text-gray-400 rounded-md border border-gray-600"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-auto">
                          <span className="text-blue-400 font-black text-xs">
                            {hotel.price}
                          </span>
                          <span className="text-[9px] font-bold uppercase text-gray-500">
                            Chi tiết →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
