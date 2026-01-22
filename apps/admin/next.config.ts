import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    devIndicators: {
        position: 'bottom-right', // ẩn icon build ở góc trái dưới
    },
    //  FIX: Exclude Prisma khỏi bundling để tránh warning spam
    serverExternalPackages: ['@prisma/client', '@prisma/engines'],
    // Tắt source maps để tránh warning với mongoose
    productionBrowserSourceMaps: false,
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
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '3003', // Port của Client App
                pathname: '/locations/**', // Chỉ cho phép thư mục locations (để an toàn)
            },
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'loremflickr.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'i.pravatar.cc',
                port: '',
                pathname: '/**',
            },
            {
                hostname: 'github.com',
                protocol: 'https',
                port: '',
                pathname: '/**',
            },
            { hostname: 'img.clerk.com', protocol: 'https', port: '', pathname: '/**' },
        ],
    },
};

export default nextConfig;
