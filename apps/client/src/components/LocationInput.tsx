'use client';
import { Clock, MapPin } from 'lucide-react';
import { useState, useRef, useEffect, useId } from 'react';
import ClearDataButton from './ClearDataButton';
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui/popover';

export interface LocationInputProps {
    placeHolder?: string;
    desc?: string;
    className?: string;
    divHideVerticalLineClass?: string;
    autoFocus?: boolean;
}

const LocationInput = ({
    autoFocus = false,
    placeHolder = 'Địa điểm',
    desc = 'Bạn muốn đi đâu?',
    className = 'nc-flex-1.5',
    divHideVerticalLineClass = 'left-10 -right-0.5',
}: LocationInputProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
     const popoverId = useId().replace(/:/g, '-');

    const [value, setValue] = useState('');
    const [isOpen, setIsOpen] = useState(autoFocus);

    useEffect(() => {
        setIsOpen(autoFocus);
    }, [autoFocus]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelectLocation = (item: string) => {
        setValue(item);
        setIsOpen(false);
    };

    const handleClear = () => {
        setValue('');
    };

    const renderRecentSearches = () => (
        <>
            <h3 className='block mt-2 sm:mt-0 px-4 sm:px-8 font-semibold text-base sm:text-lg text-neutral-800 dark:text-neutral-100'>
                Tìm kiếm gần đây
            </h3>
            <div className='mt-2'>
                {[
                    'Phố Cổ Hội An, Quảng Nam',
                    'Vịnh Hạ Long, Quảng Ninh',
                    'Sapa, Lào Cai',
                    'Bà Nà Hills, Đà Nẵng',
                ].map((item) => (
                    <span
                        onClick={() => handleSelectLocation(item)}
                        key={item}
                        className='flex px-4 sm:px-8 items-center space-x-3 sm:space-x-4 py-4 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer'
                    >
                        <span className='block text-neutral-400'>
                            <Clock className='h-4 sm:h-6 w-4 sm:w-6' />
                        </span>
                        <span className=' block font-medium text-neutral-700 dark:text-neutral-200'>
                            {item}
                        </span>
                    </span>
                ))}
            </div>
        </>
    );

    const renderSearchValue = () => (
        <>
            {[
                'Hà Nội, Việt Nam',
                'Đà Nẵng, Việt Nam',
                'Tp. Hồ Chí Minh, Việt Nam',
                'Nha Trang, Việt Nam',
            ].map((item) => (
                <span
                    onClick={() => handleSelectLocation(item)}
                    key={item}
                    className='flex px-4 sm:px-8 items-center space-x-3 sm:space-x-4 py-4 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer'
                >
                    <span className='block text-neutral-400'>
                        <Clock className='h-4 w-4 sm:h-6 sm:w-6' />
                    </span>
                    <span className='block font-medium text-neutral-700 dark:text-neutral-200'>
                        {item}
                    </span>
                </span>
            ))}
        </>
    );

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div
                    className={`relative flex ${className}`}
                    ref={containerRef}
                     suppressHydrationWarning={true}
                     aria-controls={`location-popover-${popoverId}`}
                >
                    <div
                        className={`flex z-10 flex-1 relative [ nc-hero-field-padding ] shrink-0 items-center space-x-3 cursor-pointer focus:outline-none text-left ${
                            isOpen ? 'cus-hero-field-focused' : ''
                        }`}
                    >
                        <div className='text-neutral-300 dark:text-neutral-400 ml-3'>
                            <MapPin className='w-5 h-5 lg:w-7 lg:h-7 ' />
                        </div>
                        <div className='grow'>
                            <input
                                className='block w-full bg-transparent border-none focus:ring-0 p-0 focus:outline-none focus:placeholder-neutral-300 xl:text-lg font-semibold placeholder-neutral-800 dark:placeholder-neutral-200 truncate'
                                placeholder={placeHolder}
                                value={value}
                                autoFocus={isOpen}
                                onChange={(e) =>
                                    setValue(e.currentTarget.value)
                                }
                                onFocus={() => setIsOpen(true)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(true);
                                }}
                                ref={inputRef}
                            />
                            <span className='block mt-0.5 text-sm text-neutral-400 font-light '>
                                <span className='line-clamp-1'>
                                    {value ? placeHolder : desc}
                                </span>
                            </span>
                            {value && isOpen && (
                                <ClearDataButton onClick={handleClear} />
                            )}
                        </div>
                    </div>

                    {isOpen && (
                        <div
                            className={`h-8 absolute self-center top-1/2 -translate-y-1/2 z-0 bg-white dark:bg-neutral-800 ${divHideVerticalLineClass}`}
                        ></div>
                    )}
                </div>
            </PopoverTrigger>

            <PopoverContent
                className='w-full min-w-[300px] sm:min-w-[500px] bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-3xl shadow-xl border-0 max-h-96 overflow-y-auto'
                align='start'
                 id={`location-popover-${popoverId}`}
            >
                {value ? renderSearchValue() : renderRecentSearches()}
            </PopoverContent>
        </Popover>
    );
};

export default LocationInput;
