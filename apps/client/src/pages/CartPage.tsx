'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2 } from 'lucide-react';
import StayCard from '@/components/StayCard';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/store/useCartStore';
import PaymentForm from '@/components/PaymentForm';
import BookingForm from '@/components/BookingForm';
import type { BookingFormInputs } from '@/types/cart';
import { formatPrice } from '@/lib/utils/formatPrice';

const steps = [
    { id: 1, title: 'Đặt phòng' },
    { id: 2, title: 'Thông tin khách hàng' },
    { id: 3, title: 'Phương thức thanh toán' },
];

const CartPage = () => {
    // 1. Fix lỗi Hydration
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { items, removeItem } = useCartStore();

    // Tính toán an toàn
    const totalGuests = items ? items.reduce((sum, item) => sum + (item.totalGuests || 1), 0) : 0;
    const totalAmount = items ? items.reduce((sum, item) => sum + (item.price || 0) * (item.nights || 1), 0) : 0;

    const searchParams = useSearchParams();
    const stepParam = searchParams?.get('step');
    const activeStep = stepParam ? parseInt(stepParam) : 1;

    const [bookingForm, setBookingForm] = React.useState<BookingFormInputs | null>(null);

    // Nếu chưa mount xong client, return null hoặc loading spinner
    if (!isMounted) return null;

    return (
        // Thêm min-h-screen để footer luôn ở dưới, z-index thấp
        <div className='flex flex-col gap-8 items-center py-20 max-w-5xl mx-auto px-4 relative z-0 min-h-screen'>
            <h1 className='text-2xl font-semibold'>
                Khách sạn đang thanh toán
            </h1>

            {/* Steps Indicator */}
            <div className='flex flex-col lg:flex-row items-center gap-8 lg:gap-16 w-full justify-center'>
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={`flex items-center gap-2 border-b-2 pb-4 px-2 transition-colors duration-300 ${
                            activeStep === step.id
                                ? 'border-gray-800'
                                : 'border-gray-200'
                        }`}
                    >
                        <div
                            className={`w-6 h-6 rounded-full text-white p-4 flex items-center justify-center text-sm font-bold transition-colors duration-300 ${
                                activeStep === step.id
                                    ? 'bg-gray-800'
                                    : 'bg-gray-400'
                            }`}
                        >
                            {step.id}
                        </div>
                        <p
                            className={`text-sm font-medium transition-colors duration-300 ${
                                activeStep === step.id
                                    ? 'text-gray-800'
                                    : 'text-gray-400'
                            }`}
                        >
                            {step.title}
                        </p>
                    </div>
                ))}
            </div>

            {/* Main content */}
            <div className='w-full flex flex-col lg:flex-row gap-8 lg:gap-16 items-start'>
                
                {/* LEFT COLUMN: Cart Items / Forms */}
                {/* Thêm h-fit để chiều cao tự động theo nội dung */}
                <div className='w-full lg:w-7/12 p-6 rounded-xl border border-gray-100 shadow-lg bg-white h-fit relative z-10'>
                    {items.length === 0 ? (
                        <div className='text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4 py-8'>
                            <p className="text-center sm:text-left">Bạn chưa đặt phòng. Hãy đặt phòng để tiếp tục!</p>
                            
                            {/* 🔥 FIX NÚT BACK: Dùng Button asChild để đảm bảo style chuẩn và click được */}
                            <Button variant="outline" className="gap-2 hover:bg-red-50 hover:text-red-600 border-red-200" asChild>
                                <Link href='/'> {/* Đổi về trang chủ '/' hoặc '/stay' tùy route của bạn */}
                                    <Undo2 className='w-4 h-4' /> Quay lại chọn phòng
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-6'>
                            {activeStep === 1 ? (
                                items.map((item) => (
                                    <div
                                        key={item.id}
                                        className='relative flex flex-col sm:flex-row justify-between items-start p-4 border border-gray-200 rounded-xl shadow-sm gap-4 bg-white hover:shadow-md transition-shadow'
                                    >
                                        {/* Wrapper cho StayCard */}
                                        <div className="flex-1 w-full">
                                            <StayCard data={item} size='default' />
                                        </div>
                                        
                                        {/* 🔥 FIX NÚT XÓA: Đặt absolute top-right trên mobile cho gọn, static trên desktop */}
                                        <div className="absolute top-2 right-2 sm:static sm:mt-2">
                                            <Button
                                                variant='ghost'
                                                size="icon"
                                                className='text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 rounded-full'
                                                onClick={(e) => {
                                                    e.preventDefault(); 
                                                    e.stopPropagation();
                                                    // console.log("Deleting item:", item.id); // Uncomment để debug nếu cần
                                                    removeItem(item.id);
                                                }}
                                                title="Xóa phòng này"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : activeStep === 2 ? (
                                <BookingForm setBookingForm={setBookingForm} />
                            ) : activeStep === 3 && bookingForm ? (
                                <PaymentForm />
                            ) : (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                                    Vui lòng hoàn thành thông tin khách hàng ở bước trước để thanh toán.
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* RIGHT COLUMN: Review/Summary */}
                <div className='w-full lg:w-5/12 border border-gray-100 shadow-lg p-6 rounded-xl flex flex-col gap-6 bg-white h-fit sticky top-24 z-10'>
                    <h3 className="text-xl font-semibold mb-2">Tóm tắt đơn hàng</h3>
                    
                    <div className='space-y-6'>
                        {items.map((item) => (
                            <div key={item.id} className='overflow-hidden space-y-4'>
                                <div className='w-full h-48 overflow-hidden rounded-lg relative bg-gray-100'>
                                    <Image
                                        src={item.galleryImgs?.[0] || '/placeholder.jpg'} // Fallback image chuẩn hơn
                                        alt={item.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                        className='object-cover hover:scale-105 transition-transform duration-500'
                                    />
                                </div>
                                <div>
                                    <h2 className='text-lg font-semibold line-clamp-2 leading-tight'>{item.title}</h2>
                                    <p className="text-sm text-gray-500 mt-1">{item.address}</p>
                                </div>
                                <Separator />
                                <div className='space-y-3 pb-2 w-full text-sm'>
                                    <div className='flex justify-between text-neutral-600'>
                                        <span>Đơn giá</span>
                                        <span className="font-medium">{formatPrice(item.price)}đ</span>
                                    </div>
                                    <div className='flex justify-between text-neutral-600'>
                                        <span>Thời gian lưu trú</span>
                                        <span className="font-medium">{item.nights} đêm</span>
                                    </div>
                                    <div className='flex justify-between text-neutral-600'>
                                        <span>Phí dịch vụ</span>
                                        <span className="text-green-600 font-medium">Miễn phí</span>
                                    </div>
                                </div>
                                <Separator />
                            </div>
                        ))}
                        
                        {/* Summary Footer */}
                        {(items.length > 0) ? (
                            <div className="pt-2 space-y-4">
                                <div className='flex justify-between items-center'>
                                    <span className="text-neutral-600">Tổng khách</span>
                                    <span className="font-medium">{totalGuests} người</span>
                                </div>
                                
                                <div className='flex justify-between items-end'>
                                    <span className="text-lg font-semibold">Tổng cộng</span>
                                    <span className="text-2xl font-bold text-primary">{formatPrice(totalAmount)}đ</span>
                                </div>

                                {/* Nút chuyển step 1 -> 2 */}
                                {activeStep === 1 && (
                                    <Button className='w-full py-6 text-lg font-medium shadow-md transition-transform active:scale-[0.98]' asChild>
                                        <Link href={`/cart?step=${activeStep + 1}`}>
                                            Tiếp tục thanh toán
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-10">
                                <p>Giỏ hàng trống</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;