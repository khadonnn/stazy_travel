import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tắt source map warnings trong dev
  productionBrowserSourceMaps: false,

  // Transpile workspace packages (they export .ts files, not compiled .js)
  transpilePackages: ["@repo/product-db", "@repo/types", "@repo/booking-db"],

  // FIX: Exclude Node.js-only packages khỏi bundling (pg, prisma-adapter, mongoose)
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/engines",
    "@prisma/adapter-pg",
    "pg",
    "pg-connection-string",
    "mongoose",
  ],

  // Turbopack config — alias server-only modules to stub for browser
  turbopack: {
    resolveAlias: {
      // Prevent Node.js-only packages from being bundled into browser
      "@repo/product-db": {
        browser: "./src/stubs/product-db-stub.ts",
      },
      pg: { browser: "./src/stubs/product-db-stub.ts" },
      "@prisma/adapter-pg": { browser: "./src/stubs/product-db-stub.ts" },
      "@prisma/client": { browser: "./src/stubs/product-db-stub.ts" },
      "pg-connection-string": { browser: "./src/stubs/product-db-stub.ts" },
      "node:module": { browser: "./src/stubs/product-db-stub.ts" },
      "@clerk/nextjs/server": { browser: "./src/stubs/clerk-stub.ts" },
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "loremflickr.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
