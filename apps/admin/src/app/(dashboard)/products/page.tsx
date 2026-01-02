import { DataTable } from '@/app/(dashboard)/bookings/data-table';
import { ProductsTableWrapper } from '@/app/(dashboard)/products/ProductsTableWrapper';
import { HotelColumn } from '@repo/types';

const getData = async (): Promise<HotelColumn[]> => {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/hotels`);
        const data = await res.json();
        return data;
    } catch (error) {
        console.log('Failed to fetch hotels:', error);
        return [];
    }
};

const ProductsPage = async () => {
    const data = await getData();
    return (
        <div className="">
            {/* <div className="bg-secondary mb-8 rounded-md px-4 py-2">
                <h1 className="font-semibold">All hotels</h1>
            </div> */}
            <ProductsTableWrapper initialData={data} />
        </div>
    );
};
export default ProductsPage;
