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
  const jsonDir = path.join(process.cwd(), "jsons");

  // --- 1. SETUP DEFAULT ADMIN ---
  const defaultAuthor = await prisma.user.upsert({
    where: { email: "admin@stazy.com" },
    update: {},
    create: {
      email: "admin@stazy.com",
      name: "Stazy Admin",
      password: "password123",
      role: "ADMIN",
      avatar: "https://i.pravatar.cc/150?u=admin",
    },
  });

  // --- 2. SEED CATEGORIES (MỚI) ---
  // Đọc từ file __category.json
  const categoryPath = path.join(jsonDir, "__category.json");
  let defaultCategoryId: number | null = null;

  if (fs.existsSync(categoryPath)) {
    const categoriesData = JSON.parse(fs.readFileSync(categoryPath, "utf-8"));
    console.log(`📂 Đang seed ${categoriesData.length} Categories...`);

    for (const cat of categoriesData) {
      const savedCat = await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {
          name: cat.name,
          description: cat.description,
          thumbnail: cat.thumbnail,
          icon: cat.icon,
        },
        create: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          thumbnail: cat.thumbnail,
          icon: cat.icon,
        },
      });

      // Lưu lại ID của danh mục "Khác" để làm fallback
      if (cat.slug === "khac") {
        defaultCategoryId = savedCat.id;
      }
    }
  } else {
    // Fallback nếu không có file json
    const cat = await prisma.category.upsert({
      where: { slug: "khac" },
      update: {},
      create: { name: "Khác", slug: "khac" },
    });
    defaultCategoryId = cat.id;
  }

  // Đảm bảo luôn có 1 category mặc định
  if (!defaultCategoryId) {
    const cat = await prisma.category.findFirst();
    defaultCategoryId = cat?.id || 1;
  }

  // --- 3. SEED USERS ---
  const usersPath = path.join(jsonDir, "__users.json");
  if (fs.existsSync(usersPath)) {
    const usersData = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
    console.log(`👤 Đang seed ${usersData.length} Users...`);

    for (const u of usersData) {
      const { posts, ...userDataRaw } = u;
      const userData = {
        ...userDataRaw,
        dob: userDataRaw.dob ? new Date(userDataRaw.dob) : null,
        createdAt: userDataRaw.createdAt
          ? new Date(userDataRaw.createdAt)
          : new Date(),
        updatedAt: userDataRaw.updatedAt
          ? new Date(userDataRaw.updatedAt)
          : new Date(),
      };

      await prisma.user.upsert({
        where: { id: u.id },
        update: userData,
        create: userData,
      });
    }
  }

  // --- 4. SEED HOTELS & VECTORS ---
  const homeStayPath = path.join(jsonDir, "__homeStay.json");
  if (fs.existsSync(homeStayPath)) {
    const homeStayData = JSON.parse(fs.readFileSync(homeStayPath, "utf-8"));

    let vectorMap = new Map();
    const vectorPath = path.join(jsonDir, "__hotel_vectors.json");
    if (fs.existsSync(vectorPath)) {
      const vData = JSON.parse(fs.readFileSync(vectorPath, "utf-8"));
      vData.forEach((v: any) => vectorMap.set(v.id, v.vector));
    }

    console.log("🏨 Đang seed Hotels...");
    for (const item of homeStayData) {
      // 4.1 Xử lý Category: Tìm category theo slug trong DB trước
      let categoryId = defaultCategoryId;

      if (item.category) {
        const catSlug = item.category.toLowerCase().replace(/ /g, "-");
        // Thử tìm trong DB xem có chưa (đã seed ở bước 2)
        const existingCat = await prisma.category.findUnique({
          where: { slug: catSlug },
        });

        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          // Nếu file category.json thiếu cate này thì tạo mới sơ sài
          const newCat = await prisma.category.upsert({
            where: { slug: catSlug },
            update: {},
            create: { name: item.category, slug: catSlug },
          });
          categoryId = newCat.id;
        }
      }

      let saleOffPercent = item.saleOffPercent || 0;
      if (item.saleOff && saleOffPercent === 0) {
        const match = String(item.saleOff).match(/(\d+)/);
        if (match) {
          saleOffPercent = parseInt(match[0], 10);
        }
      }
      const hotelSlug =
        item.slug || item.title.toLowerCase().replace(/ /g, "-");

      const hotelData = {
        title: item.title,
        featuredImage: item.featuredImage,
        description: item.description,
        address: item.address,
        price: item.price ? String(item.price) : "0",
        galleryImgs: item.galleryImgs || [],
        amenities: item.amenities || [],
        maxGuests: item.maxGuests || 2,
        bedrooms: item.bedrooms || 1,
        bathrooms: item.bathrooms || 1,
        map: item.map || {},
        authorId: defaultAuthor.id,
        categoryId: categoryId,
        isAds: item.isAds || false,

        // --- CẬP NHẬT 5 TRƯỜNG CÒN THIẾU TẠI ĐÂY ---
        reviewCount: item.reviewCount || 0, // Lấy từ JSON
        reviewStart: item.reviewStart || 0, // Lấy từ JSON (Thường là Float trong Prisma)
        viewCount: item.viewCount || 0, // Lấy từ JSON
        like: item.like ?? false, // Lấy từ JSON (Dùng ?? để tránh lỗi nếu là false)
        commentCount: item.commentCount || 0, // Lấy từ JSON
        saleOff: item.saleOff || null, // Ví dụ: "-25% hôm nay"
        saleOffPercent: saleOffPercent, // Số nguyên: 25
      };

      const savedHotel = await prisma.hotel.upsert({
        where: { slug: hotelSlug },
        update: hotelData,
        create: { slug: hotelSlug, ...hotelData },
      });

      const vectorArray = vectorMap.get(item.id);
      if (vectorArray && vectorArray.length > 0) {
        const vectorString = JSON.stringify(vectorArray);
        await prisma.$executeRaw`UPDATE hotels SET "imageVector" = ${vectorString}::vector WHERE id = ${savedHotel.id}`;
      }
    }
  }

  // --- 5. SEED INTERACTIONS ---
  const interactionsPath = path.join(jsonDir, "mock_interactions.json");
  let finalIntPath = interactionsPath;
  if (!fs.existsSync(interactionsPath))
    finalIntPath = path.join(jsonDir, "__mock_interactions.json");

  if (fs.existsSync(finalIntPath)) {
    const interactionsData = JSON.parse(fs.readFileSync(finalIntPath, "utf-8"));
    console.log(`✨ Đang xử lý ${interactionsData.length} Interactions...`);

    const existingUsers = await prisma.user.findMany({ select: { id: true } });
    const validUserIds = new Set(existingUsers.map((u) => u.id));

    const formattedInteractions = interactionsData
      .map((i: any) => ({
        userId: i.userId,
        hotelId: i.stayId,
        action: i.action,
        weight: i.weight,
        createdAt: new Date(i.timestamp),
      }))
      .filter((i: any) => {
        const isValidUser = validUserIds.has(i.userId);
        return isValidUser && i.hotelId;
      });

    if (formattedInteractions.length > 0) {
      await prisma.interaction.deleteMany({});
      await prisma.interaction.createMany({
        data: formattedInteractions,
        skipDuplicates: true,
      });
      console.log(`✅ Đã insert ${formattedInteractions.length} Interactions!`);
    }
  }

  // --- 6. SEED RECOMMENDATIONS ---
  const recPath = path.join(jsonDir, "__recommendations.json");
  if (fs.existsSync(recPath)) {
    const recData = JSON.parse(fs.readFileSync(recPath, "utf-8"));
    console.log(`🔮 Đang seed Recommendations (${recData.length} users)...`);

    for (const rec of recData) {
      try {
        await prisma.recommendation.upsert({
          where: { userId: rec.userId },
          update: { hotelIds: rec.hotelIds },
          create: { userId: rec.userId, hotelIds: rec.hotelIds },
        });
      } catch (e) {}
    }
  }

  console.log("✅ Seed dữ liệu hoàn tất!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
