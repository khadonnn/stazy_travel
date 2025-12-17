'use client'; // BẮT BUỘC vì component này sử dụng hook Client-Side (useRouter)

import { useRouter } from 'next/navigation'; // SỬ DỤNG useRouter của Next.js
import { ExplorePlace } from '@/components/ExplorePlace';
import StayListing from '@/components/StayListings';
import StaySearchForm from '@/components/StaySearchForm';
import Image from 'next/image';

export default function HomePage() {
    // THAY THẾ useNavigate
    const router = useRouter();

    return (
        <>
            <div className=' mb-24 md:px-0 2xl:px-10 relative mt-20 mx-auto'>
                <div className='relative overflow-hidden rounded-3xl'>
                    {/* Background image */}
                    <div className='aspect-video relative w-full'>
                        <Image
                            src={'/assets/bg.jpg'} // Đảm bảo URL ảnh chính xác nếu bg là module import
                            alt='hero'
                            className='rounded-xl object-cover object-center w-full h-full'
                            fill
                        />
                    </div>

                    {/* Overlay content */}
                    <div className='absolute inset-x-0 top-[15%] mx-auto flex max-w-2xl flex-col items-center text-center'>
                        <div className='flex flex-col gap-y-5 xl:gap-y-8'>
                            <span className='font-semibold text-neutral-900 sm:text-lg md:text-xl'>
                                Trải nghiệm kỳ nghỉ tuyệt vời cùng Stazy
                            </span>
                            <h2 className='text-4xl leading-[1.15] font-bold text-black md:text-5xl lg:text-6xl xl:text-7xl'>
                                Vi vu mê say
                                <br />
                                Chạm là đặt ngay
                            </h2>
                        </div>

                        <button
                            // SỬ DỤNG router.push() thay cho navigate()
                            onClick={() => router.push('/hotels')}
                            type='button'
                            className='mt-10 sm:mt-20 sm:text-lg relative inline-flex items-center justify-center px-6 py-3 font-medium rounded-full bg-primary text-white hover:bg-primary/80 focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all duration-300 ease-in-out'
                        >
                            Bắt đầu khám phá
                        </button>
                    </div>
                </div>
                <div className='absolute left-1/2 -translate-x-1/2 bottom-8 w-full max-w-6xl px-4 sm:px-8 z-20 '>
                    <StaySearchForm />
                </div>
            </div>
            <div className='mx-auto mb-24 flex w-full flex-col items-center px-4 sm:px-8'>
                <ExplorePlace />
            </div>
            <div className=' mb-24 flex w-full flex-col items-center px-4 sm:px-8'>
                <StayListing />
            </div>
        </>
    );
}
