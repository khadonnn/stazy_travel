'use client'; // Giữ nguyên, cần thiết cho các hooks client như useRouter, useForm

import { BookingFormSchema } from '@/types/cart';
import type { BookingFormInputs } from '@/types/cart';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useAuthStore } from '@/store/useAuthStore';

const BookingForm = ({
    setBookingForm,
}: {
    setBookingForm: (data: BookingFormInputs) => void;
}) => {
    const { authUser } = useAuthStore();
    console.log('authUser', authUser);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<BookingFormInputs>({
        resolver: zodResolver(BookingFormSchema as any),
        defaultValues: {
            name: authUser?.name || '',
            email: authUser?.email || '',
            phone: authUser?.phone || '', // Giả định address là một chuỗi, ví dụ: "123 Street, District 1, Hanoi"
            address: authUser?.address || '', // Logic tách thành phố vẫn giữ nguyên, nhưng cần cẩn thận với format địa chỉ
            city: authUser?.address?.split(',').pop()?.trim() || '',
        },
    }); // 1. Khai báo useRouter thay vì useNavigate

    const router = useRouter();

    const handleBookingForm: SubmitHandler<BookingFormInputs> = (data) => {
        setBookingForm(data); // 2. Thay thế navigate('/cart?step=3', { replace: true }) // bằng router.replace() để thay thế mục lịch sử
        router.replace('/cart?step=3');
    };

    const fields: {
        name: keyof BookingFormInputs;
        label: string;
        type: string;
        placeholder: string;
    }[] = [
        {
            name: 'name',
            label: 'Họ và tên',
            type: 'text',
            placeholder: 'Nguyễn Văn A',
        },
        {
            name: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'nguyenvana@gmail.com',
        },
        {
            name: 'phone',
            label: 'Số điện thoại',
            type: 'text',
            placeholder: '0123456789',
        },
        {
            name: 'address',
            label: 'Địa chỉ',
            type: 'text',
            placeholder: '123 Đường ABC, Quận 1',
        },
        {
            name: 'city',
            label: 'Thành phố',
            type: 'text',
            placeholder: 'Hà Nội',
        },
    ];

    return (
        <form
            className='flex flex-col gap-4'
            onSubmit={handleSubmit(handleBookingForm)}
        >
            {fields.map((field) => (
                <div key={field.name} className='flex flex-col gap-1'>
                    <label
                        htmlFor={field.name}
                        className='text-sm text-gray-500 font-medium'
                    >
                        {field.label}
                    </label>

                    <input
                        id={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        {...register(field.name)}
                        className='bg-transparent border-b border-gray-300 py-2 outline-none text-sm text-gray-600 placeholder-gray-400'
                    />

                    {errors[field.name] && (
                        <p className='text-xs text-red-500'></p>
                    )}
                </div>
            ))}

            <button
                type='submit'
                className='w-full bg-green-600 hover:bg-green-700 transition-all duration-300 text-white p-2 rounded-lg cursor-pointer flex items-center justify-center gap-2'
            >
                Tiếp tục <ArrowRight className='w-3 h-3' /> 
            </button>
        </form>
    );
};

export default BookingForm;
