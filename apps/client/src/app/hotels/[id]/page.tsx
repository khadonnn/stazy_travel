// File: app/hotels/[id]/page.tsx
import StayDetailPage from '@/pages/StayDetailPage';
import { notFound } from 'next/navigation';

// ✅ Thêm `async`
const DetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    // ✅ Await để lấy giá trị thật của params
    const { id } = await params;

    // Kiểm tra hợp lệ
    if (!id || isNaN(Number(id))) {
        return notFound();
    }

    // Truyền id (string hoặc number) xuống component
    return <StayDetailPage params={{ id: Number(id) }} />;
};

export default DetailPage;
