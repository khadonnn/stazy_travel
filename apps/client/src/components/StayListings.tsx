'use client';

import { useState } from 'react';
import StayCard from '@/components/StayCard';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link'; // SỬ DỤNG LINK CỦA NEXT.JS
import PaginationCus from '@/components/PaginationCus';
import api from '@/lib/api/axios'; // Axios instance đã cấu hình
import type { StayDataType, TwMainColor } from '@/types/stay';
import { mapStay } from '@/lib/mappers/listings';
import type { StayApiResponse } from '@/lib/mappers/listings';
import homeStayDataJson from '@/data/jsons/__homeStay.json'; // Dữ liệu mẫu

// SỬ DỤNG REACT QUERY
import { useQuery } from '@tanstack/react-query';

const ITEMS_PER_PAGE = 4;

// 1. TẠO HÀM FETCH CHO REACT QUERY
// Hàm này sẽ fetch data hoặc trả về dữ liệu mẫu nếu có lỗi/đang debug
const fetchStays = async (): Promise<StayDataType[]> => {
    // --- BẬT/TẮT FALLBACK DỮ LIỆU MẪU ---
    // Để force dùng dữ liệu mẫu (như logic cũ của bạn)
    const FORCE_FALLBACK = false;

    const mapStaticStays = () =>
        homeStayDataJson.slice(0, 8).map((hotel) => ({
            id: hotel.id,
            authorId: hotel.authorId || 1,
            date: hotel.date || new Date().toISOString(),
            href: `/hotels`,
            title: hotel.title,
            featuredImage: hotel.featuredImage,
            galleryImgs: hotel.galleryImgs || [hotel.featuredImage],
            description: hotel.description || 'Chưa có mô tả',
            price: hotel.price || 500000,
            address: hotel.address || 'Địa chỉ không xác định',
            category: {
                id: 1,
                name: 'Khách sạn',
                href: '/categories/hotel',
                color: 'blue' as TwMainColor,
            },
            reviewStart: hotel.reviewStart || 4.5,
            reviewCount: hotel.reviewCount || 10,
            commentCount: hotel.commentCount || 5,
            viewCount: hotel.viewCount || 100,
            like: false,
            maxGuests: hotel.maxGuests || 4,
            bedrooms: hotel.bedrooms || 2,
            bathrooms: hotel.bathrooms || 1,
            saleOff: hotel.saleOff || null,
            isAds: hotel.isAds || false,
            map: hotel.map || { lat: 21.0285, lng: 105.8542 },
        }));

    if (FORCE_FALLBACK) {
        console.log('🔄 Sử dụng dữ liệu mẫu cho debug...');
        return mapStaticStays();
    }
    // ------------------------------------

    try {
        console.log('📡 Calling API /hotels...');
        const res = await api.get('/hotels');
        console.log('✅ API Response received.');

        // Giả định cấu trúc response là res.data.data
        const staysWithCategory: StayDataType[] = res.data.data.map(
            (post: StayApiResponse) => mapStay(post),
        );
        return staysWithCategory;
    } catch (error) {
        console.error('❌ Lỗi khi fetch /hotels:', error);
        console.log('🔄 Sử dụng dữ liệu mẫu thay thế...');
        // Fallback to static data upon error
        return mapStaticStays();
    }
};

export default function StayListing() {
    const [currentPage, setCurrentPage] = useState(1);

    // 2. SỬ DỤNG useQuery THAY CHO useState/useEffect và loading/error thủ công
    const {
        data: stays = [],
        isLoading,
        isError,
        error,
    } = useQuery<StayDataType[], Error>({
        queryKey: ['stayListings'],
        queryFn: fetchStays,
        staleTime: 1000 * 60 * 5, // Cache data trong 5 phút
    });

    // 3. LOGIC HIỂN THỊ
    // React Query tự quản lý trạng thái isLoading
    if (isLoading) {
        return <p className='text-center py-10'>Đang tải dữ liệu...</p>;
    }

    if (isError) {
        console.error('Lỗi React Query:', error);
        // Nếu hàm fetchStays đã tự fallback data, isError có thể không kích hoạt
        // Nếu kích hoạt, bạn có thể hiển thị thông báo lỗi rõ ràng hơn ở đây:
        // return <p className='text-center py-10 text-red-500'>Lỗi tải dữ liệu. Đã thử dùng dữ liệu mẫu.</p>;
    }

    // Logic Pagination
    const totalPages = Math.ceil(stays.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentItems = stays.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Đảm bảo trang hiện tại hợp lệ sau khi data load
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
    }

    return (
        <div className='space-y-6 px-4 sm:px-6 md:px-12 sm:space-y-8 mx-auto w-full'>
            <div className='flex items-center justify-between space-x-3'>
                <div className='flex items-center space-x-3'>
                    <h2 className='text-3xl font-semibold'>Nổi bật</h2>
                    <Flame className='inline-block text-red-500 h-8 w-8' />
                </div>
                {/* 4. DÙNG LINK CỦA NEXT.JS */}
                <Link href='/hotels'>
                    <Button variant='link'>Xem tất cả</Button>
                </Link>
            </div>

            {currentItems.length === 0 ? (
                <div className='text-center py-8'>
                    <p className='text-gray-500'>
                        Không có khách sạn nào để hiển thị.
                    </p>
                    <p className='text-sm text-gray-400 mt-2'>
                        Total stays: {stays.length}, Current items:{' '}
                        {currentItems.length}
                    </p>
                </div>
            ) : (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-center'>
                    {currentItems.map((stay) => (
                        <StayCard key={stay.id} data={stay} />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className='flex justify-center mt-8'>
                    <PaginationCus
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
}
