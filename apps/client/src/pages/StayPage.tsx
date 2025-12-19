'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import StayCard from '@/components/StayCard';
import { StayFilter } from '@/components/StayFilter';
import PaginationCus from '@/components/PaginationCus';
import { mapStay, type StayApiResponse } from '@/lib/mappers/listings';
import type { StayDataType } from '@/types/stay';
// import api from '@/lib/api/axios'; // Đã loại bỏ Axios khi dùng Mock Data

// 1. IMPORT MOCK DATA TRỰC TIẾP
import MockData from '@/data/jsons/__homeStay.json';

const ITEMS_PER_PAGE = 8;

export default function StayPage() {
    const searchParams = useSearchParams();

    const [allStays, setAllStays] = useState<StayDataType[]>([]);
    const [filteredData, setFilteredData] = useState<StayDataType[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // ------------------- LOGIC TẢI DỮ LIỆU MOCK -------------------

    useEffect(() => {
        const loadMockStays = async () => {
            setLoading(true);
            try {
                // Giả lập độ trễ mạng để thấy hiệu ứng loading
                await new Promise((resolve) => setTimeout(resolve, 500));

                // ÉP KIỂU TRỰC TIẾP sang mảng StayApiResponse[]
                // Lưu ý: Dữ liệu mock được giả định là mảng []
                const rawStays: StayApiResponse[] =
                    MockData as unknown as StayApiResponse[];

                const stays: StayDataType[] = rawStays.map(
                    (item: StayApiResponse) => mapStay(item),
                );

                setAllStays(stays);
                setFilteredData(stays);

                console.log(
                    '✅ Dữ liệu Mock đã được tải thành công:',
                    stays.length,
                    'mục',
                );
            } catch (error) {
                console.error(
                    '❌ Lỗi khi tải hoặc xử lý Mock Data (có thể do cấu trúc file):',
                    error,
                );
                // Đảm bảo không bị crash nếu mock data không tải được
                setAllStays([]);
                setFilteredData([]);
            } finally {
                setLoading(false);
            }
        };

        loadMockStays();
    }, []);

    // ------------------- LOGIC LỌC, PHÂN TRANG VÀ INJECT ADS -------------------

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredData.slice(start, end);
    }, [filteredData, currentPage]);

 const injectAds = useCallback((items: StayDataType[]): StayDataType[] => {
        const ads = items.filter((item) => item.isAds);
        const normal = items.filter((item) => !item.isAds);
        const result: StayDataType[] = [];
        let adIndex = 0;

        // 1. CHÈN AD ĐẦU TIÊN
        if (adIndex < ads.length) {
            // Thêm ! để khẳng định ads[adIndex] không phải undefined
            result.push(ads[adIndex]!); 
            adIndex++;
        }

        // 2. CHÈN AD XEN KẼ
        normal.forEach((item, idx) => {
            result.push(item);
            if ((idx + 1) % 5 === 0 && adIndex < ads.length) {
                // Thêm ! để khẳng định ads[adIndex] không phải undefined
                result.push(ads[adIndex]!); 
                adIndex++;
            }
        });

        // 3. CHÈN AD CÒN LẠI
        while (adIndex < ads.length) {
            // Thêm ! để khẳng định ads[adIndex] không phải undefined
            result.push(ads[adIndex]!); 
            adIndex++;
        }

        return result;
    }, []);

    const displayedItems = useMemo(
        () => injectAds(currentItems),
        [currentItems, injectAds],
    );

    // Hàm nhận dữ liệu đã được lọc/sắp xếp từ StayFilter
    const handleFilterChange = useCallback((data: StayDataType[]) => {
        setFilteredData(data);
        setCurrentPage(1);
    }, []);
const handlePageChange = useCallback(
    (page: number) => {
        //  Bảo vệ: không bao giờ set page ngoài [1, totalPages]
        const safePage = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(safePage);
    },
    [totalPages], // ← ✅ Rất quan trọng: khi totalPages thay đổi, callback được tạo lại
);
    // ------------------- RENDER -------------------

    return (
        <div className='space-y-6 px-4 sm:px-6 md:px-12 sm:space-y-8 mx-auto w-full'>
            <div className='flex items-center justify-between'>
                <h2 className='text-3xl font-semibold'>
                    Danh sách khách sạn ({filteredData.length})
                </h2>
            </div>

            {/* Truyền allStays (mock data đã tải) vào bộ lọc */}
            <StayFilter data={allStays} onFilter={handleFilterChange} />

            {loading ? (
                <div className='flex justify-center items-center h-64'>
                    <motion.div
                        className='w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full'
                        animate={{ rotate: 360 }}
                        transition={{
                            repeat: Infinity,
                            duration: 1,
                            ease: 'linear',
                        }}
                    />
                </div>
            ) : (
                <>
                    {/* Hiển thị thông báo nếu không có dữ liệu */}
                    {filteredData.length === 0 && (
                        <div className='text-center py-10 text-neutral-500'>
                            Không tìm thấy kết quả phù hợp với bộ lọc.
                        </div>
                    )}

                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-center'>
                        {displayedItems.map((stay) => (
                            <StayCard key={stay.id} data={stay} />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className='flex justify-center mt-8'>
                            <PaginationCus
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => setCurrentPage(page)}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
