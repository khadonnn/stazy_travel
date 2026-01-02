"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import StayCard from "@/components/StayCard";
import { StayFilter } from "@/components/StayFilter";
import PaginationCus from "@/components/PaginationCus";
import { HotelFrontend } from "@repo/types";

// Định nghĩa kiểu dữ liệu trả về từ API
interface HotelApiResponse {
  data: HotelFrontend[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const API_URL =
  process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL || "http://localhost:8000";
const ITEMS_PER_PAGE = 8;

export default function StayPage() {
  // 1. Hook quản lý URL
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 2. State lưu dữ liệu
  const [stays, setStays] = useState<HotelFrontend[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Lấy giá trị hiện tại từ URL (để truyền xuống Pagination/Filter)
  const currentPage = Number(searchParams?.get("page")) || 1;

  // ------------------- GỌI API KHI URL THAY ĐỔI -------------------
  useEffect(() => {
    const fetchStays = async () => {
      setLoading(true);
      setError(null);

      try {
        // A. Lấy tham số từ URL
        const params = new URLSearchParams(searchParams?.toString());

        const sortBy = params.get("sort_by");
        const sortOrder = params.get("sort_order");

        // B. Mapping: Chuyển đổi tham số Sort của Frontend -> Backend
        let backendSortParam: string | undefined = undefined;

        switch (sortBy) {
          case "price":
            backendSortParam = sortOrder === "asc" ? "price_asc" : "price_desc";
            break;
          case "saleOff":
            backendSortParam =
              sortOrder === "asc" ? "saleOff_asc" : "saleOff_desc";
            break;
          case "viewCount":
            backendSortParam = "viewCount";
            break;
          case "reviewCount":
            backendSortParam = "reviewCount";
            break;
          default:
            backendSortParam = undefined;
            break;
        }

        // C. Gọi API
        const response = await axios.get<HotelApiResponse>(
          `${API_URL}/hotels`,
          {
            params: {
              page: currentPage,
              limit: ITEMS_PER_PAGE,

              // Tham số quan trọng: Sort đã chuẩn hóa
              sort: backendSortParam,

              // Các bộ lọc khác (Lấy trực tiếp từ URL)
              search: params.get("search"),
              category: params.get("category"),
              price_min: params.get("price_min"),
              price_max: params.get("price_max"),
              bedrooms: params.get("bedrooms"),
            },
          }
        );

        // D. Cập nhật State
        const { data, pagination } = response.data;
        setStays(data);
        setTotalPages(pagination.totalPages);

        console.log(`✅ Fetched ${data.length} items. Page: ${currentPage}`);
      } catch (err: any) {
        console.error("❌ Error fetching hotels:", err);
        setError("Không thể tải dữ liệu khách sạn.");
        setStays([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStays();

    // ⚠️ QUAN TRỌNG: Dependency là [searchParams]
    // Bất cứ khi nào URL thay đổi (trang, lọc, sort), useEffect sẽ chạy lại
  }, [searchParams, currentPage]);

  // ------------------- XỬ LÝ CHUYỂN TRANG -------------------
  const handlePageChange = useCallback(
    (page: number) => {
      // Tạo params mới dựa trên params hiện tại (để giữ lại filter search/category...)
      const params = new URLSearchParams(searchParams?.toString());
      params.set("page", page.toString());

      // Đẩy URL mới -> Trigger useEffect ở trên
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // ------------------- XỬ LÝ FILTER -------------------
  // Hàm này để trống vì Filter Component (StayFilter) đã tự xử lý việc push URL
  const handleFilterChange = useCallback((_data: HotelFrontend[]) => {
    // Không làm gì cả
  }, []);

  // ------------------- RENDER -------------------
  return (
    <div className="space-y-6 px-4 mx-auto w-full mt-20">
      {/* Truyền stays vào chỉ để tính maxPrice nếu cần, ko dùng để filter client-side nữa */}
      <StayFilter data={stays} onFilter={handleFilterChange} />

      {loading ? (
        <div className="flex justify-center h-64 items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      ) : (
        <>
          {stays.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              Không tìm thấy khách sạn nào phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stays.map((stay) => (
                <StayCard key={stay.id} data={stay as any} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <PaginationCus
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
