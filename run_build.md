cd d:\it_1doan_totnghiep\stazy

# Bước 1: Cài đặt dependencies (đã chạy rồi, chỉ cần chạy lại nếu pull code mới)

pnpm install

# Bước 2: Kiểm tra type toàn bộ monorepo (đã verify: 10/10 pass)

pnpm turbo run check-types

# Bước 3: Build toàn bộ (tsc cho backend services + next build cho client/admin)

pnpm turbo run build

# Bước 4: Start tất cả services

pnpm turbo run start
