import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Bắt đầu seed dữ liệu...");

  const filePath = path.join(process.cwd(), "jsons", "__homeStay.json");
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Không tìm thấy file tại: ${filePath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // 1. Tạo User Admin
  const defaultAuthor = await prisma.user.upsert({
    where: { email: "admin@stazy.com" },
    update: {},
    create: {
      email: "admin@stazy.com",
      name: "Stazy Admin",
      password: "01234433034a",
      role: "ADMIN",
    },
  });

  // 🔥 QUAN TRỌNG: Tạo Category mặc định trước
  // Để đảm bảo luôn có ít nhất 1 category cho trường hợp item không có category
  const defaultCategory = await prisma.category.upsert({
    where: { slug: "khac" },
    update: {},
    create: {
      name: "Khác",
      slug: "khac",
    },
  });

  console.log(
    `👤 Author: ${defaultAuthor.name} | Default Cat ID: ${defaultCategory.id}`
  );

  // 2. Loop qua dữ liệu
  for (const item of data) {
    // ✅ FIX: Gán mặc định bằng ID thật vừa tạo, KHÔNG được hardcode số 1
    let categoryId = defaultCategory.id;

    // Xử lý Category riêng (nếu item có category cụ thể)
    if (item.category) {
      const catSlug = item.category.toLowerCase().replace(/ /g, "-");
      const category = await prisma.category.upsert({
        where: { slug: catSlug },
        update: {},
        create: {
          name: item.category,
          slug: catSlug,
        },
      });
      categoryId = category.id;
    }

    // Tách % giảm giá
    let saleOffPercent = 0;
    if (item.saleOff) {
      const match = String(item.saleOff).match(/(\d+)/);
      if (match) {
        saleOffPercent = parseInt(match[0], 10);
      }
    }

    // Xử lý Hotel
    await prisma.hotel.create({
      data: {
        title: item.title,
        slug: item.slug || item.title.toLowerCase().replace(/ /g, "-"),
        featuredImage: item.featuredImage || "https://placehold.co/600x400",
        description: item.description || "Mô tả đang cập nhật...",
        address: item.address || "Việt Nam",
        price: item.price ? String(item.price) : "0",
        galleryImgs: item.galleryImgs || [],
        amenities: item.amenities || [],
        maxGuests: item.maxGuests || 2,
        bedrooms: item.bedrooms || 1,
        bathrooms: item.bathrooms || 1,
        map: item.map || {},
        authorId: defaultAuthor.id,

        // ✅ Dùng categoryId chuẩn (hoặc là default, hoặc là cái mới tạo)
        categoryId: categoryId,

        isAds: item.isAds || false,
        saleOff: item.saleOff || null,
        saleOffPercent: saleOffPercent,
      },
    });
  }

  console.log(`✅ Đã import thành công ${data.length} khách sạn!`);
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
