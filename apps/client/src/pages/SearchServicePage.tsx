'use client';

import { useEffect, useState } from 'react';
import {
    Upload,
    Search,
    Sparkles,
    Heart,
    Star,
    Tag,
    X,
    Waves,
    Mountain,
    Building2,
    Palmtree,
    Crown,
    Loader2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Import file dữ liệu gốc
import allStays from '@/data/jsons/__homeStay.json';

// 👇 Khai báo kiểu để tránh lỗi amenities
interface HotelStay {
    id: number;
    authorId: string;
    date: string;
    href: string;
    listingCategoryId: number;
    title: string;
    featuredImage: string;
    galleryImgs: string[];
    amenities: string[];
    description: string;
    price: number;
    address: string;
    reviewStart: number;
    reviewCount: number;
    viewCount: number;
    like: boolean;
    commentCount: number;
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
}

const typedAllStays = allStays as HotelStay[];

export default function SearchServicePage() {
    // --- STATE QUẢN LÝ ---
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [searchDescription, setSearchDescription] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [activeFilter, setActiveFilter] = useState('recommend');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // --- HÀM BỔ TRỢ: CẬP NHẬT UI TỪ KẾT QUẢ AI ---
    const updateUIWithResults = (matches: any[]) => {
        if (!matches) return;
        const matchIds = matches.map((m) => m.id);

        const filteredResults = typedAllStays
            .filter((stay) => matchIds.includes(stay.id))
            .map((stay) => {
                const matchInfo = matches.find((m) => m.id === stay.id);
                return {
                    id: stay.id,
                    name: stay.title,
                    price: stay.price.toLocaleString('vi-VN') + 'đ',
                    rating: stay.reviewStart,
                    image: stay.featuredImage,
                    amenities: stay.amenities,
                    score: matchInfo?.score || 0.9,
                };
            })
            .sort((a, b) => (b.score || 0) - (a.score || 0));
        setSearchResults(filteredResults);
    };

    // --- 1. TỰ ĐỘNG GỢI Ý KHI LOAD TRANG ---
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('http://localhost:8008/recommend/u1');
                if (res.ok) {
                    const matches = await res.json();
                    updateUIWithResults(matches);
                }
            } catch (e) {
                console.log('⚠️ Server AI chưa bật, hiển thị data mặc định');
                updateUIWithResults(
                    typedAllStays
                        .slice(0, 6)
                        .map((s) => ({ id: s.id, score: 0.9 })),
                );
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // --- 🌟 MỚI: PHÁT HIỆN TỪ KHÓA ĐỂ LỌC THEO AMENITIES ---
    const handleKeywordSearch = (text: string): boolean => {
        const lowerText = text.toLowerCase();

        // Xác định từ khóa → amenities tương ứng
        let targetAmenities: string[] = [];
        let matchedTagId: string | null = null;

        if (lowerText.includes('biển')) {
            targetAmenities = ['beach-view', 'sea-view'];
            matchedTagId = 'beach';
        } else if (lowerText.includes('núi')) {
            targetAmenities = ['mountain-view'];
            matchedTagId = 'mountain';
        } else if (
            lowerText.includes('thành phố') ||
            lowerText.includes('đô thị') ||
            lowerText.includes('trung tâm')
        ) {
            targetAmenities = ['city-view'];
            matchedTagId = 'city';
        }

        if (targetAmenities.length > 0) {
            const localResults = typedAllStays
                .filter((stay) =>
                    stay.amenities.some((a) => targetAmenities.includes(a)),
                )
                .map((stay) => ({
                    id: stay.id,
                    name: stay.title,
                    price: stay.price.toLocaleString('vi-VN') + 'đ',
                    rating: stay.reviewStart,
                    image: stay.featuredImage,
                    amenities: stay.amenities,
                    score: 0.95,
                    matchedTagId, // dùng để highlight tag
                }))
                .sort(() => 0.5 - Math.random())
                .slice(0, 20);

            setSearchResults(localResults);
            setIsLoading(false);
            return true;
        }
        return false;
    };

    // --- 2. XỬ LÝ TÌM KIẾM (Hybrid Search) ---
    const handleSearch = async (overrideText?: string) => {
        const textToSearch = overrideText || searchDescription.trim();
        if (!selectedImage && !textToSearch) {
            alert('Vui lòng chọn ảnh hoặc nhập mô tả');
            return;
        }

        setIsLoading(true);

        if (selectedImage) {
            const reader = new FileReader();
            reader.readAsDataURL(selectedImage);
            reader.onloadend = async () => {
                const base64Image = reader.result as string;
                try {
                    const res = await fetch(
                        'http://localhost:8008/search-by-base64',
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image: base64Image }),
                        },
                    );
                    const matches = await res.json();
                    updateUIWithResults(matches);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            };
        } else {
            // 👇 Ưu tiên xử lý từ khóa đặc biệt trước
            const isKeywordSearch = handleKeywordSearch(textToSearch);
            if (!isKeywordSearch) {
                // Nếu không phải → gọi AI như cũ
                try {
                    const res = await fetch(
                        'http://localhost:8008/search-by-text',
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ description: textToSearch }),
                        },
                    );
                    const matches = await res.json();
                    updateUIWithResults(matches);
                } catch (error) {
                    console.error('Lỗi server AI:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        }
    };

    const handleImageUpload = (file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
            setSelectedImage(file);
        };
        reader.readAsDataURL(file);
    };

    // --- DANH SÁCH TAGS THEO KỊCH BẢN ---
    const hotelTags = [
        {
            id: 'beach',
            name: 'Tắm biển ',
            icon: Waves,
            color: 'bg-cyan-600',
            query: 'beach resort ocean',
        },
        {
            id: 'mountain',
            name: 'Vùng núi',
            icon: Mountain,
            color: 'bg-emerald-600',
            query: 'mountain forest sapa',
        },
        {
            id: 'city',
            name: 'Đô thị',
            icon: Building2,
            color: 'bg-slate-500',
            query: 'city center hotel',
        },
        {
            id: 'pool',
            name: 'Hồ bơi',
            icon: Palmtree,
            color: 'bg-blue-500',
            query: 'swimming pool',
        },
        {
            id: 'luxury',
            name: 'Cao cấp',
            icon: Crown,
            color: 'bg-amber-600',
            query: 'luxury villa resort',
        },
    ];

    const filters = [
        {
            id: 'recommend',
            label: 'Gợi ý AI',
            icon: Sparkles,
            color: 'bg-blue-500',
        },
        { id: 'onsale', label: 'Giảm giá', icon: Star, color: 'bg-yellow-500' },
        { id: 'like', label: 'Yêu thích', icon: Heart, color: 'bg-pink-500' },
    ];

    // --- 🌟 MỚI: XÁC ĐỊNH TAG NÀO LIÊN QUAN DỰA TRÊN KẾT QUẢ HIỆN TẠI ---
    const getRelevantTagIds = () => {
        const relevant: Set<string> = new Set();

        for (const hotel of searchResults) {
            if (
                hotel.amenities?.some((a: string) =>
                    ['beach-view', 'sea-view'].includes(a),
                )
            ) {
                relevant.add('beach');
            }
            if (hotel.amenities?.some((a: string) => a === 'mountain-view')) {
                relevant.add('mountain');
            }
            if (hotel.amenities?.some((a: string) => a === 'city-view')) {
                relevant.add('city');
            }
            // Thêm pool/luxury nếu cần
        }

        return relevant;
    };

    const relevantTagIds = getRelevantTagIds();

    return (
        <div className='min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white p-4 md:p-8'>
            {/* ... phần giao diện TRÁI giữ nguyên ... */}
            <div className='max-w-7xl mx-auto'>
                <div className='grid grid-cols-1 lg:grid-cols-5 gap-8'>
                    {/* CỘT TRÁI */}
                    <div className='lg:col-span-2 space-y-6 lg:sticky lg:top-8 lg:self-start'>
                        {/* ... Upload và search form giữ nguyên ... */}
                        <div className='bg-gray-800/50 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-2xl'>
                            <h2 className='text-xl font-bold mb-6 flex items-center gap-2'>
                                <Upload className='text-blue-400' /> AI Visual
                                Search
                            </h2>
                            {/* ... drag & drop ... */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    handleImageUpload(
                                        e.dataTransfer.files[0] as File,
                                    );
                                }}
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                                    isDragging
                                        ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                                        : 'border-gray-600 hover:border-gray-500'
                                }`}
                                onClick={() =>
                                    document.getElementById('img-up')?.click()
                                }
                            >
                                <Upload
                                    size={40}
                                    className='mx-auto mb-4 text-gray-500'
                                />
                                <p className='text-gray-300 mb-2'>
                                    Kéo ảnh vào đây
                                </p>
                                <p className='text-xs text-gray-500'>
                                    Hoặc nhấp để chọn ảnh từ máy
                                </p>
                                <input
                                    type='file'
                                    accept='image/*'
                                    className='hidden'
                                    id='img-up'
                                    onChange={(e) =>
                                        e.target.files &&
                                        handleImageUpload(
                                            e.target.files[0] as File,
                                        )
                                    }
                                />
                            </div>

                            {imagePreview && (
                                <div className='mt-6 relative w-full h-52 rounded-xl overflow-hidden ring-2 ring-blue-500/50 shadow-xl'>
                                    <Image
                                        src={imagePreview}
                                        alt='Preview'
                                        fill
                                        className='object-cover'
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImage(null);
                                            setImagePreview(null);
                                        }}
                                        className='absolute top-3 right-3 bg-red-600 text-white p-1 rounded-full z-20 hover:scale-110 transition-transform'
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className='bg-gray-800/50 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-2xl'>
                            <h2 className='text-xl font-bold mb-4 flex items-center gap-2'>
                                <Search className='text-purple-400' /> Tìm bằng
                                mô tả
                            </h2>

                            {/* TAGS GỢI Ý NHANH */}
                            <div className='bg-gray-800/30 rounded-2xl p-6 border border-gray-800 shadow-inner'>
                                <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2'>
                                    <Tag size={16} /> Gợi ý chủ đề nhanh
                                </h3>
                                <div className='flex flex-wrap gap-3'>
                                    {hotelTags.map((tag) => {
                                        const isActive =
                                            searchDescription === tag.name;
                                        return (
                                            <button
                                                key={tag.id}
                                                disabled={isLoading}
                                                onClick={() => {
                                                    setSearchDescription(
                                                        tag.name,
                                                    );
                                                    handleSearch(tag.query);
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase transition-all duration-300
                          ${isActive ? `${tag.color} text-white shadow-lg scale-105` : 'bg-gray-700/40 text-gray-400 grayscale hover:grayscale-0 hover:bg-gray-700 hover:text-white'}
                          disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {isLoading && isActive ? (
                                                    <Loader2
                                                        size={14}
                                                        className='animate-spin'
                                                    />
                                                ) : (
                                                    <tag.icon size={14} />
                                                )}
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className='space-y-4 mt-4'>
                                <div className='relative'>
                                    <input
                                        type='text'
                                        placeholder='Bạn muốn nghỉ dưỡng ở đâu...'
                                        value={searchDescription}
                                        onChange={(e) =>
                                            setSearchDescription(e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' && handleSearch()
                                        }
                                        className='w-full px-4 py-3.5 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none'
                                    />
                                    <Sparkles
                                        size={18}
                                        className='absolute right-4 top-1/2 -translate-y-1/2 text-purple-400/50'
                                    />
                                </div>
                                <button
                                    onClick={() => handleSearch()}
                                    disabled={isLoading}
                                    className='w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed'
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2
                                                size={20}
                                                className='animate-spin'
                                            />{' '}
                                            AI đang phân tích...
                                        </>
                                    ) : (
                                        <>
                                            <Search size={20} /> Khám phá ngay
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI */}
                    <div className='lg:col-span-3 space-y-8'>
                        {/* 🌟 CẬP NHẬT: "Các chủ đề tìm kiếm liên quan" DỰA TRÊN amenities */}
                        <div className='bg-gray-800/30 rounded-2xl p-6 border border-gray-800 shadow-inner'>
                            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2'>
                                <Tag size={16} /> Các chủ đề tìm kiếm liên quan
                            </h3>
                            <div className='flex flex-wrap gap-3'>
                                {hotelTags.map((tag) => {
                                    const isActive =
                                        searchDescription === tag.name;
                                    const isRelevant = relevantTagIds.has(
                                        tag.id,
                                    );

                                    return (
                                        <button
                                            key={tag.id}
                                            disabled={isLoading}
                                            onClick={() => {
                                                setSearchDescription(tag.name);
                                                handleSearch(tag.query);
                                            }}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase transition-all duration-300
                        ${isActive || isRelevant ? `${tag.color} text-white shadow-lg scale-105 ring-2 ring-white/20` : 'bg-gray-700/40 text-gray-400 grayscale hover:grayscale-0 hover:bg-gray-700 hover:text-white'}
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {isLoading && isActive ? (
                                                <Loader2
                                                    size={14}
                                                    className='animate-spin'
                                                />
                                            ) : (
                                                <tag.icon size={14} />
                                            )}
                                            {tag.name}
                                            {isRelevant && !isActive && (
                                                <span className='w-1.5 h-1.5 bg-white rounded-full animate-pulse ml-1' />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* KẾT QUẢ */}
                        <div className='border border-gray-700/50 bg-gray-800/30 rounded-2xl p-6'>
                            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8'>
                                <h2 className='text-2xl font-black'>
                                    Kết quả{' '}
                                    <span className='text-blue-400 ml-2'>
                                        {searchResults.length}
                                    </span>
                                </h2>
                                <div className='flex bg-gray-900/80 p-1 rounded-xl border border-gray-800'>
                                    {filters.map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() =>
                                                setActiveFilter(f.id)
                                            }
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                                activeFilter === f.id
                                                    ? `${f.color} text-white`
                                                    : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                        >
                                            <f.icon size={14} /> {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                                {searchResults.map((hotel) => (
                                    <Link
                                        key={hotel.id}
                                        href={`/hotels/${hotel.id}`}
                                        className='group bg-gray-800/40 rounded-2xl overflow-hidden border border-gray-800 hover:border-blue-500/50 transition-all block'
                                    >
                                        <div className='relative w-full h-44 overflow-hidden'>
                                            <Image
                                                src={hotel.image}
                                                alt={hotel.name}
                                                fill
                                                className='object-cover'
                                            />
                                            <div className='absolute top-2 left-2 bg-blue-600/80 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold'>
                                                Khớp:{' '}
                                                {Math.round(
                                                    (hotel.score || 0.9) * 100,
                                                )}
                                                %
                                            </div>
                                        </div>
                                        <div className='p-4'>
                                            <h3 className='font-bold text-sm line-clamp-1 group-hover:text-blue-400'>
                                                {hotel.name}
                                            </h3>
                                            <div className='flex flex-wrap gap-1 mt-2 mb-3'>
                                                {hotel.amenities
                                                    ?.slice(0, 3)
                                                    .map((tag: string) => (
                                                        <span
                                                            key={tag}
                                                            className='px-2 py-0.5 bg-gray-700/50 text-[9px] text-gray-400 rounded-md border border-gray-600'
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                            </div>
                                            <div className='flex justify-between items-center mt-auto'>
                                                <span className='text-blue-400 font-black text-xs'>
                                                    {hotel.price}
                                                </span>
                                                <span className='text-[9px] font-bold uppercase text-gray-500'>
                                                    Chi tiết →
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
