import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    devIndicators: {
        position: 'bottom-right', // ẩn icon build ở góc trái dưới
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
        ],
    },
};

export default nextConfig;
