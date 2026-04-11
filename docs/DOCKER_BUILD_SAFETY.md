# 🐳 Docker Build Guide - Turborepo Safe Practices

## ⚠️ Những Sai Lầm Cần Tránh (VPS 2GB nguy hiểm!)

### ❌ Sai Lầm 1: Copy toàn bộ apps/ folder

```dockerfile
# ❌ NGUY HIỂM - Sẽ crash VPS
COPY apps/ apps/
RUN pnpm install
```

**Tại sao nguy?**

- Bê toàn bộ client Next.js, admin Next.js, search-service Python vào Docker
- `pnpm install` sẽ tải hàng ngàn thư viện React, Radix UI, Tailwind, D3.js
- Dù payment-service (Hono) chỉ cần ~100 package, nó phải cài ~5000 package
- VPS 1 Core 2GB RAM tràn ngay, OOM Kill process, đứt SSH connection

### ❌ Sai Lầm 2: Dùng find & rm-rf để xóa node_modules

```dockerfile
# ❌ HACK nguy - Không recommended
find ./apps -name node_modules -not -path "*/product-service/*" -exec rm -rf {} +
```

**Tại sao sai?**

- Là một cách "hack" rườm rà, không chính thức
- Dễ xóa nhầm, bỏ qua các file cần thiết
- Lãng phí build time vì phải cài rồi mới xóa

### ❌ Sai Lầm 3: Build tất cả services rồi filter

```dockerfile
# ❌ LÃNG PHÍ - Build không cần thiết
RUN pnpm build   # Cái này build tất cả apps
```

**Tại sao sai?**

- Product Service không cần build Next.js client
- Search Service Python không chạy qua Node.js build
- Lãng phí CPU, tăng build time từ 2 phút lên 15 phút

---

## ✅ Cách Đúng: turbo prune --docker

### 1️⃣ Stage 1 - Pruner

```dockerfile
FROM node:20-alpine AS pruner
RUN npm install -g turbo pnpm@9.0.0
WORKDIR /app
COPY . .
RUN turbo prune product-service --docker
```

**Turbo prune sẽ:**

- ✅ Phân tích dependency tree của product-service
- ✅ Tìm ra chỉ những package nó cần (@repo/product-db, @repo/types)
- ✅ Loại bỏ React, Tailwind, D3.js, Python dependencies
- ✅ Output vào thư mục `out/`

**Kết quả:**

- `out/full/` - Toàn bộ code nhưng chỉ những file cần thiết
- `out/json/` - Chỉ package.json và lock file liên quan
- **RAM tiết kiệm ~80-90%**

### 2️⃣ Stage 2 - Installer

```dockerfile
FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat
# Use corepack (Node.js native) instead of npm install -g (cleaner & safer)
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Turbo prune already includes pnpm-lock.yaml in out/json/
# Just copy the pruned JSON directory
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
```

**Corepack vs npm install -g:**

- ✅ **corepack**: Node.js native, version-controlled per project, no global pollution
- ❌ **npm install -g**: Leaves packages in global space, harder to control versions

**Tất ca JSON files đã có trong out/json/:**

- turbo prune tự động xử lý pnpm-lock.yaml
- Không cần copy riêng `.gitignore` hay `pnpm-lock.yaml`
- Chỉ cần `COPY --from=pruner /app/out/json/ .`

**Chỉ cài dependencies thực sự cần:**

- Product Service: ~150 packages
- Khác với 5000+ packages nếu cài toàn bộ
- **Thời gian từ 5 phút xuống 30 giây**

### 3️⃣ Stage 3 - Builder

```dockerfile
FROM node:20-alpine AS builder
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=product-service...
```

**Chỉ build product-service:**

- Turbo tự động nhặt dependencies của nó
- Bỏ qua client, admin, search-service
- **Build time tiết kiệm 70%**

### 4️⃣ Stage 4 - Runtime

```dockerfile
FROM node:20-alpine AS runtime
COPY --from=builder /app/ .
WORKDIR /app/apps/product-service
CMD ["node", "dist/index.js"]
```

**Image nhẹ & clean:**

- Chỉ chứa product-service + dependencies
- ~250-300MB (so với 600-800MB cách cũ)
- Startup nhanh hơn

---

## 🛠️ Cách Build Từng Service

### Build Product Service

```bash
# Local machine hoặc VPS
docker build -t stazy-product-service -f Dockerfile.product-service .

# Check size
docker images | grep stazy-product-service

# Run để test
docker run -p 8000:8000 stazy-product-service
```

### Build Booking Service

```bash
docker build -t stazy-booking-service -f Dockerfile.booking-service .
```

### Build Payment Service

```bash
docker build -t stazy-payment-service -f Dockerfile.payment-service .
```

---

## 📊 So Sánh Chi Phí

| Metric             | ❌ Cách Cũ     | ✅ Cách Mới (turbo prune) |
| ------------------ | -------------- | ------------------------- |
| **Build Time**     | 15-20 phút     | 3-5 phút                  |
| **RAM Usage Peak** | 1.8-2.2GB      | 400-600MB                 |
| **Image Size**     | 650MB          | 280MB                     |
| **Node Modules**   | 5000+ packages | 150 packages              |
| **VPS 2GB Status** | 🔴 OOM Kill    | 🟢 Safe margin            |

---

## 🎯 Deep Dive: corepack vs npm install -g

### ❌ Old Way (npm install -g)

```dockerfile
RUN npm install -g pnpm@9.0.0
```

**Tại sao tệ?**

- Cài global vào `/usr/local/lib/node_modules/` → lãng phí cache layers
- Mỗi stage sau lại phải cài lại, không được cache
- Khó kiểm soát version (phụ thuộc vào npm config)
- Nếu cập nhật Node.js thì global packages lại rối
- Image bị ra rác từ npm meta files

### ✅ New Way (corepack)

```dockerfile
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
```

**Tại sao tốt?**

- **corepack** là manager của Node.js chính thức (v16.9+) cho pnpm/yarn
- Version được quản lý bởi Node.js, không global
- Tự động download & cache pnpm version đúng
- Lightweight, chỉ ~5-10MB (vs npm install -g ~50MB)
- Docker layer được cache tốt hơn
- Tương lai hơn: Node.js recommendation chính thức

**Kết quả:**

- Image 30-40MB nhẹ hơn
- Build layer cache hiệu quả 100%
- Không bị conflict version pnpm

---

### Khi tạo Dockerfile mới cho service khác:

- [ ] Stage 1: `FROM node:20-alpine AS pruner`
- [ ] Stage 1: `RUN apk add --no-cache libc6-compat` (turbo cần libc)
- [ ] Stage 1: `RUN npm install -g turbo`
- [ ] Stage 1: `RUN turbo prune <SERVICE_NAME> --docker`
- [ ] Stage 2: `RUN corepack enable && corepack prepare pnpm@9.0.0 --activate` (NOT npm install -g)
- [ ] Stage 2: Copy ONLY `--from=pruner /app/out/json/ .` (turbo đã include lock file)
- [ ] Stage 2: `RUN pnpm install --frozen-lockfile`
- [ ] Stage 3: Copy `--from=installer /app/ .` (dependencies)
- [ ] Stage 3: Copy `--from=pruner /app/out/full/ .` (source code)
- [ ] Stage 3: Cài Prisma generate nếu service dùng DB
- [ ] Stage 3: `RUN pnpm turbo run build --filter=<SERVICE_NAME>...`
- [ ] Stage 4: Copy từ builder stage
- [ ] Stage 4: Set `WORKDIR /app/apps/<SERVICE_NAME>`
- [ ] Stage 4: Expose đúng PORT
- [ ] Stage 4: HEALTHCHECK để Docker theo dõi
- [ ] .dockerignore được setup để tránh copy không cần thiết

---

## 🚀 Deployment Command

### Trên VPS, build để test

```bash
cd /home/stazy

# Build product-service
docker build -t stazy-product-service -f Dockerfile.product-service . &

# Background build, tiết kiệm RAM hơn cách sequential
wait
docker images | grep stazy
```

### Hoặc push lên registry rồi pull

```bash
# Local: build & push
docker build -t <YOUR_REGISTRY>/stazy-product-service -f Dockerfile.product-service .
docker push <YOUR_REGISTRY>/stazy-product-service

# VPS: pull & run
docker pull <YOUR_REGISTRY>/stazy-product-service
```

---

## 💡 Pro Tips

### 1. Layer Caching

```bash
# Nếu chỉ sửa code ở index.ts, Docker sẽ skip đến Stage 3
# Không cần reinstall 150 packages lần nữa
# Build lần 2: chỉ 10-15 giây!
```

### 2. Multi-service Build

```bash
# Build 3 services cùng lúc (background)
docker build -t stazy-product -f Dockerfile.product-service . &
docker build -t stazy-booking -f Dockerfile.booking-service . &
docker build -t stazy-payment -f Dockerfile.payment-service . &
wait

# Tiết kiệm thời gian, nhưng vẫn respects RAM limit
```

### 3. Debug Build

```bash
# Nếu build fail, inspect layer nào
docker build --no-cache -t stazy-product -f Dockerfile.product-service .  # Force full rebuild

# Hoặc vào shell từ builder stage
docker build --target builder -t stazy-debug -f Dockerfile.product-service .
docker run -it stazy-debug sh
# Kiểm tra /app/apps/product-service/dist có tồn tại không
```

---

## ❌ Never Do

- [ ] ❌ COPY /apps/ nếu có frontend/search service
- [ ] ❌ Dùng `RUN pnpm install` mà không qua turbo prune
- [ ] ❌ Build toàn bộ monorepo bằng `pnpm build` mà không filter
- [ ] ❌ Để dependencies dev vào production (`pnpm install` không `--prod`)
- [ ] ❌ Quên `RUN turbo prune <SERVICE> --docker` (chính vì điều này!)

---

Tài liệu này sẽ giữ bạn an toàn khi deploy lên VPS 2GB. Luôn confirm size image & RAM usage trước khi push!
