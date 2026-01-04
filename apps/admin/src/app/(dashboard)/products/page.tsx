import { ProductType } from '@repo/types';
import { ProductsTableWrapper } from './ProductsTableWrapper';

// Định nghĩa kiểu trả về bao gồm cả thông tin phân trang
type ProductResponse = {
    data: ProductType[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number; // API thường trả về cái này
    };
};

// 1. Nhận params page và limit
const getData = async (page: number, limit: number): Promise<ProductResponse> => {
    try {
        // Truyền query params lên backend
        const res = await fetch(`${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/hotels?page=${page}&limit=${limit}`, {
            cache: 'no-store',
        });
        const json = await res.json();

        // Đảm bảo trả về đúng cấu trúc.
        // Nếu API backend trả về khác, hãy mapping lại tại đây.
        return {
            data: json.data || [],
            pagination: json.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
        };
    } catch (error) {
        console.log('Failed to fetch hotels:', error);
        return {
            data: [],
            pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        };
    }
};

// 2. Nhận searchParams từ URL (Ví dụ: /products?page=2&limit=20)
type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const ProductsPage = async (props: Props) => {
    const searchParams = await props.searchParams;
    // Lấy page và limit từ URL, mặc định là 1 và 10
    const page = Number(searchParams.page) || 1;
    const limit = Number(searchParams.limit) || 10;

    const { data, pagination } = await getData(page, limit);

    return (
        <div className="">
            <ProductsTableWrapper
                initialData={data}
                // Truyền thêm thông tin phân trang xuống Client
                pageCount={pagination.totalPages}
                totalItems={pagination.total}
                pageIndex={page - 1} // TanStack Table đếm từ 0, API thường đếm từ 1
                pageSize={limit}
            />
        </div>
    );
};
export default ProductsPage;
