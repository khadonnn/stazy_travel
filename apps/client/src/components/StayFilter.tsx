'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation'; // <-- Next.js Hooks
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    ArrowUp,
    ArrowDown,
    RotateCcw,
    SlidersHorizontal,
    Search,
} from 'lucide-react';
import { debounce } from 'lodash';
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '@/components/ui/popover';
import type { StayDataType } from '@/types/stay';

interface Props {
    data: StayDataType[];
    onFilter?: (data: StayDataType[]) => void;
}

// Định nghĩa kiểu cho các trường sắp xếp
type SortByField = 'saleOff' | 'viewCount' | 'reviewCount';

const parsePrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    // Fix: Ensure price is treated as string before calling replace
    return Number(String(price).replace(/[^\d]/g, '')) || 0;
};

const parseSaleOff = (saleOff?: string | null): number => {
    if (!saleOff) return 0;
    const match: RegExpMatchArray | null = String(saleOff).match(/(\d+)%/); 
    return match ? parseInt(match[1]!, 10) : 0;
};

// =========================================================================

export const StayFilter: React.FC<Props> = ({ data, onFilter }) => {
    const router = useRouter();
    // Use Optional Chaining for safe access
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const maxPrice = useMemo(() => {
        const prices = data.map((stay: StayDataType) => parsePrice(stay.price));
        return prices.length > 0 ? Math.max(...prices) : 0;
    }, [data]);

    // ------------------- HÀM QUẢN LÝ URL -------------------

    // Hàm xây dựng Query String mới
    const createQueryString = useCallback(
        (
            key: string,
            value: string | number | null | undefined,
            currentSearchParams: URLSearchParams,
        ) => {
            // Clone the existing search params object
            const params = new URLSearchParams(currentSearchParams.toString());
            const stringValue = String(value);

            if (
                value === null ||
                value === undefined ||
                stringValue === '' ||
                Number(value) === 0
            ) {
                params.delete(key);
            } else {
                params.set(key, stringValue);
            }
            return params.toString();
        },
        [],
    );

    // Hàm chung để cập nhật URL
    const updateUrl = useCallback(
        (newParams: URLSearchParams | string) => {
            router.push(`${pathname}?${newParams.toString()}`, {
                scroll: false,
            });
        },
        [pathname, router],
    );

    // ------------------- LẤY TRẠNG THÁI TỪ URL -------------------

    // Get current values directly from URL (Source of Truth)
    const currentCategory = searchParams?.get('category') || null;
    // Use maxPrice as fallback for max, 0 for min
    const currentPriceMin = Number(searchParams?.get('price_min')) || 0;
    const currentPriceMax = Number(searchParams?.get('price_max')) || maxPrice;
    const currentSearchTerm = searchParams?.get('search') || '';
    const currentBedrooms = searchParams?.get('bedrooms') || null;
    const currentSortBy: SortByField | null =
        (searchParams?.get('sort_by') as SortByField) || null;
    const currentSortOrder: 'asc' | 'desc' =
        (searchParams?.get('sort_order') as 'asc' | 'desc') || 'desc';

    // State nội bộ chỉ dùng cho Input Search (để giữ debounce)
    const [searchTermInput, setSearchTermInput] = useState(currentSearchTerm);

    // Sync internal state with URL on initial load or back/forward navigation
    useEffect(() => {
        setSearchTermInput(currentSearchTerm);
    }, [currentSearchTerm]);

    // ------------------- HÀM XỬ LÝ SỰ KIỆN (UPDATE URL) -------------------

    // Hàm cập nhật Price Range
    const handleSetPriceRange = useCallback(
        (val: [number, number]) => {
            const [min, max] = val;
            // Use a safe, new URLSearchParams instance
            const newSearchParams = new URLSearchParams(
                searchParams?.toString() || '',
            );

            // Update both min and max price in one go
            const minQuery = createQueryString(
                'price_min',
                min,
                newSearchParams,
            );
            const finalQuery = createQueryString(
                'price_max',
                max,
                new URLSearchParams(minQuery),
            );

            updateUrl(finalQuery);
        },
        [searchParams, createQueryString, updateUrl],
    );
    // Memoized Debounce function to update URL
    const debouncedUpdateUrl = useMemo(
        () =>
            debounce((value: string) => {
                const newQuery = createQueryString(
                    'search',
                    value,
                    searchParams || new URLSearchParams(),
                );
                updateUrl(newQuery);
            }, 300),
        [createQueryString, updateUrl, searchParams],
    );
    // Hàm cập nhật Search (Debounced)
    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchTermInput(value); // Update input state immediately

            // Debounce to update URL
            debouncedUpdateUrl(value);
        },
        [setSearchTermInput],
    );

    // Hàm sắp xếp
    const handleSort = useCallback(
        (field: SortByField) => {
            const newSortOrder =
                currentSortBy === field && currentSortOrder === 'desc'
                    ? 'asc'
                    : 'desc';

            const newSearchParams = new URLSearchParams(
                searchParams?.toString() || '',
            );
            const byQuery = createQueryString(
                'sort_by',
                field,
                newSearchParams,
            );
            const finalQuery = createQueryString(
                'sort_order',
                newSortOrder,
                new URLSearchParams(byQuery),
            );

            updateUrl(finalQuery);
        },
        [
            currentSortBy,
            currentSortOrder,
            searchParams,
            createQueryString,
            updateUrl,
        ],
    );

    // Hàm Reset
    const handleReset = useCallback(() => {
        const safePathname = pathname ?? '/'; // fallback to homepage if null
        router.push(safePathname, { scroll: false });
        setSearchTermInput('');
        debouncedUpdateUrl.cancel();
    }, [router, pathname, debouncedUpdateUrl]);

    // Hàm chung cho các Select đơn giản
    const handleSimpleSelectChange = useCallback(
        (key: string, value: string | null) => {
            const newQuery = createQueryString(
                key,
                value,
                searchParams || new URLSearchParams(),
            );
            updateUrl(newQuery);
        },
        [searchParams, createQueryString, updateUrl],
    );

    // ------------------- LỌC DỮ LIỆU (PHỤ THUỘC VÀO URL) -------------------
    // Đây là nơi áp dụng filtering/sorting lên data mock có sẵn

    // Filter dữ liệu dựa trên URL (sử dụng currentXyz)
    const filteredData = useMemo(() => {
        return data.filter((stay: StayDataType) => {
            const price = parsePrice(stay.price);

            const matchesCategory = currentCategory
                ? stay.category?.id.toString() === currentCategory
                : true;

            const matchesPrice =
                price >= currentPriceMin && price <= currentPriceMax;

            const matchesSearch = currentSearchTerm
                ? stay.title
                      .toLowerCase()
                      .includes(currentSearchTerm.toLowerCase())
                : true;

            const matchesBedrooms = currentBedrooms
                ? currentBedrooms === '4+'
                    ? (stay.bedrooms ?? 0) >= 4
                    : (stay.bedrooms ?? 0) === parseInt(currentBedrooms, 10)
                : true;

            return (
                matchesCategory &&
                matchesPrice &&
                matchesSearch &&
                matchesBedrooms
            );
        });
    }, [
        data,
        currentCategory,
        currentPriceMin,
        currentPriceMax,
        currentSearchTerm,
        currentBedrooms,
    ]); // Depend on URL values

    // Sort dữ liệu dựa trên URL
    const sortedData = useMemo(() => {
        const list = [...filteredData];

        if (currentSortBy === 'saleOff') {
            list.sort((a, b) => {
                const aOff = parseSaleOff(a.saleOff);
                const bOff = parseSaleOff(b.saleOff);
                return currentSortOrder === 'asc' ? aOff - bOff : bOff - aOff;
            });
        } else if (currentSortBy === 'viewCount') {
            list.sort((a, b) =>
                currentSortOrder === 'asc'
                    ? a.viewCount - b.viewCount
                    : b.viewCount - a.viewCount,
            );
        } else if (currentSortBy === 'reviewCount') {
            list.sort((a, b) =>
                currentSortOrder === 'asc'
                    ? a.reviewCount - b.reviewCount
                    : b.reviewCount - a.reviewCount,
            );
        }
        return list;
    }, [filteredData, currentSortBy, currentSortOrder]); // Depend on URL values

    // Call onFilter every time the sorted data changes (due to URL change)
    useEffect(() => {
        onFilter?.(sortedData);
    }, [sortedData, onFilter]);

    // ------------------- JSX (Giữ nguyên giao diện) -------------------

    return (
        <div className='space-y-4'>
            <div className='flex items-center justify-between'>
                <h2 className='text-2xl font-semibold'>
                    Bộ lọc khách sạn ({sortedData.length})
                </h2>
            </div>

            {/* Nút sắp xếp */}
            <div className='flex items-center gap-3'>
                <Button
                    variant={
                        currentSortBy === 'saleOff' ? 'default' : 'outline'
                    }
                    size='sm'
                    onClick={() => handleSort('saleOff')}
                    className='flex items-center gap-1'
                >
                    Giảm giá{' '}
                    {currentSortBy === 'saleOff' &&
                        (currentSortOrder === 'desc' ? (
                            <ArrowDown className='w-4 h-4' />
                        ) : (
                            <ArrowUp className='w-4 h-4' />
                        ))}
                </Button>
                <Button
                    variant={
                        currentSortBy === 'viewCount' ? 'default' : 'outline'
                    }
                    size='sm'
                    onClick={() => handleSort('viewCount')}
                    className='flex items-center gap-1'
                >
                    Lượt xem{' '}
                    {currentSortBy === 'viewCount' &&
                        (currentSortOrder === 'desc' ? (
                            <ArrowDown className='w-4 h-4' />
                        ) : (
                            <ArrowUp className='w-4 h-4' />
                        ))}
                </Button>
                <Button
                    variant={
                        currentSortBy === 'reviewCount' ? 'default' : 'outline'
                    }
                    size='sm'
                    onClick={() => handleSort('reviewCount')}
                    className='flex items-center gap-1'
                >
                    Đánh giá{' '}
                    {currentSortBy === 'reviewCount' &&
                        (currentSortOrder === 'desc' ? (
                            <ArrowDown className='w-4 h-4' />
                        ) : (
                            <ArrowUp className='w-4 h-4' />
                        ))}
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant='outline'
                            size='sm'
                            className='flex items-center gap-1'
                        >
                            <SlidersHorizontal className='w-4 h-4' /> Bộ lọc
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-96 space-y-4'>
                        {/* Khoảng giá */}
                        <div>
                            <p className='mb-2 text-sm font-medium'>
                                Khoảng giá (VND):
                            </p>
                            <Slider
                                min={0}
                                max={maxPrice}
                                step={500000}
                                value={[currentPriceMin, currentPriceMax]}
                                onValueChange={handleSetPriceRange}
                            />
                            <div className='flex items-center justify-between mt-3'>
                                <div className='flex flex-col items-start gap-1'>
                                    <span className='text-sm text-gray-600'>
                                        Thấp nhất:
                                    </span>
                                    <Input
                                        type='number'
                                        className='w-40'
                                        step={500000}
                                        value={currentPriceMin}
                                        onChange={(e) => {
                                            const val = Math.max(
                                                0,
                                                Number(e.target.value) || 0,
                                            );
                                            // Update URL with new min value
                                            handleSetPriceRange([
                                                val,
                                                currentPriceMax,
                                            ]);
                                        }}
                                    />
                                </div>
                                <div className='flex flex-col items-start gap-1'>
                                    <span className='text-sm text-gray-600'>
                                        Cao nhất:
                                    </span>
                                    <Input
                                        type='number'
                                        className='w-40'
                                        step={500000}
                                        value={currentPriceMax}
                                        onChange={(e) => {
                                            const val = Math.min(
                                                maxPrice,
                                                Number(e.target.value) ||
                                                    maxPrice,
                                            );
                                            // Update URL with new max value
                                            handleSetPriceRange([
                                                currentPriceMin,
                                                val,
                                            ]);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Loại hình */}
                        <Select
                            onValueChange={(val) =>
                                handleSimpleSelectChange(
                                    'category',
                                    val || null,
                                )
                            }
                            value={currentCategory ?? ''}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder='Chọn loại khách sạn' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='1'>Hotel</SelectItem>
                                <SelectItem value='2'>Resort</SelectItem>
                                <SelectItem value='3'>Villa</SelectItem>
                                <SelectItem value='4'>Homestay</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Phòng ngủ */}
                        <Select
                            onValueChange={(val) =>
                                handleSimpleSelectChange(
                                    'bedrooms',
                                    val || null,
                                )
                            }
                            value={currentBedrooms ?? ''}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder='Số phòng ngủ' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='1'>1</SelectItem>
                                <SelectItem value='2'>2</SelectItem>
                                <SelectItem value='3'>3</SelectItem>
                                <SelectItem value='4'>4+</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Tìm kiếm */}
                        <div className='relative w-full'>
                            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none' />
                            <Input
                                placeholder='Tìm kiếm khách sạn...'
                                onChange={(e) =>
                                    handleSearchChange(e.target.value)
                                }
                                defaultValue={currentSearchTerm}
                                className='pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white'
                            />
                        </div>

                        <Button
                            variant='outline'
                            size='sm'
                            onClick={handleReset}
                            className='flex items-center gap-1 w-full'
                        >
                            <RotateCcw className='w-4 h-4' /> Reset
                        </Button>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};
