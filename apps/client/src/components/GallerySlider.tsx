'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const variants = (x = 400, opacity = 0) => ({
    enter: (direction: number) => ({
        x: direction > 0 ? x : -x,
        opacity,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction > 0 ? -x : x,
        opacity,
    }),
});

export interface GallerySliderProps {
    className?: string;
    featuredImage?: string;
    galleryImgs: string[];
    ratioClass?: string;
    uniqueID: string;
    href?: string;
    imageClass?: string;
    galleryClass?: string;
    navigation?: boolean;
    id?: string | number;
}

export default function GallerySlider({
    className = '',
    featuredImage,
    galleryImgs,
    ratioClass = 'aspect-[4/3]',
    imageClass = '',
    uniqueID = 'gallery-slider',
    galleryClass = 'rounded-xl',
    href = '/hotels',
    navigation = true,
    id,
}: GallerySliderProps) {
    const [loaded, setLoaded] = useState(false);
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const images = useMemo(() => {
        const allImages = [...galleryImgs];
        if (featuredImage) {
            // Thêm featuredImage vào đầu mảng
            allImages.unshift(featuredImage);
        }
        return allImages.length > 0 ? allImages : ['/placeholder-hotel.jpg'];
    }, [featuredImage, galleryImgs]);

    function changePhotoId(newVal: number) {
        if (newVal > index) {
            setDirection(1);
        } else {
            setDirection(-1);
        }
        setIndex(newVal);
    }

    const handlers = useSwipeable({
        onSwipedLeft: () =>
            index < images.length - 1 && changePhotoId(index + 1),
        onSwipedRight: () => index > 0 && changePhotoId(index - 1),
        delta: 50,
    });

    // SỬA LỖI LẶP ID TẠI ĐÂY
    // Dùng href được truyền vào (đã là /hotels/1)
    const finalDetailUrl = href;

    return (
        <MotionConfig
            transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.25 },
            }}
        >
            <div
                className={`relative group group/cardGallerySlider ${className}`}
                {...handlers}
            >
                {/* Main image container */}
                <div className={`w-full overflow-hidden ${galleryClass}`}>
                    <Link
                        // SỬA: CHỈ DÙNG finalDetailUrl (TỨC LÀ href)
                        href={finalDetailUrl}
                        className={`relative flex items-center justify-center ${ratioClass}`}
                        onClick={() => {
                            console.log('🔗 GallerySlider URL clicked:', {
                                href,
                                id,
                                finalUrl: finalDetailUrl,
                            });
                        }}
                    >
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={`${uniqueID}-${index}`}
                                custom={direction}
                                variants={variants(400, 0)}
                                initial='enter'
                                animate='center'
                                exit='exit'
                                className='absolute inset-0'
                            >
                                <img
                                    src={images[index]}
                                    alt={`Slide ${index + 1}`}
                                    className={`object-cover w-full h-full ${imageClass}`}
                                    onLoad={() => setLoaded(true)}
                                    onError={(e) => {
                                        const target =
                                            e.target as HTMLImageElement;
                                        target.src = '/placeholder-hotel.jpg';
                                    }}
                                    loading='lazy'
                                />
                            </motion.div>
                        </AnimatePresence>
                    </Link>
                </div>

                {loaded && navigation && (
                    <div className='opacity-0 group-hover/cardGallerySlider:opacity-100 transition-opacity duration-300'>
                        {index > 0 && (
                            <button
                                className='absolute w-8 h-8 left-3 top-1/2 -translate-y-1/2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-600 dark:hover:border-neutral-500 rounded-full flex items-center justify-center hover:border-neutral-300 focus:outline-none shadow-md'
                                onClick={() => changePhotoId(index - 1)}
                                aria-label='Previous image'
                            >
                                <ChevronLeft className='h-4 w-4 text-neutral-800 dark:text-neutral-200' />
                            </button>
                        )}
                        {index + 1 < images.length && (
                            <button
                                className='absolute w-8 h-8 right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-600 dark:hover:border-neutral-500 rounded-full flex items-center justify-center hover:border-neutral-300 focus:outline-none shadow-md'
                                onClick={() => changePhotoId(index + 1)}
                                aria-label='Next image'
                            >
                                <ChevronRight className='h-4 w-4 text-neutral-800 dark:text-neutral-200' />
                            </button>
                        )}
                    </div>
                )}

                <div className='absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-black/50 to-transparent rounded-b-lg pointer-events-none'></div>
                <div className='flex items-center justify-center absolute bottom-2 left-1/2 -translate-x-1/2 space-x-1.5 z-10'>
                    {images.map((_, i) => (
                        <button
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                                i === index ? 'bg-white' : 'bg-white/60'
                            }`}
                            onClick={() => changePhotoId(i)}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </MotionConfig>
    );
}
