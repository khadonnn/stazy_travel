import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    devIndicators: {
        position: 'bottom-right', // ẩn icon build ở góc trái dưới
    },
    //  FIX: Exclude Prisma khỏi bundling để tránh warning spam
    serverExternalPackages: [
        '@prisma/client',
        '@prisma/engines',
        '@prisma/adapter-pg',
        'pg',
        'pg-connection-string',
        'mongoose',
    ],
    // Transpile workspace packages (they export .ts files)
    transpilePackages: ['@repo/product-db', '@repo/types', '@repo/booking-db'],

    // Turbopack config — alias server-only modules to stub for browser
    turbopack: {
        resolveAlias: {
            '@repo/product-db': { browser: './src/stubs/product-db-stub.ts' },
            '@repo/booking-db': { browser: './src/stubs/booking-db-stub.ts' },
            pg: { browser: './src/stubs/product-db-stub.ts' },
            '@prisma/adapter-pg': { browser: './src/stubs/product-db-stub.ts' },
            '@prisma/client': { browser: './src/stubs/product-db-stub.ts' },
            'pg-connection-string': { browser: './src/stubs/product-db-stub.ts' },
            'node:module': { browser: './src/stubs/product-db-stub.ts' },
            mongoose: { browser: './src/stubs/booking-db-stub.ts' },
        },
    },

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
