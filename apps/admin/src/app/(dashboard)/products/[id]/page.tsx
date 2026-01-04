import { notFound } from 'next/navigation';
import { ProductType } from '@repo/types';
import EditProductForm from './EditProductForm'; // Đảm bảo bạn đã tạo file này cùng thư mục

// Hàm gọi API lấy dữ liệu chi tiết
async function getHotelById(id: string): Promise<ProductType | null> {
    try {
        // Gọi route dành riêng cho Admin (không tăng view)
        // URL backend ví dụ: http://localhost:8000/hotels/admin-view/15
        const res = await fetch(`${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/hotels/admin-view/${id}`, {
            cache: 'no-store', // Luôn lấy data mới nhất, không cache
        });

        if (!res.ok) {
            if (res.status === 404) return null;
            console.error(`Fetch error: ${res.status} ${res.statusText}`);
            return null;
        }

        const json = await res.json();

        // Xử lý trường hợp backend trả về { data: ... } hoặc trả về trực tiếp object
        return json.data || json;
    } catch (error) {
        console.error('Error fetching hotel for admin:', error);
        return null;
    }
}

// Định nghĩa kiểu Props cho Page (Next.js 15)
type PageProps = {
    params: Promise<{ id: string }>; // Tên biến 'id' phải khớp với tên folder [id]
};

export default async function EditProductPage({ params }: PageProps) {
    // 1. Giải nén params (Bắt buộc await ở Next.js 15)
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // 2. Fetch dữ liệu từ Backend
    const hotelData = await getHotelById(id);

    // 3. Nếu không tìm thấy khách sạn -> Trả về trang 404 của Next.js
    if (!hotelData) {
        notFound();
    }

    // 4. Render Form Client và truyền dữ liệu vào
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <EditProductForm initialData={hotelData} />
        </div>
    );
}
