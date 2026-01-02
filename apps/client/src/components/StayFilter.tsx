"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ArrowDown,
  RotateCcw,
  SlidersHorizontal,
  Search,
} from "lucide-react";
import { debounce } from "lodash";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import type { HotelFrontend } from "@repo/types";

// Props bây giờ không cần onFilter nữa, và data chỉ dùng để tính maxPrice (nếu cần)
interface Props {
  data?: HotelFrontend[];
  onFilter?: (data: HotelFrontend[]) => void;
}

type SortByField = "saleOff" | "viewCount" | "reviewCount" | "price";

export const StayFilter: React.FC<Props> = ({ data = [] }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Lấy giá trị từ URL
  const currentCategory = searchParams?.get("category") || "";
  const currentPriceMin = Number(searchParams?.get("price_min")) || 0;
  const currentPriceMax = Number(searchParams?.get("price_max")) || 10000000; // Mặc định 10tr nếu ko có
  const currentSearchTerm = searchParams?.get("search") || "";
  const currentBedrooms = searchParams?.get("bedrooms") || "";
  const currentSortBy = searchParams?.get("sort_by") as SortByField | null;
  const currentSortOrder =
    (searchParams?.get("sort_order") as "asc" | "desc") || "desc";

  const [searchTermInput, setSearchTermInput] = useState(currentSearchTerm);

  // Đồng bộ input search khi URL đổi (ví dụ user bấm Back)
  useEffect(() => {
    setSearchTermInput(currentSearchTerm);
  }, [currentSearchTerm]);

  // ------------------- HÀM UPDATE URL CHUNG -------------------
  // Đây là hàm quan trọng nhất: Update URL và luôn RESET VỀ PAGE 1
  const updateUrl = useCallback(
    (params: URLSearchParams) => {
      params.set("page", "1"); // ⚠️ QUAN TRỌNG: Lọc/Sort là phải về trang 1
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router]
  );

  // ------------------- XỬ LÝ SỰ KIỆN -------------------

  // 1. Xử lý Search Text
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        const params = new URLSearchParams(searchParams?.toString());
        if (value) params.set("search", value);
        else params.delete("search");
        updateUrl(params);
      }, 500),
    [searchParams, updateUrl]
  );

  const handleSearchChange = (value: string) => {
    setSearchTermInput(value);
    debouncedSearch(value);
  };

  // 2. Xử lý Sort
  const handleSort = (field: SortByField) => {
    const params = new URLSearchParams(searchParams?.toString());

    // Nếu đang click field cũ thì đảo chiều, nếu field mới thì mặc định desc
    let newOrder = "desc";
    if (currentSortBy === field) {
      newOrder = currentSortOrder === "desc" ? "asc" : "desc";
    }

    params.set("sort_by", field);
    params.set("sort_order", newOrder);
    updateUrl(params);
  };

  // 3. Xử lý Giá
  const handlePriceChange = (value: number[]) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value.length >= 2) {
      const min = value[0];
      const max = value[1];
      if (min !== undefined) params.set("price_min", min.toString());
      if (max !== undefined) params.set("price_max", max.toString());
      updateUrl(params);
    }
  };

  // 4. Xử lý Select (Category, Bedrooms)
  const handleSelectChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    updateUrl(params);
  };

  // 5. Reset
  const handleReset = () => {
    router.push(`${pathname}`, { scroll: false }); // Xóa hết params
    setSearchTermInput("");
  };

  // ------------------- JSX -------------------
  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <h2 className="text-2xl font-semibold">Bộ lọc tìm kiếm</h2>

        {/* Search Input */}
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Tìm khách sạn, địa chỉ..."
            value={searchTermInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Nút Sort */}
        <Button
          variant={currentSortBy === "saleOff" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSort("saleOff")}
          className="gap-2"
        >
          Giảm giá sâu{" "}
          {currentSortBy === "saleOff" &&
            (currentSortOrder === "desc" ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            ))}
        </Button>

        <Button
          variant={currentSortBy === "price" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSort("price")}
          className="gap-2"
        >
          Giá tiền{" "}
          {currentSortBy === "price" &&
            (currentSortOrder === "desc" ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            ))}
        </Button>

        {/* Popover Bộ lọc nâng cao */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Bộ lọc khác
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 space-y-4" align="start">
            {/* Range Giá */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Khoảng giá</h4>
              <Slider
                min={0}
                max={20000000}
                step={500000}
                value={[currentPriceMin, currentPriceMax]}
                onValueChange={handlePriceChange}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{currentPriceMin.toLocaleString()} đ</span>
                <span>{currentPriceMax.toLocaleString()} đ</span>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Loại hình</h4>
              <Select
                value={currentCategory}
                onValueChange={(v) => handleSelectChange("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="1">Khách sạn</SelectItem>
                  <SelectItem value="2">Resort</SelectItem>
                  <SelectItem value="3">Villa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Xóa bộ lọc
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
