// components/LocationMap.tsx
import React from 'react';

interface LocationMapProps {
    address: string | null | undefined; // Có thể là string, null, hoặc undefined
    lat: number | null | undefined; // Tọa độ vĩ độ
    lng: number | null | undefined; // Tọa độ kinh độ
}

const LocationMap: React.FC<LocationMapProps> = ({ address, lat, lng }) => {
    if (
        !address ||
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        isNaN(lat) ||
        isNaN(lng)
    ) {
        return (
            <div className='w-full h-[300px] md:h-[500px] rounded-xl overflow-hidden shadow bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
                <span className='text-neutral-500'>
                    Không có thông tin vị trí
                </span>
            </div>
        );
    }

    const embedUrl = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

    return (
        <div className='w-full h-[300px] md:h-[500px] rounded-xl overflow-hidden shadow'>
            <iframe
                className='w-full h-full rounded-xl'
                loading='lazy'
                allowFullScreen
                src={embedUrl}
                title='Google Map Location'
                style={{ border: 0 }}
                aria-label={`Bản đồ vị trí: ${address}`}
            />
        </div>
    );
};

export default LocationMap;
