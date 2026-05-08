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
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { cn } from "@/lib/utils/formatPrice";
import { Amenities_demos, type Amenity } from "@/constants/amenities";

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

  // State cho tiện nghi được chọn & tiện nghi động từ kết quả tìm kiếm ảnh
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [allImageAmenities, setAllImageAmenities] = useState<
    { id: string; name: string; amenity: string; icon: any }[]
  >([]);
  const [topImageAmenities, setTopImageAmenities] = useState<
    { id: string; name: string; amenity: string; icon: any }[]
  >([]);
  const [hasSearchedByImage, setHasSearchedByImage] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // URL Backend
  const PRODUCT_API_URL =
    process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || "http://localhost:8000";
  const AI_SERVICE_URL =
    process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8008";

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

  // --- HÀM TRỢ GIÚP: Map amenity key sang tên tiếng Việt ---
  const amenityDisplayName: Record<string, string> = {
    wifi: "Wifi miễn phí",
    parking: "Bãi đỗ xe",
    breakfast: "Bao gồm bữa sáng",
    gym: "Phòng gym",
    spa: "Spa & Massage",
    restaurant: "Nhà hàng",
    "pet-friendly": "Cho phép thú cưng",
    bar: "Quầy bar",
    pool: "Hồ bơi",
    "swimming-pool": "Hồ bơi",
    "beach-view": "View biển",
    "sea-view": "View biển",
    "mountain-view": "View núi",
    "city-view": "View thành phố",
    luxury: "Sang trọng",
    premium: "Cao cấp",
    "air-conditioning": "Điều hòa",
    "hot-tub": "Bồn nước nóng",
    "room-service": "Dịch vụ phòng",
    elevator: "Thang máy",
    laundry: "Giặt ủi",
    "airport-shuttle": "Đưa đón sân bay",
    "free-cancel": "Hủy miễn phí",
    "24h-front-desk": "Lễ tân 24h",
  };

  // --- HÀM TRỢ GIÚP: Trích xuất amenities duy nhất từ kết quả (dùng icon thật từ Amenities_demos) ---
  const extractAmenitiesFromResults = (
    results: any[],
  ): {
    id: string;
    name: string;
    amenity: string;
    icon: any;
  }[] => {
    const uniqueAmenities = new Set<string>();
    for (const hotel of results) {
      if (hotel.amenities) {
        hotel.amenities.forEach((a: string) => uniqueAmenities.add(a));
      }
    }

    return Array.from(uniqueAmenities).map((amenity) => {
      const match = Amenities_demos.find((d) => d.id === amenity);
      return {
        id: amenity,
        name: match?.name || amenityDisplayName[amenity] || amenity,
        amenity,
        icon: match?.icon || Tag,
      };
    });
  };

  // --- HÀM BỔ TRỢ: CẬP NHẬT UI TỪ KẾT QUẢ AI ---
  const updateUIWithResults = (matches: any[], fromImageSearch = false) => {
    console.log("1. Dữ liệu AI trả về (Matches):", matches);
    if (!matches || matches.length === 0) {
      console.warn("❌ AI trả về mảng rỗng!");
      setSearchResults([]);
      if (fromImageSearch) {
        setAllImageAmenities([]);
        setTopImageAmenities([]);
        setHasSearchedByImage(false);
        setShowAllAmenities(false);
      }
      return;
    }
    if (allHotels.length === 0) {
      console.warn("❌ Chưa có dữ liệu allHotels để map!");
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

    // Khi tìm kiếm bằng ảnh → trích xuất amenities từ kết quả
    if (fromImageSearch) {
      // Lọc chỉ lấy khách sạn có score >= 0.9 (tương đồng cao)
      const topHotels = filteredResults.filter(
        (h: any) => (h.score || 0) >= 0.9,
      );
      const allExtracted = extractAmenitiesFromResults(filteredResults);
      const topExtracted = extractAmenitiesFromResults(
        topHotels.length > 0 ? topHotels : filteredResults.slice(0, 3),
      );

      setAllImageAmenities(allExtracted);
      setTopImageAmenities(topExtracted);
      setHasSearchedByImage(true);
      setShowAllAmenities(false);
      // Auto-select amenities từ top hotels
      setSelectedAmenities(topExtracted.map((a) => a.amenity));
    }
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
    } else if (lowerText.includes("wifi")) {
      targetAmenities = ["wifi"];
      matchedTagId = "wifi";
    } else if (lowerText.includes("đỗ xe") || lowerText.includes("parking")) {
      targetAmenities = ["parking"];
      matchedTagId = "parking";
    } else if (
      lowerText.includes("bữa sáng") ||
      lowerText.includes("breakfast")
    ) {
      targetAmenities = ["breakfast"];
      matchedTagId = "breakfast";
    } else if (lowerText.includes("gym") || lowerText.includes("thể hình")) {
      targetAmenities = ["gym"];
      matchedTagId = "gym";
    } else if (lowerText.includes("spa") || lowerText.includes("massage")) {
      targetAmenities = ["spa"];
      matchedTagId = "spa";
    } else if (
      lowerText.includes("nhà hàng") ||
      lowerText.includes("restaurant")
    ) {
      targetAmenities = ["restaurant"];
      matchedTagId = "restaurant";
    } else if (lowerText.includes("thú cưng") || lowerText.includes("pet")) {
      targetAmenities = ["pet-friendly"];
      matchedTagId = "pet";
    } else if (lowerText.includes("bar") || lowerText.includes("quầy bar")) {
      targetAmenities = ["bar"];
      matchedTagId = "bar";
    } else if (
      lowerText.includes("hồ bơi") ||
      lowerText.includes("pool") ||
      lowerText.includes("bơi")
    ) {
      targetAmenities = ["pool", "swimming-pool"];
      matchedTagId = "pool";
    } else if (
      lowerText.includes("sang trọng") ||
      lowerText.includes("luxury") ||
      lowerText.includes("cao cấp")
    ) {
      targetAmenities = ["luxury", "premium"];
      matchedTagId = "luxury";
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
          console.log(" AI trả về matches:", matches);
          updateUIWithResults(matches, true); // fromImageSearch = true
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
      name: "Tắm biển",
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

  // Amenity-based suggestions (dùng icon từ Amenities_demos)
  const amenitySuggestions = [
    "wifi",
    "parking",
    "breakfast",
    "gym",
    "spa",
    "restaurant",
    "pet-friendly",
    "bar",
  ].map((amenityId) => {
    const found = Amenities_demos.find((d) => d.id === amenityId);
    return {
      id: amenityId,
      name: found?.name || amenityId,
      amenity: amenityId,
      icon: found?.icon || Tag,
    };
  });

  const filters = [
    {
      id: "recommend",
      label: "Gợi ý AI",
      icon: Sparkles,
      color: "bg-blue-500",
    },
    { id: "onsale", label: "Giảm giá", icon: Star, color: "bg-yellow-500" },
    {
      id: "topRated",
      label: "Đánh giá cao",
      icon: Heart,
      color: "bg-pink-500",
    },
  ];

  // Filtered results based on activeFilter
  const filteredResults = searchResults.filter((hotel) => {
    if (activeFilter === "recommend") return true; // Show all (AI order)
    if (activeFilter === "onsale") {
      // Check if hotel has sale info from allHotels
      const original = allHotels.find((h) => h.id === hotel.id);
      return original?.saleOff && original.saleOff > 0;
    }
    if (activeFilter === "topRated") {
      return (hotel.rating || 0) >= 4.5;
    }
    return true;
  });

  // Logic: Xác định danh sách tiện nghi hiển thị
  // Nếu đã tìm bằng ảnh → dùng topImageAmenities (hoặc allImageAmenities nếu showAll)
  // Nếu chưa → dùng amenitySuggestions mặc định
  const currentAmenityList = (() => {
    if (!hasSearchedByImage) return amenitySuggestions;
    if (showAllAmenities) return allImageAmenities;
    return topImageAmenities.length > 0 ? topImageAmenities : allImageAmenities;
  })();

  // Logic: Find which amenities exist in current results for suggestions
  const getAvailableAmenities = () => {
    const available: Set<string> = new Set();
    for (const hotel of searchResults) {
      if (hotel.amenities) {
        hotel.amenities.forEach((a: string) => available.add(a));
      }
    }
    return available;
  };
  const availableAmenities = getAvailableAmenities();

  // Logic: Lọc kết quả theo selected amenities
  const getFilteredByAmenities = () => {
    if (selectedAmenities.length === 0) return filteredResults;
    return filteredResults.filter((hotel) =>
      selectedAmenities.some((sa) => hotel.amenities?.includes(sa)),
    );
  };
  const finalDisplayResults = getFilteredByAmenities();

  // Toggle chọn/bỏ chọn amenity
  const toggleAmenity = (amenityKey: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityKey)
        ? prev.filter((a) => a !== amenityKey)
        : [...prev, amenityKey],
    );
  };

  // --- RENDER UI ---
  return (
    <div className="h-screen bg-neutral-950 text-white relative flex flex-col overflow-hidden">
      <BackgroundBeams />
      {/* Top bar - fixed height */}
      <div className="relative z-10 shrink-0 px-4 pt-4 ml-8 mb-2">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 mb-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </div>
      {/* Main content - fill remaining height */}
      <div className="flex-1 overflow-hidden relative z-10">
        <div className="max-w-7xl mx-auto h-full px-4 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
            {/* === CỘT TRÁI (SEARCH TOOLS) - Independent scroll */}
            <div className="lg:col-span-2 space-y-6 overflow-y-auto pb-4 border-r border-white/[0.04] [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.08]">
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
                      className="absolute cursor-pointer top-3 right-3 bg-red-600 text-white p-1 rounded-full z-20 hover:scale-110 transition-transform"
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 animate-pulse"
                    />
                  </div>
                  <button
                    onClick={() => handleSearch()}
                    disabled={isSearching || isLoadingData}
                    className={cn(
                      "relative w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 cursor-pointer",

                      /* Background siêu trong suốt + glassmorphism nhẹ */
                      "bg-white/5 backdrop-blur-lg border border-white/10",
                      "hover:bg-white/8 hover:border-white/20",

                      "text-white overflow-hidden",
                      "transition-all duration-300 active:scale-[0.97]",
                      "disabled:opacity-70 disabled:cursor-not-allowed",
                      "group",
                    )}
                  >
                    {/* Dust / Firefly Container */}
                    <span className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <span
                          key={i}
                          className="dust-particle absolute w-1 h-1 bg-white rounded-full"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `-${Math.random() * 2.5}s`,
                            animationDuration: `${1.8 + Math.random() * 1.2}s`,
                            opacity: Math.random() * 0.7 + 0.3,
                            boxShadow: "0 0 6px #a5b4fc, 0 0 12px #c4d0ff",
                          }}
                        />
                      ))}
                    </span>

                    {/* Content */}
                    {isSearching || isLoadingData ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        {isLoadingData
                          ? "Đang tải dữ liệu..."
                          : "AI đang phân tích..."}
                      </>
                    ) : (
                      <>
                        <Search size={20} />
                        Khám phá ngay
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* === CỘT PHẢI (RESULTS) - Independent scroll */}
            <div className="lg:col-span-3 space-y-6 overflow-y-auto pb-4 [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.08]">
              {/* 3. AMENITY SUGGESTIONS */}
              <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-800 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Tag size={16} className="text-green-400" /> Tiện nghi
                  </h3>
                  {selectedAmenities.length > 0 && (
                    <button
                      onClick={() => setSelectedAmenities([])}
                      className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                    >
                      Bỏ chọn ({selectedAmenities.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentAmenityList.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedAmenities.includes(item.amenity);
                    return (
                      <button
                        key={item.id}
                        disabled={isSearching}
                        onClick={() => {
                          if (hasSearchedByImage) {
                            toggleAmenity(item.amenity);
                          } else {
                            setSearchDescription(item.name);
                            handleSearch(item.name);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border
                        ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/20"
                            : "bg-gray-800/60 text-gray-300 border-gray-600/50 hover:bg-gray-700/80 hover:text-white cursor-pointer"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Icon
                          size={13}
                          className={
                            isSelected ? "text-white" : "text-gray-400"
                          }
                        />
                        <span>{item.name}</span>
                        {isSelected && (
                          <X size={11} className="ml-0.5 opacity-80" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Nút xem toàn bộ + chú thích */}
                {hasSearchedByImage && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-[10px] text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />
                        Tất cả tiện nghi
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                        Đang chọn để lọc
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowAllAmenities(!showAllAmenities);
                      }}
                      className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors underline"
                    >
                      {showAllAmenities
                        ? `Thu gọn (${topImageAmenities.length})`
                        : `Xem toàn bộ (${allImageAmenities.length})`}
                    </button>
                  </div>
                )}
              </div>

              {/* 4. RESULT GRID */}
              <div className="border border-gray-700/50 bg-gray-800/30 rounded-2xl p-6 backdrop-blur-md ">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <h2 className="text-2xl font-black">
                    Kết quả{" "}
                    <span className="text-blue-400 ml-2">
                      {finalDisplayResults.length}
                    </span>
                    {(activeFilter !== "recommend" ||
                      selectedAmenities.length > 0) && (
                      <span className="text-gray-500 text-sm font-normal ml-2">
                        / {searchResults.length}
                      </span>
                    )}
                  </h2>
                  <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800">
                    {filters.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`flex items-center gap-2 px-4 py-2 cursor-pointer rounded-lg text-xs font-bold transition-all ${
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
                    {finalDisplayResults.map((hotel) => (
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
    </div>
  );
}
