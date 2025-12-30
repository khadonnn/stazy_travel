'use client';

import React from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import {
    paymentFormSchema,
    PaymentMethod,
  
} from '@/types/cart';
import type { PaymentFormInputs, FullPaymentData } from '@/types/payment';
import { useCartStore } from '@/store/useCartStore';
import { useBookingStore } from '@/store/useBookingStore';
import z from 'zod';

const MOCK_PAYMENT_DATA: PaymentFormInputs = {
    cardHolder: 'NGUYEN VAN A',
    cardNumber: '4111 1111 1111 1111',
    expirationDate: '12/28',
    cvv: '123',
    paymentMethod: PaymentMethod.CreditCard,
};

const paymentLogos = [
    { src: '/visa.svg', alt: PaymentMethod.CreditCard, label: 'Thẻ tín dụng' },
    { src: '/momo.svg', alt: PaymentMethod.MOMO, label: 'MOMO' },
    { src: '/vnpay.svg', alt: PaymentMethod.VNPAY, label: 'VNPAY' },
    { src: '/stripe.svg', alt: PaymentMethod.STRIPE, label: 'Stripe' },
    { src: '/zalo.svg', alt: PaymentMethod.ZaloPay, label: 'ZaloPay' },
];

// Không cần Props nữa
const PaymentForm: React.FC = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isSignedIn, isLoaded } = useUser();
    
    const { setPaymentData, items, clearCart } = useCartStore();
    
    // 🔥 LẤY BOOKING DETAILS TỪ STORE (Dữ liệu form bước 2)
    const { checkInDate, checkOutDate, bookingDetails } = useBookingStore();

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<z.infer<typeof paymentFormSchema>>({

    resolver: zodResolver(paymentFormSchema as any ),

    defaultValues: MOCK_PAYMENT_DATA,
    });

    const handlePaymentForm: SubmitHandler<PaymentFormInputs> = async (data) => {
        setPaymentData(data);

        if (!isLoaded) return;

        if (!isSignedIn) {
            toast.error('Vui lòng đăng nhập để tiếp tục thanh toán!');
            const redirectUrl = encodeURIComponent(pathname || '/cart');
            router.push(`/sign-in?redirect_url=${redirectUrl}`);
            return;
        }

        // Kiểm tra xem đã có thông tin đặt phòng chưa
        if (!bookingDetails) {
            toast.error("Thiếu thông tin khách hàng. Vui lòng quay lại bước trước.");
            router.push('/cart?step=2');
            return;
        }

        const fullData: FullPaymentData = {
            user: {
                id: user.id,
                // Ưu tiên lấy từ Clerk, fallback sang dữ liệu nhập tay
                email: user.primaryEmailAddress?.emailAddress || bookingDetails.email,
                name: bookingDetails.name || user.fullName || "Khách hàng",
                phone: bookingDetails.phone || user.primaryPhoneNumber?.phoneNumber || "",
                // 🔥 Lấy địa chỉ từ Store
                address: `${bookingDetails.address}, ${bookingDetails.city}`,
                avatar: user.imageUrl,
            },
            items,
            paymentData: data,
            totalAmount: items.reduce(
                (sum, item) => sum + item.price * (item.nights || 1),
                0,
            ),
            checkInDate: checkInDate!,
            checkOutDate: checkOutDate!,
            currency: 'VND',
            timestamp: new Date().toISOString(),
        };

        console.log('📦 FullPaymentData gửi API:', fullData);

        try {
            const toastId = toast.loading('Đang xử lý thanh toán...');
            
            const { paymentApi } = await import('@/lib/api/payment');
            const result = await paymentApi.processBooking(fullData);

            console.log('Payment result:', result);

            clearCart();
            // Có thể reset store booking nếu muốn, hoặc để sau khi xem history
            // const { resetStore } = useBookingStore.getState();
            // resetStore();

            toast.success('Thanh toán thành công! Đang chuyển hướng...', { id: toastId });

            setTimeout(() => {
                router.push('/my-bookings');
            }, 1500);
        } catch (error: any) {
            console.error('Payment error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Thanh toán thất bại!';
            toast.error(errorMessage);
        }
    };

    return (
        <form className='flex flex-col gap-6' onSubmit={handleSubmit(handlePaymentForm)}>
            <div className='flex flex-col gap-1'>
                <label className='text-md text-gray-500 font-medium'>Họ và tên trên thẻ</label>
                <input
                    {...register('cardHolder')}
                    placeholder='Nhập họ và tên'
                    className='bg-transparent border-b border-gray-300 py-2 outline-none text-md'
                />
                {errors.cardHolder && <p className='text-xs text-red-500'>{errors.cardHolder.message}</p>}
            </div>

            <div className='flex flex-col gap-1'>
                <label className='text-md text-gray-500 font-medium'>Số thẻ</label>
                <input
                    {...register('cardNumber')}
                    placeholder='1234 5678 ...'
                    className='bg-transparent border-b border-gray-300 py-2 outline-none text-md'
                />
                {errors.cardNumber && <p className='text-xs text-red-500'>{errors.cardNumber.message}</p>}
            </div>

            <div className="flex gap-4">
                <div className='flex flex-col gap-1 flex-1'>
                    <label className='text-md text-gray-500 font-medium'>Hạn sử dụng</label>
                    <input
                        {...register('expirationDate')}
                        placeholder='MM/YY'
                        className='bg-transparent border-b border-gray-300 py-2 outline-none text-md'
                    />
                    {errors.expirationDate && <p className='text-xs text-red-500'>{errors.expirationDate.message}</p>}
                </div>
                <div className='flex flex-col gap-1 flex-1'>
                    <label className='text-md text-gray-500 font-medium'>CVV</label>
                    <input
                        {...register('cvv')}
                        placeholder='123'
                        className='bg-transparent border-b border-gray-300 py-2 outline-none text-md'
                    />
                    {errors.cvv && <p className='text-xs text-red-500'>{errors.cvv.message}</p>}
                </div>
            </div>

            <div className='flex flex-col gap-3'>
                <label className='text-md text-gray-500 font-medium'>Phương thức thanh toán</label>
                <Select
                    onValueChange={(value) => setValue('paymentMethod', value as PaymentFormInputs['paymentMethod'])}
                    defaultValue={PaymentMethod.CreditCard}
                >
                    <SelectTrigger className='border-b border-gray-300 bg-transparent'>
                        <SelectValue placeholder='Chọn phương thức' />
                    </SelectTrigger>
                    <SelectContent>
                        {paymentLogos.map((logo) => (
                            <SelectItem key={logo.alt} value={logo.alt}>
                                <div className='flex items-center gap-2'>
                                    <Image src={logo.src} alt={logo.label} width={30} height={15} style={{ width: '30px', height: 'auto' }} />
                                    <span>{logo.label}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.paymentMethod && <p className='text-xs text-red-500'>{errors.paymentMethod.message}</p>}
            </div>

            <button
                type='submit'
                className='w-full bg-green-600 hover:bg-green-700 transition-all text-white p-3 rounded-lg flex items-center justify-center gap-2 font-medium cursor-pointer'
            >
                Thanh toán <ShoppingCart className='w-4 h-4' />
            </button>
        </form>
    );
};

export default PaymentForm;