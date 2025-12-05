import React from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
// Dynamic import will be used instead

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { paymentFormSchema, PaymentMethod } from '@/types/cart';
import type { PaymentFormInputs, FullPaymentData } from '@/types/payment';
import { useCartStore } from '@/store/useCartStore'; //  import store
import { useBookingStore } from '@/store/useBookingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation'; 
import z from 'zod';
type FormField = {
    id: keyof PaymentFormInputs;
    label: string;
    placeholder: string;
    type: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; // optional
};
// Cấu hình field nhập liệu
const MOCK_PAYMENT_DATA: PaymentFormInputs = {
    cardHolder: 'NGUYEN VAN A',
    cardNumber: '4111 1111 1111 1111', // Visa test
    expirationDate: '12/28',
    cvv: '123',
    paymentMethod: PaymentMethod.CreditCard,
};
const formFields: FormField[] = [
    {
        id: 'cardHolder',
        label: 'Họ và tên trên thẻ',
        placeholder: 'Nhập họ và tên',
        type: 'text',
    },
    {
        id: 'cardNumber',
        label: 'Số thẻ',
        placeholder: '1234 5678 9012 3456',
        type: 'text',
        inputMode: 'numeric',
    },
    {
        id: 'expirationDate',
        label: 'Hạn sử dụng',
        placeholder: 'MM/YY',
        type: 'text',
        inputMode: 'numeric',
    },
    {
        id: 'cvv',
        label: 'CVV',
        placeholder: '123',
        type: 'text',
        inputMode: 'numeric',
    },
];

const paymentLogos = [
    {
        src: '/visa.svg',
        alt: PaymentMethod.CreditCard,
        label: 'Thẻ tín dụng',
    },
    {
        src: '/momo.svg',
        alt: PaymentMethod.MOMO,
        label: 'MOMO',
    },
    {
        src: '/zalo.svg',
        alt: PaymentMethod.ZaloPay,
        label: 'ZaloPay',
    },
] as const;

const PaymentForm: React.FC = () => {
    const router = useRouter(); 
    //  lấy data & action từ store
    const { setPaymentData, items } = useCartStore();
    const { checkInDate, checkOutDate } = useBookingStore();
    const { authUser } = useAuthStore();
    //  setup react-hook-form
   const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
} = useForm<z.infer<typeof paymentFormSchema>>({ 
    resolver: zodResolver(paymentFormSchema as any ),
    defaultValues: MOCK_PAYMENT_DATA,
});

    //  khi submit form
    const handlePaymentForm: SubmitHandler<PaymentFormInputs> = async (
        data,
    ) => {
        // 1. Lưu dữ liệu vào store
        setPaymentData(data);
        if (!authUser) {
            alert('Vui lòng đăng nhập để tiếp tục thanh toán!');
            return; // Dừng lại, không gửi API
        }
        // 2. Tạo FullPaymentData để gửi API
        const fullData: FullPaymentData = {
            user: authUser, // từ auth
            items,
            paymentData: data,
            totalAmount: items.reduce(
                (sum, item) => sum + item.price * item.nights,
                0,
            ),
            checkInDate: checkInDate!,
            checkOutDate: checkOutDate!,
            currency: 'VND',
            timestamp: new Date().toISOString(),
        };

        console.log(' FullPaymentData gửi API:', fullData);

        // Gọi API thực tế
        try {
            // hiển thị "loading"
            const toastId = toast.loading('Đang xử lý thanh toán...');

            // Gọi API thật
            const { paymentApi } = await import('../lib/api/payment');
            const result = await paymentApi.processBooking(fullData);

            console.log('Payment result:', result);

            // Clear cart sau khi thanh toán thành công
            const { clearCart } = useCartStore.getState();
            clearCart();

            toast.success(
                'Thanh toán thành công! Đang chuyển đến lịch sử đặt phòng...',
                { id: toastId },
            );

            // Delay để user thấy thông báo thành công, sau đó redirect đến booking history
            setTimeout(() => {
               router.push('/my-bookings'); 
            }, 1500);
        } catch (error: unknown) {
            console.error('Payment error:', error);
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Thanh toán thất bại, vui lòng thử lại!';
            toast.error(errorMessage);
        }
    };

    return (
        <form
            className='flex flex-col gap-6'
            onSubmit={handleSubmit(handlePaymentForm)}
        >
            {formFields.map((field) => (
                <div key={field.id} className='flex flex-col gap-1'>
                    <label
                        htmlFor={field.id}
                        className='text-md text-gray-500 font-medium'
                    >
                        {field.label}
                    </label>
                    <input
                        id={field.id}
                        type={field.type}
                        placeholder={field.placeholder}
                        inputMode={field.inputMode}
                        className='bg-transparent border-b border-gray-300 py-2 outline-none text-md text-gray-600 placeholder-gray-400 focus:border-gray-500'
                        {...register(field.id)}
                    />

                    {errors[field.id] && (
                        <p className='text-xs text-red-500'>
                            {errors[field.id]?.message}
                        </p>
                    )}
                </div>
            ))}

            <div className='flex flex-col gap-3'>
                <label
                    htmlFor='paymentMethod'
                    className='text-md text-gray-500 font-medium'
                >
                    Phương thức thanh toán
                </label>
                <Select
                    onValueChange={(
                        value: PaymentFormInputs['paymentMethod'],
                    ) => setValue('paymentMethod', value)}
                    defaultValue={PaymentMethod.CreditCard}
                >
                    <SelectTrigger className='border-b border-gray-300 bg-transparent'>
                        <SelectValue placeholder='Chọn phương thức' />
                    </SelectTrigger>
                    <SelectContent>
                        {paymentLogos.map((logo) => (
                            <SelectItem key={logo.alt} value={logo.alt}>
                                <div className='flex items-center gap-2'>
                                    <img
                                        src={logo.src}
                                        alt={logo.label}
                                        width={30}
                                        height={15}
                                    />
                                    <span>{logo.label}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.paymentMethod && (
                    <p className='text-xs text-red-500'>
                        {errors.paymentMethod.message}
                    </p>
                )}
            </div>

            <button
                type='submit'
                className='w-full bg-green-600 hover:bg-green-700 transition-all duration-300 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-medium'
            >
                Thanh toán
                <ShoppingCart className='w-4 h-4' />
            </button>
        </form>
    );
};

export default PaymentForm;
