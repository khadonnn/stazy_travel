// app/search-service/page.jsx

'use client';

import { useState } from 'react';
import {
    Upload,
    Search,
    Sparkles,
    Heart,
    Eye,
    Star,
    Tag,
    Filter,
} from 'lucide-react';
import Image from 'next/image';

export default function SearchServicePage() {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [searchDescription, setSearchDescription] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [activeFilter, setActiveFilter] = useState('onsale');
    const [searchResults, setSearchResults] = useState([
        {
            id: 1,
            name: 'Ocean View Resort',
            price: '400k/đêm',
            rating: 4.8,
            image: 'https://picsum.photos/seed/hotel1/400/300',
        },
        {
            id: 2,
            name: 'Mountain Lodge',
            price: '189k/đêm',
            rating: 4.6,
            image: 'https://picsum.photos/seed/hotel2/400/300',
        },
        {
            id: 3,
            name: 'City Center Hotel',
            price: '249k/đêm',
            rating: 4.7,
            image: 'https://picsum.photos/seed/hotel3/400/300',
        },
        {
            id: 4,
            name: 'Luxury Spa Retreat',
            price: '450k/đêm',
            rating: 4.9,
            image: 'https://picsum.photos/seed/hotel4/400/300',
        },
        {
            id: 5,
            name: 'Beachfront Villa',
            price: '320k/đêm',
            rating: 4.5,
            image: 'https://picsum.photos/seed/hotel5/400/300',
        },
        {
            id: 6,
            name: 'Budget Hostel',
            price: '590k/đêm',
            rating: 4.2,
            image: 'https://picsum.photos/seed/hotel6/400/300',
        },
    ]);

    // Xử lý khi người dùng kéo thả ảnh
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            handleImageUpload(file);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            handleImageUpload(file);
        }
    };

    const handleImageUpload = (file: File) => {
        const validTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ];
        if (!validTypes.includes(file.type)) {
            alert('Vui lòng chọn file ảnh (JPEG, PNG, GIF, WEBP)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            setImagePreview(e.target?.result as string);
            setSelectedImage(file);
        };
        reader.readAsDataURL(file);
    };

    const handleSearch = () => {
        if (!selectedImage && !searchDescription.trim()) {
            alert('Vui lòng tải lên ảnh hoặc nhập mô tả khách sạn để tìm kiếm');
            return;
        }

        console.log({
            image: selectedImage ? 'Có ảnh được tải lên' : 'Không có ảnh',
            description: searchDescription.trim(),
            filter: activeFilter,
        });

        // Trong thực tế, bạn sẽ gọi API ở đây và cập nhật searchResults
        // Ở đây mình chỉ giả lập bằng cách giữ nguyên kết quả mẫu
        alert('Đang tìm kiếm... (Kết quả mẫu sẽ hiển thị bên dưới)');
    };

    // Danh sách các tag khách sạn (nếu cần thêm)
    const hotelTags = [
        { name: 'Beachfront', color: 'bg-blue-500' },
        { name: 'Luxury', color: 'bg-purple-500' },
        { name: 'Budget', color: 'bg-green-500' },
        { name: 'Mountain View', color: 'bg-indigo-500' },
        { name: 'City Center', color: 'bg-orange-500' },
        { name: 'Pet Friendly', color: 'bg-pink-500' },
    ];

    return (
        <div className='min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-6'>
            <div className='max-w-7xl mx-auto mt-10'>
                {/* Header */}
                {/* <div className='text-center mb-8'>
                    <h1 className='text-3xl font-bold mb-2'>
                        Tìm kiếm khách sạn thông minh
                    </h1>
                    <p className='text-gray-300'>
                        Tìm kiếm bằng hình ảnh hoặc mô tả tự nhiên — Lọc theo
                        nhu cầu của bạn
                    </p>
                </div> */}

                {/* Main Layout - Grid 5 cột */}
                <div className='grid grid-cols-1 lg:grid-cols-5 gap-6 mt-2'>
                    {/* Cột 1 & 2: Tìm kiếm */}
                    <div className='lg:col-span-2 space-y-6 lg:sticky lg:top-10 lg:self-start'>
                        {/* Phần 1: Tìm kiếm bằng ảnh */}
                        <div className='bg-gray-800 rounded-xl p-6 shadow-lg'>
                            <h2 className='text-xl font-semibold mb-4 flex items-center gap-2'>
                                <Upload size={20} /> Tìm kiếm bằng hình ảnh
                            </h2>

                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                    isDragging
                                        ? 'border-blue-400 bg-blue-900/20'
                                        : 'border-gray-600 hover:border-gray-500'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className='flex flex-col items-center justify-center'>
                                    <Upload
                                        size={48}
                                        className='mb-4 text-gray-400'
                                    />
                                    <p className='mb-2 text-lg'>
                                        Kéo & thả ảnh vào đây để tải lên
                                    </p>
                                    <p className='text-sm text-gray-400 mb-4'>
                                        Hoặc nhấp vào đây để chọn ảnh
                                    </p>
                                    <p className='text-xs text-gray-500'>
                                        Tỷ lệ khung hình lý tưởng là 1:1
                                    </p>

                                    <input
                                        type='file'
                                        accept='image/*'
                                        onChange={handleFileChange}
                                        className='hidden'
                                        id='image-upload'
                                    />
                                    <label
                                        htmlFor='image-upload'
                                        className='mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded cursor-pointer transition-colors'
                                    >
                                        Chọn ảnh
                                    </label>
                                </div>
                            </div>

                            {/* Preview ảnh đã chọn */}
                            {imagePreview && (
                                <div className='mt-4'>
                                    <h3 className='text-sm font-medium mb-2'>
                                        Ảnh đã chọn:
                                    </h3>
                                    <div className='relative inline-block'>
                                        <Image
                                            src={imagePreview}
                                            alt='Preview'
                                            className='max-w-full h-auto max-h-48 rounded-lg object-cover'
                                            fill
                                        />
                                        <button
                                            onClick={() => {
                                                setSelectedImage(null);
                                                setImagePreview(null);
                                            }}
                                            className='absolute top-2 right-2 bg-red-600 hover:bg-red-700 rounded-full p-1'
                                        >
                                            <svg
                                                xmlns='http://www.w3.org/2000/svg'
                                                width='16'
                                                height='16'
                                                fill='currentColor'
                                                viewBox='0 0 16 16'
                                            >
                                                <path d='M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z' />
                                                <path d='M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z' />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Phần 2: Tìm kiếm bằng mô tả */}
                        <div className='bg-gray-800 rounded-xl p-6 shadow-lg sticky '>
                            <h2 className='text-xl font-semibold mb-4 flex items-center gap-2'>
                                <Search size={20} /> Tìm kiếm bằng mô tả
                            </h2>

                            <div className='space-y-4'>
                                <div className='relative'>
                                    <input
                                        type='text'
                                        placeholder='Nhập mô tả khách sạn bạn muốn tìm...'
                                        value={searchDescription}
                                        onChange={(e) =>
                                            setSearchDescription(e.target.value)
                                        }
                                        className='w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400'
                                    />
                                    <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                                        <Sparkles
                                            size={16}
                                            className='text-gray-400'
                                        />
                                    </div>
                                </div>

                                <div className='flex gap-3'>
                                    <button
                                        onClick={handleSearch}
                                        className='px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg font-medium transition-all flex items-center gap-2'
                                    >
                                        <Search size={18} /> Tìm kiếm
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSearchDescription('');
                                        }}
                                        className='px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors'
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cột 3, 4, 5: Bộ lọc + Kết quả tìm kiếm */}
                    <div className='lg:col-span-3 space-y-6'>
                        {/* Hàng 1: Bộ lọc */}
                        <div className='bg-gray-800 rounded-xl p-6 shadow-lg'>
                            <h2 className='text-xl font-semibold mb-4 flex items-center gap-2'>
                                <Filter size={20} /> Bộ lọc khách sạn
                            </h2>

                            <div className='flex flex-wrap gap-2'>
                                {[
                                    {
                                        id: 'onsale',
                                        label: 'On Sale',
                                        icon: Star,
                                        color: 'bg-yellow-500',
                                    },
                                    {
                                        id: 'view',
                                        label: 'View',
                                        icon: Eye,
                                        color: 'bg-teal-500',
                                    },
                                    {
                                        id: 'like',
                                        label: 'Liked',
                                        icon: Heart,
                                        color: 'bg-pink-500',
                                    },
                                    {
                                        id: 'recommend',
                                        label: 'Recommend',
                                        icon: Tag,
                                        color: 'bg-blue-500',
                                    },
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() =>
                                            setActiveFilter(filter.id)
                                        }
                                        className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 transition-colors ${
                                            activeFilter === filter.id
                                                ? `${filter.color} text-white`
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        <filter.icon size={16} />
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hàng 2 & 3: Hiển thị 6 ảnh khách sạn (2 hàng x 3 cột) */}
                        <div className='bg-gray-800 rounded-xl p-6 shadow-lg'>
                            <h2 className='text-xl font-semibold mb-4'>
                                Kết quả tìm kiếm ({searchResults.length})
                            </h2>

                            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                                {searchResults.map((hotel) => (
                                    <div
                                        key={hotel.id}
                                        className='bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group'
                                    >
                                        <div className='relative w-full h-48'>
                                            <Image
                                                src={hotel.image}
                                                alt={hotel.name}
                                                className=' object-cover'
                                                fill
                                            />
                                            <div className='absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1 text-xs font-medium'>
                                                ⭐ {hotel.rating}
                                            </div>
                                        </div>

                                        <div className='p-4'>
                                            <h3 className='font-semibold text-lg line-clamp-1'>
                                                {hotel.name}
                                            </h3>
                                            <div className='flex justify-between items-center mt-2'>
                                                <span className='text-green-400 font-bold'>
                                                    {hotel.price}
                                                </span>
                                                <button className='text-blue-400 hover:text-blue-300 text-sm font-medium'>
                                                    Chi tiết →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Thẻ khách sạn (tùy chọn, nếu muốn giữ) */}
                        <div className='bg-gray-800 rounded-xl p-6 shadow-lg'>
                            <h3 className='text-lg font-semibold mb-3'>
                                🏷️ Thẻ phổ biến
                            </h3>
                            <div className='flex flex-wrap gap-2'>
                                {hotelTags.slice(0, 4).map((tag, index) => (
                                    <button
                                        key={index}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${tag.color} hover:opacity-90`}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
