'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    ArrowRight,
    MapPin,
    User,
    Bed,
    Bath,
    DoorOpen,
    Clock,
    CheckCircle2,
    Calendar,
    GalleryVerticalEnd,
} from 'lucide-react';

import Link from 'next/link';
import { Amenities_demos } from '@/constants/amenities';
import FiveStar from '@/shared/FiveStar';
import CommentListing from '@/components/Comments';
import StartRating from '@/components/StarRating';
import LikeSaveBtns from '@/shared/LikeSaveBtn';
import StayDatesRangeInput from '@/components/StayDatesRangeInput';
import SectionDateRange from '@/components/SectionDaterange';
import GuestsInput from '@/components/GuestsInput';
import type { StayDataType, AuthorType } from '@/types/stay';
import LocationMap from '@/components/LocationMap';
import { useBookingStore } from '@/store/useBookingStore';
import { calculatorPrice } from '@/lib/utils/calculatorPrice';
import { getRandomDescription } from '@/lib/utils/stayDes';
import ModalDetail from '@/components/ModelDetail';
import CategoryBadge from '@/shared/CategoryBadge';
import { useCartStore } from '@/store/useCartStore';
import { formatPrice } from '@/lib/utils/formatPrice';
import { motion } from 'framer-motion';
// 🔥 1. Import hook useUser từ Clerk
import { useUser } from '@clerk/nextjs';

import MockData from '@/data/jsons/__homeStay.json';
import { mapStay, StayApiResponse } from '@/lib/mappers/listings';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================
// Hàm lấy dữ liệu Mock Data ban đầu (Synchronous)
// =============================================================
const getInitialStayData = (id: string) => {
    const targetId = Number(id);
    const rawStays: StayApiResponse[] =
        MockData as unknown as StayApiResponse[];
    const rawStay = rawStays.find((item) => item.id === targetId);

    if (!rawStay) return { stayData: null, author: null };

    const mappedStay = mapStay(rawStay);

    return {
        stayData: mappedStay,
        author: {
            id: mappedStay.authorId || 10,
            firstName: 'Host',
            lastName: `${mappedStay.authorId || 10}`,
            displayName: `Host ${mappedStay.authorId || 10}`,
            email: `host${mappedStay.authorId || 10}@hotel.com`,
            avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg',
            bgImage: '',
            count: 10,
            href: '#',
            jobName: 'Hotel Manager',
            desc: 'Experienced hospitality professional',
        } as AuthorType,
    };
};
// =============================================================

interface StayDetailPageClientProps {
    params: {
        id: number;
    };
}

const StayDetailPageClient = ({ params }: StayDetailPageClientProps) => {
    const { id } = params;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // 1. Tải Mock Data TỨC THỜI
    const initialData = useMemo(() => getInitialStayData(id.toString()), [id]);

    const modal = searchParams?.get('modal');

    // 🔥 2. Thay thế useAuthStore bằng useUser của Clerk
    const { isSignedIn, isLoaded } = useUser();
    
    const { date, guests, checkInDate, checkOutDate } = useBookingStore();
    const isDisabled = !checkInDate || !checkOutDate;

    // ✅ State cục bộ cho modal ảnh
    const [modalImageState, setModalImageState] = useState<{
        images: string[];
        startIndex: number;
    } | null>(null);

    const addItem = useCartStore((state) => state.addItem);

    type ExtendedStayDataType = StayDataType & {
        displayName?: string;
        avatar?: string;
        joinDate?: string;
        responseRate?: string;
        checkInTime?: string;
        checkOutTime?: string;
        cancellationPolicy?: string;
        specialNotes?: string[];
        amenities?: string;
    };

    // 2. Khởi tạo state
    const [stayData, setStayData] = useState<ExtendedStayDataType | null>(
        initialData.stayData,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(
        initialData.stayData ? null : `Không tìm thấy khách sạn có ID: ${id}`,
    );
    const [author, setAuthor] = useState<AuthorType | undefined>(
        initialData.author || undefined,
    );
    const [isOpenModalAmenities, setIsOpenModalAmenities] = useState(false);

    const imagesForModal = useMemo(() => {
        if (!modalImageState) return [];
        return modalImageState.images;
    }, [modalImageState]);

    // ✅ Hàm mở modal ảnh
    const handleOpenModalImageGallery = (startIndex: number) => {
        if (!stayData) return;
        const images = [
            stayData.featuredImage,
            ...(stayData.galleryImgs || []),
        ].filter(Boolean);
        setModalImageState({ images, startIndex });
        const newUrl = `${pathname}?modal=open`;
        router.push(newUrl, { scroll: false });
    };

    const handleCloseModal = () => {
        setModalImageState(null);
        router.push(pathname || '/', { scroll: false });
    };

    function openModalAmenities() {
        setIsOpenModalAmenities(true);
    }

    if (loading) {
        return (
            <div className='flex items-center justify-center h-screen'>
            </div>
        );
    }

    // Nếu có lỗi hoặc không tìm thấy data
    if (error || !stayData) {
        return (
            <div className='flex items-center justify-center h-screen'>
                <div className='text-center max-w-md mx-auto p-6'>
                    <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                        <svg
                            className='w-8 h-8 text-red-500'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                            />
                        </svg>
                    </div>
                    <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                        {error ? 'Có lỗi xảy ra' : 'Không tìm thấy khách sạn'}
                    </h3>
                    <p className='text-gray-600 mb-4'>
                        {error || 'Khách sạn bạn đang tìm kiếm không tồn tại.'}
                    </p>
                    <div className='mt-6 space-x-3'>
                        <Button variant='outline' onClick={() => router.back()}>
                            Quay lại
                        </Button>
                        <Button
                            variant='default'
                            onClick={() => router.push('/')}
                        >
                            Về trang chủ
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const {
        featuredImage,
        galleryImgs,
        title,
        category,
        address,
        reviewStart,
        reviewCount,
        maxGuests,
        bedrooms,
        bathrooms,
        price,
        saleOff,
        map,
        // Dữ liệu mở rộng
        displayName,
        avatar,
        joinDate = 'Chưa biết',
        responseRate = '100%',
        checkInTime = '14:00 - 23:00',
        checkOutTime = '08:00 - 12:00',
        cancellationPolicy = 'Bạn có thể hủy miễn phí trong vòng 48 giờ sau khi đặt phòng. Nếu hủy trước 14 ngày so với ngày nhận phòng, bạn sẽ được hoàn lại 50% tổng số tiền. Sau thời hạn này, không được hoàn tiền.',
        specialNotes = ['Vui lòng giữ yên tĩnh sau 23h'],
        description = getRandomDescription(),
    } = stayData;

    const pricePerNight = price || 0;
    const { nights, total } = calculatorPrice({ pricePerNight, date });
    const totalGuests = guests.adults + guests.children + guests.infants;

    // 🔥 3. Cập nhật logic handleAddToCart dùng Clerk
    const handleAddToCart = () => {
        // Chờ Clerk load xong trạng thái
        if (!isLoaded) return;

        // Nếu chưa đăng nhập
        if (!isSignedIn) {
            console.error('Vui lòng đăng nhập để đặt phòng.');
            // Chuyển hướng sang trang sign-in của Clerk và quay lại trang này sau khi xong
            const redirectUrl = encodeURIComponent(pathname || '/');
            router.push(`/sign-in?redirect_url=${redirectUrl}`);
            return;
        }

        if (!stayData || isDisabled) return;

        addItem({
            ...stayData,
            nights,
            totalGuests: guests.adults + guests.children + guests.infants,
        });
        router.push('/cart');
    };

    const renderHeaderImages = () => {
        const mainImage = featuredImage || '/src/assets/travels/dalat.jpg';
        const thumbs = galleryImgs?.slice(0, 4) || [];

        return (
            <header className='rounded-md sm:rounded-xl overflow-hidden relative mt-4'>
                <div className='grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-2 h-[636px]'>
                    <div
                        className='relative rounded-md overflow-hidden cursor-pointer h-full'
                        onClick={() => handleOpenModalImageGallery(0)}
                    >
                        <img
                            src={mainImage}
                            alt={title}
                            className='w-full h-full object-cover rounded-md sm:rounded-xl'
                            loading='lazy'
                        />
                        <div className='absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-20 transition-opacity' />
                    </div>

                    <div className='grid grid-cols-2 grid-rows-2 gap-2 h-full'>
                        {thumbs
                            .slice(0, 4)
                            .map((img: string, index: number) => (
                                <div
                                    key={index}
                                    className={`relative rounded-md overflow-hidden ${
                                        !img ? 'bg-neutral-100' : ''
                                    }`}
                                    onClick={() =>
                                        handleOpenModalImageGallery(index + 1)
                                    }
                                >
                                    <img
                                        src={img || '/placeholder-image.jpg'}
                                        alt={`Hình ảnh ${index + 1}`}
                                        className='w-full h-full object-cover rounded-md sm:rounded-xl'
                                        loading='lazy'
                                    />
                                    <div className='absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-20 transition-opacity' />
                                </div>
                            ))}
                    </div>

                    <button
                        className='absolute left-3 bottom-3 z-10 hidden md:flex items-center px-4 py-2 rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                        onClick={() => handleOpenModalImageGallery(0)}
                    >
                        <GalleryVerticalEnd className='w-5 h-5' />
                        <span className='ml-2 text-neutral-800 text-sm font-medium'>
                            Xem tất cả ảnh
                        </span>
                    </button>
                </div>
            </header>
        );
    };

    const renderSection1 = () => {
        return (
            <div className='listingSection__wrap !space-y-6'>
                <div className='flex justify-between items-center'>
                    <CategoryBadge category={category} />
                    <LikeSaveBtns />
                </div>

                <h2 className='text-2xl sm:text-3xl lg:text-4xl font-semibold'>
                    {title}
                </h2>

                <div className='flex items-center space-x-4'>
                    <StartRating
                        point={reviewStart}
                        reviewCount={reviewCount}
                    />
                    <span>·</span>
                    <div className='flex items-center text-sm text-neutral-600 dark:text-neutral-400'>
                        <MapPin className='w-4 h-4 mr-1' />
                        {address}
                    </div>
                </div>

                <div className='flex items-center'>
                    <Avatar className='h-10 w-10 '>
                        <AvatarImage
                            src={avatar || '/avatar.jpg'}
                            alt={displayName || 'Chủ nhà'}
                            className='object-cover '
                        />
                        <AvatarFallback>
                            {displayName?.charAt(0) || 'C'}
                        </AvatarFallback>
                    </Avatar>
                    <span className='ml-2.5 text-neutral-500 dark:text-neutral-400'>
                        Được chủ nhà{' '}
                        <span className='text-neutral-900 dark:text-neutral-200 font-medium'>
                            {displayName || 'Không rõ'}
                        </span>{' '}
                        cung cấp
                    </span>
                </div>

                <Separator className='my-4' />

                <div className='flex items-center justify-between xl:justify-start space-x-8 xl:space-x-12 text-sm text-neutral-700 dark:text-neutral-300'>
                    <div className='flex items-center space-x-2'>
                        <User className='w-5 h-5' />
                        <span>
                            {maxGuests || 0}{' '}
                            <span className='hidden sm:inline-block'>
                                khách
                            </span>
                        </span>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <Bed className='w-5 h-5' />
                        <span>
                            {bedrooms || 0}{' '}
                            <span className='hidden sm:inline-block'>
                                giường
                            </span>
                        </span>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <Bath className='w-5 h-5' />
                        <span>
                            {bathrooms || 0}{' '}
                            <span className='hidden sm:inline-block'>
                                phòng tắm
                            </span>
                        </span>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <DoorOpen className='w-5 h-5' />
                        <span>
                            {bedrooms || 0}{' '}
                            <span className='hidden sm:inline-block'>
                                phòng ngủ
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const renderSection2 = () => {
        return (
            <div className='listingSection__wrap'>
                <h2 className='text-2xl font-semibold'>Thông tin chỗ ở</h2>
                <Separator className='my-4' />
                <div className='text-neutral-600 dark:text-neutral-300 space-y-4'>
                    <p>{description || 'Chưa có mô tả.'}</p>
                </div>
            </div>
        );
    };

    const currentStayAmenities = useMemo(() => {
        if (!stayData?.amenities || !Array.isArray(stayData.amenities))
            return [];

        return stayData.amenities
            .map((id) => Amenities_demos.find((item) => item.id === id))
            .filter((item): item is (typeof Amenities_demos)[0] => !!item);
    }, [stayData?.amenities]);

    const renderSection3 = () => {
        return (
            <div className='listingSection__wrap'>
                <div>
                    <h2 className='text-2xl font-semibold'>Tiện nghi</h2>
                    <p className='mt-2 text-neutral-500 dark:text-neutral-400'>
                        Các tiện ích và dịch vụ được cung cấp tại chỗ ở này
                    </p>
                </div>
                <Separator className='my-4' />

                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-sm text-neutral-700 dark:text-neutral-300'>
                    {currentStayAmenities.slice(0, 12).map((item) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.id}
                                className='flex items-center space-x-3'
                            >
                                <Icon className='w-6 h-6 text-neutral-600' />
                                <span>{item.name}</span>
                            </div>
                        );
                    })}
                </div>

                {currentStayAmenities.length > 12 && (
                    <>
                        <Separator className='my-6' />
                        <Button variant='outline' onClick={openModalAmenities}>
                            Xem thêm {currentStayAmenities.length - 12} tiện
                            nghi
                        </Button>
                    </>
                )}
                {renderModalAmenities()}
            </div>
        );
    };

    const renderModalAmenities = () => {
        return (
            <Dialog
                open={isOpenModalAmenities}
                onOpenChange={setIsOpenModalAmenities}
            >
                <DialogContent className='max-h-[90vh] overflow-y-auto max-w-4xl'>
                    <DialogHeader>
                        <DialogTitle>Tiện nghi có sẵn</DialogTitle>
                        <DialogDescription>
                            Danh sách đầy đủ các tiện nghi tại {title}
                        </DialogDescription>
                    </DialogHeader>

                    <div className='py-4 grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        {currentStayAmenities.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.id}
                                    className='flex items-center py-2.5 space-x-5 border-b border-neutral-100 dark:border-neutral-800'
                                >
                                    <Icon className='w-7 h-7 text-neutral-600' />
                                    <span className='text-base'>
                                        {item.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    const renderSection4 = () => {
        return (
            <div className='listingSection__wrap'>
                <div>
                    <h2 className='text-2xl font-semibold'>Bảng giá</h2>
                    <p className='mt-2 text-neutral-500 dark:text-neutral-400'>
                        Giá có thể tăng vào cuối tuần hoặc dịp lễ
                    </p>
                </div>
                <Separator className='my-4' />
                <div className='flow-root'>
                    <div className='text-sm sm:text-base text-neutral-600 dark:text-neutral-300 -mb-4'>
                        {[
                            {
                                label: 'Giá mỗi đêm',
                                price: price || '1.200.000đ',
                            },
                            { label: 'Số đêm tối thiểu', price: '1 đêm' },
                            { label: 'Số đêm tối đa', price: '90 đêm' },
                            {
                                label: 'Giảm giá ',
                                price: saleOff ? saleOff.split(' ')[0] : '0%',
                            },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className={`p-4 flex justify-between items-center space-x-4 rounded-lg mb-2 ${
                                    index % 2 === 0
                                        ? 'bg-neutral-100 dark:bg-neutral-800'
                                        : ''
                                }`}
                            >
                                <span>{item.label}</span>
                                <span className='font-medium'>
                                    {item.price}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderSection5 = () => {
        return (
            <div className='listingSection__wrap'>
                <h2 className='text-2xl font-semibold'>Thông tin chủ nhà</h2>
                <Separator className='my-4' />

                <div className='flex items-center space-x-4'>
                    <Avatar className='h-14 w-14'>
                        <AvatarImage
                            src={avatar || '/host-avatar.jpg'}
                            alt={displayName || 'Chủ nhà'}
                            className='object-cover '
                        />
                        <AvatarFallback>
                            {displayName?.charAt(0) || 'C'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <Link className='block text-xl font-medium' href='#'>
                            {displayName || 'Chủ nhà chưa đặt tên'}
                        </Link>
                        <div className='mt-1.5 flex items-center text-sm text-neutral-500 dark:text-neutral-400'>
                            <StartRating
                                point={reviewStart}
                                reviewCount={reviewCount}
                            />
                            <span className='mx-2'>·</span>
                            <span>{reviewCount} đánh giá</span>
                        </div>
                    </div>
                </div>

                <p className='mt-4 text-neutral-600 dark:text-neutral-300'>
                    {description || 'Chưa có thông tin thêm về chủ nhà.'}
                </p>

                <div className='mt-6 space-y-3 text-neutral-500 dark:text-neutral-400'>
                    <div className='flex items-center space-x-2'>
                        <Calendar className='w-5 h-5' />
                        <span>Tham gia từ {joinDate || 'Chưa biết'}</span>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <CheckCircle2 className='w-5 h-5' />
                        <span>Tỷ lệ phản hồi - {responseRate || '100%'}</span>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <Clock className='w-5 h-5' />
                        <span>Phản hồi nhanh - trong vài giờ</span>
                    </div>
                </div>

                <Separator className='my-6' />
                <Button variant='outline' asChild>
                    <Link href='#'>Xem hồ sơ chủ nhà</Link>
                </Button>
            </div>
        );
    };

    const renderSection6 = () => {
        return (
            <div className='listingSection__wrap'>
                <h2 className='text-2xl font-semibold'>
                    Đánh giá ({reviewCount} đánh giá)
                </h2>
                <Separator className='my-4' />

                <div className='space-y-5'>
                    <FiveStar iconClass='w-6 h-6' className='space-x-0.5' />
                    <div className='relative'>
                        <Input
                            placeholder='Chia sẻ cảm nhận của bạn...'
                            className='h-16 rounded-3xl'
                        />
                        <Button
                            variant='ghost'
                            size='icon'
                            className='absolute right-2 top-1/2 transform -translate-y-1/2 h-12 w-12'
                            onClick={() => {}}
                        >
                            <ArrowRight className='w-5 h-5' />
                        </Button>
                    </div>
                </div>

                <div className='divide-y divide-neutral-200 dark:divide-neutral-800 mt-6'>
                    <CommentListing />

                    <div className='pt-8'>
                        <Button variant='outline' asChild>
                            <Link href='#'>Xem thêm đánh giá</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderSection7 = () => {
        return (
            <div className='listingSection__wrap h-'>
                <div>
                    <h2 className='text-2xl font-semibold'>Vị trí</h2>
                    <p className='mt-2 text-neutral-500 dark:text-neutral-400'>
                        {address}
                    </p>
                </div>
                <Separator className='my-4' />
                <LocationMap address={address} lat={map?.lat} lng={map?.lng} />
            </div>
        );
    };

    const renderSection8 = () => {
        return (
            <div className='listingSection__wrap'>
                <h2 className='text-2xl font-semibold'>Thông tin cần biết</h2>
                <Separator className='my-4' />

                <div className='space-y-6'>
                    <div>
                        <h4 className='text-lg font-semibold'>
                            Chính sách hủy
                        </h4>
                        <p className='mt-3 text-neutral-500 dark:text-neutral-400'>
                            {cancellationPolicy ||
                                'Bạn có thể hủy miễn phí trong vòng 48 giờ sau khi đặt phòng. Nếu hủy trước 14 ngày so với ngày nhận phòng, bạn sẽ được hoàn lại 50% tổng số tiền. Sau thời hạn này, không được hoàn tiền.'}
                        </p>
                    </div>

                    <Separator />

                    <div>
                        <h4 className='text-lg font-semibold'>
                            Giờ nhận phòng
                        </h4>
                        <div className='mt-3 space-y-2'>
                            <div className='flex justify-between p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg'>
                                <span>Nhận phòng</span>
                                <span>{checkInTime || '14:00 - 23:00'}</span>
                            </div>
                            <div className='flex justify-between p-3 rounded-lg'>
                                <span>Trả phòng</span>
                                <span>{checkOutTime || '08:00 - 12:00'}</span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h4 className='text-lg font-semibold'>
                            Lưu ý đặc biệt
                        </h4>
                        <ul className='mt-3 text-neutral-500 dark:text-neutral-400 space-y-2 list-disc pl-5'>
                            {specialNotes?.map((note: string, idx: number) => (
                                <li key={idx}>{note}</li>
                            )) || <li>Không gây ồn sau 23h.</li>}
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    const renderSidebar = () => {
        if (!stayData) return null;

        const handleSidebarAddToCart = () => {
            // Chờ Clerk load xong
            if (!isLoaded) return;
            
            // Check auth
            if (!isSignedIn) {
                console.error('Vui lòng đăng nhập để đặt phòng.');
                const redirectUrl = encodeURIComponent(pathname || '/');
                router.push(`/sign-in?redirect_url=${redirectUrl}`);
                return;
            }
            if (!stayData || isDisabled) return;

            addItem({
                ...stayData,
                nights,
                totalGuests,
            });
            router.push('/cart');
        };

        return (
            <Card className='shadow-xl sticky top-28'>
                <CardHeader className='pb-4'>
                    <div className='flex justify-between items-start '>
                        <div>
                            <span className='text-3xl font-semibold'>
                                {formatPrice(stayData.price)}
                            </span>
                            <span className='ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400'>
                                /đêm
                            </span>
                        </div>
                        <div className='mt-2'>
                            <StartRating
                                point={stayData.reviewStart}
                                reviewCount={stayData.reviewCount}
                            />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className='space-y-4'>
                    <form className='flex flex-col border border-neutral-200 dark:border-neutral-700 rounded-3xl'>
                        <StayDatesRangeInput className='flex-1 z-[11]' />
                        <div className='w-full border-b border-neutral-200 dark:border-neutral-700'></div>
                        <GuestsInput className='flex-1' />
                    </form>

                    <div className='space-y-3'>
                        <div className='flex justify-between text-neutral-600 dark:text-neutral-300'>
                            <span>
                                {pricePerNight.toLocaleString('vi-VN')}đ x{' '}
                                {nights} đêm
                            </span>
                            <span>{total.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className='flex justify-between text-neutral-600 dark:text-neutral-300'>
                            <span>Phí dịch vụ</span>
                            <span>0đ</span>
                        </div>
                        <Separator />
                        <div className='flex justify-between font-semibold'>
                            <span>Tổng cộng</span>
                            <span>{total.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className='text-sm text-neutral-500'>
                            Tổng khách: <b>{totalGuests}</b>
                        </div>
                    </div>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className='w-full inline-block'>
                                    <Button
                                        className='w-full'
                                        onClick={handleSidebarAddToCart}
                                        disabled={isDisabled}
                                    >
                                        Đặt phòng ngay
                                    </Button>
                                </span>
                            </TooltipTrigger>

                            {isDisabled && (
                                <TooltipContent
                                    side='top'
                                    className='bg-yellow-500 text-white'
                                >
                                    <p>Vui lòng chọn ngày đặt phòng</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                </CardContent>
            </Card>
        );
    };

    const startIndexForModal = modalImageState?.startIndex || 0;

    return (
        <div className='container py-11 lg:py-16 px-8'>
            {renderHeaderImages()}

            {/* modal */}
            {modal === 'open' &&
                imagesForModal.length > 0 && ( 
                    <ModalDetail
                        images={imagesForModal}
                        startIndex={startIndexForModal}
                        onClose={handleCloseModal}
                    />
                )}

            {/* MAIN CONTENT */}
            <main className='relative z-10 mt-11 flex flex-col lg:flex-row'>
                {/* CONTENT */}
                <div className='w-full lg:w-3/5 xl:w-2/3 space-y-8 lg:space-y-10 lg:pr-10 '>
                    {renderSection1()}
                    {renderSection2()}
                    {renderSection3()}
                    {renderSection4()}
                    <SectionDateRange />
                    {renderSection5()}
                    {renderSection6()}
                    {renderSection7()}
                    {renderSection8()}
                </div>

                {/* SIDEBAR */}
                <div className='hidden lg:block flex-grow mt-14 lg:mt-0'>
                    {renderSidebar()}
                </div>
            </main>
        </div>
    );
};

export default StayDetailPageClient;