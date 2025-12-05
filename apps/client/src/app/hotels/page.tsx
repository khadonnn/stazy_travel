// File: app/hotels/page.tsx (Server Component)

import StayPage from '@/pages/StayPage';
import api from '@/lib/api/axios'; // Dùng API hoặc fetch() trực tiếp
import { mapStay } from '@/lib/mappers/listings'; // Hàm map data
import type { StayDataType } from '@/types/stay';
import { Suspense } from 'react';

// Chuyển thành async function để Fetch data trên Server
const HotelsPage = async () => {
    let initialStays: StayDataType[] = [];

    try {
        // 1. FETCH DATA TRÊN SERVER TRƯỚC
        const res = await api.get('/hotels');

        // 2. CHUẨN HÓA DATA TRÊN SERVER
        initialStays = res.data.data.map(mapStay);
    } catch (error) {
        console.error('Lỗi Server Fetching data:', error);
        // Có thể xử lý lỗi hoặc trả về mảng rỗng
    }

    return (
        // 3. TRUYỀN DATA ĐÃ TẢI XUỐNG CLIENT COMPONENT
        // Bọc trong Suspense để hiển thị Loading nếu cần
        <Suspense fallback={<div>Đang tải bộ lọc...</div>}>
            <StayPage />
        </Suspense>
    );
};

export default HotelsPage;
