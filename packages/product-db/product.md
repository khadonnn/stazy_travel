pnpm add -D prisma
pnpm add @prisma/client

- docker > postgrest:latest (600mb)

#

[https://www.prisma.io/docs/guides/turborepo](https://www.prisma.io/docs/guides/turborepo)

# cai db su dung tat ca

--db (Đã lỗi thời)
-datasource-provider <loại_DB> (Được khuyến nghị)

```js
pnpm prisma init --datasource-provider postgresql --output ../generated/prisma
```

#

"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev --skip-generate",
"db:deploy": "prisma migrate deploy"

# Navigate to the project root and run the following command to automatically migrate our database:

> pnpm turbo db:migrate

#

> pnpm turbo db:generate

# packages/database/src/client.ts

              "@repo/typescript-config": "workspace:*"

## Xoa folder migrations > reset

> npx prisma migrate reset --force

## reset

> pnpm --filter @repo/product-db exec prisma migrate reset --force

## reset tạo lại database mới

> npx prisma migrate dev --name <name>

## studio local (packages/product-db)

> pnpm prisma studios

npx prisma migrate dev
pnpm --filter @repo/product-db exec prisma migrate dev --name add_recommendation_relation

> chay seed, chinhr seed trong prisma.config
> npx prisma db seed
