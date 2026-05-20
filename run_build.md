cd d:\it_1doan_totnghiep\stazy

# Bước 1: Cài đặt dependencies (đã chạy rồi, chỉ cần chạy lại nếu pull code mới)

pnpm install

# Bước 2: Kiểm tra type toàn bộ monorepo (đã verify: 10/10 pass)

pnpm turbo run check-types

# Bước 3: Build toàn bộ (tsc cho backend services + next build cho client/admin)

pnpm turbo run build

# Bước 4: Start tất cả services

pnpm turbo run start

##

# ✅ Monorepo Build Pipeline — Fully Working

## Final Results

| Command                      | Result                              |
| ---------------------------- | ----------------------------------- |
| `pnpm turbo run check-types` | ✅ **10/10 pass**                   |
| `pnpm turbo run build`       | ✅ **8/8 build successful** (1m15s) |

## Build Output Summary

| Package           | Build Type               | Status |
| ----------------- | ------------------------ | ------ |
| `gateway`         | `tsc` → `dist/`          | ✅     |
| `product-service` | `tsc` → `dist/`          | ✅     |
| `booking-service` | `tsc` → `dist/`          | ✅     |
| `payment-service` | `tsc` → `dist/`          | ✅     |
| `socket-service`  | `tsc` → `dist/`          | ✅     |
| `email-service`   | `tsc` → `dist/`          | ✅     |
| `client`          | `next build` (23 routes) | ✅     |
| `admin`           | `next build` (23 routes) | ✅     |

## All Modified Files

### Build Config Fixes

- `apps/product-service/tsconfig.json` — added rootDir/outDir/include/exclude
- `apps/booking-service/tsconfig.json` — added rootDir/outDir/include/exclude
- `apps/payment-service/tsconfig.json` — added rootDir/outDir/include/exclude
- `apps/socket-service/tsconfig.json` — added rootDir/outDir/include/exclude
- `packages/bullmq/tsconfig.json` — created new
- `packages/bullmq/package.json` — added @repo/typescript-config
- `packages/types/package.json` — fixed typo `src/index/ts` → `./src/index.ts`
- 6 backend `package.json` — fixed `main` field to `dist/index.js`, added missing deps/scripts

### Client Build Fixes

- `apps/client/next.config.ts` — added serverExternalPackages, transpilePackages, turbopack.resolveAlias
- `apps/client/src/stubs/product-db-stub.ts` — browser stub for Prisma
- `apps/client/src/stubs/clerk-stub.ts` — browser stub for Clerk
- `apps/client/src/views/` — renamed from `pages/` to prevent Pages Router conflicts
- `apps/client/src/components/ProfileUserPage.tsx` — moved from pages to components
- `apps/client/src/app/checkout/page.tsx` — added Suspense boundary
- `apps/client/src/app/return/page.tsx` — added Suspense boundary
- `apps/client/src/app/chat/[chatId]/page.tsx` — added Suspense boundary
- `apps/client/src/app/profile/[id]/page.tsx` — force-dynamic, updated import
- `apps/client/src/app/cart/page.tsx` — updated import to `@/views/`
- `apps/client/src/app/hotels/page.tsx` — updated import to `@/views/`
- `apps/client/src/app/hotels/[slug]/page.tsx` — updated import to `@/views/`
- `apps/client/src/app/search-service/page.tsx` — updated import to `@/views/`
- `apps/client/src/views/CartPage.tsx` — Suspense wrapper for useSearchParams
- `apps/client/src/assets/bg.jpg` — placeholder image

### Admin Build Fixes

- `apps/admin/next.config.ts` — added transpilePackages, turbopack.resolveAlias for pg/mongoose
- `apps/admin/src/stubs/product-db-stub.ts` — browser stub for Prisma
- `apps/admin/src/stubs/booking-db-stub.ts` — browser stub for Mongoose

## Running

```bash
cd d:\it\_1doan_totnghiep\stazy

# Dev mode
pnpm turbo run dev

# Production build + start
pnpm turbo run build
pnpm turbo run start
```

## Warnings (non-blocking)

- `baseline-browser-mapping` is outdated — run `npm i baseline-browser-mapping@latest -D` to update
- `@prisma/adapter-pg` can't be external warning — informational only, build still succeeds
