'use client';

import { useEffect } from 'react';
import { BookingFormSchema } from '@/types/cart';
import type { BookingFormInputs } from '@/types/cart';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useAuthStore } from '@/store/useAuthStore'; 
import { useBookingStore } from '@/store/useBookingStore'; // 1. Import useBookingStore

const BookingForm = ({
    setBookingForm,
}: {
    setBookingForm: (data: BookingFormInputs) => void;
}) => {
    const { authUser } = useAuthStore();
    // 2. Lấy action setBookingDetails từ store (giả định bạn đã có action này)
    // Nếu store của bạn dùng tên khác, hãy sửa lại cho phù hợp
    const { setBookingDetails } = useBookingStore(); 
    
    const {
        register,
        handleSubmit,
        reset,
        watch, // 3. Lấy hàm watch để theo dõi thay đổi
        formState: { errors },
    } = useForm<BookingFormInputs>({
        resolver: zodResolver(BookingFormSchema as any),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
        },
    });

    const router = useRouter();

    // Cập nhật form khi có dữ liệu user
    useEffect(() => {
        if (authUser) {
            reset({
                name: authUser.name || '',
                email: authUser.email || '',
                phone: authUser.phone || '',
                address: authUser.address || '',
                city: authUser.address?.split(',').pop()?.trim() || '',
            });
        }
    }, [authUser, reset]);

    // 4. Theo dõi sự thay đổi của toàn bộ form
    useEffect(() => {
        const subscription = watch((value) => {
            // value sẽ chứa dữ liệu form hiện tại
            // Chúng ta ép kiểu value về BookingFormInputs vì watch trả về Partial
            if (setBookingDetails) {
                 setBookingDetails(value as BookingFormInputs);
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, setBookingDetails]);


    const handleBookingForm: SubmitHandler<BookingFormInputs> = (data) => {
        setBookingForm(data);
        // Lưu lần cuối khi submit để đảm bảo dữ liệu chính xác nhất
        if (setBookingDetails) {
            setBookingDetails(data);
        }
        router.replace('/cart?step=3');
    };

    const fields: {
        name: keyof BookingFormInputs;
        label: string;
        type: string;
        placeholder: string;
    }[] = [
        { name: 'name', label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Văn A' },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'nguyenvana@gmail.com' },
        { name: 'phone', label: 'Số điện thoại', type: 'text', placeholder: '0123456789' },
        { name: 'address', label: 'Địa chỉ', type: 'text', placeholder: '123 Đường ABC, Quận 1' },
        { name: 'city', label: 'Thành phố', type: 'text', placeholder: 'Hà Nội' },
    ];

    return (
        <form
            className='flex flex-col gap-4 p-6 rounded-lg bg-white relative z-0'
            onSubmit={handleSubmit(handleBookingForm)}
        >
            {fields.map((field) => (
                <div key={field.name} className='flex flex-col gap-1 relative'>
                    <label
                        htmlFor={`booking-${field.name}`}
                        className='text-sm text-gray-500 font-medium cursor-pointer'
                    >
                        {field.label}
                    </label>

                    <input
                        id={`booking-${field.name}`}
                        type={field.type}
                        placeholder={field.placeholder}
                        {...register(field.name)}
                        className='bg-transparent border-b border-gray-300 py-2 outline-none text-sm text-gray-600 placeholder-gray-400 focus:border-black transition-colors relative z-10'
                        autoComplete="off"
                    />

                    {errors[field.name] && (
                        <p className='text-xs text-red-500 mt-1'>
                            {errors[field.name]?.message}
                        </p>
                    )}
                </div>
            ))}

            <button
                type='submit'
                className='w-full bg-green-600 hover:bg-green-700 transition-all duration-300 text-white p-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 mt-4'
            >
                Tiếp tục <ArrowRight className='w-3 h-3' />
            </button>
        </form>
    );
};

export default BookingForm;