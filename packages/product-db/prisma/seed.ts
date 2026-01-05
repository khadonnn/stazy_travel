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

  // --- 2. SEED CATEGORIES ---
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

      if (cat.slug === "khac") {
        defaultCategoryId = savedCat.id;
      }
    }
  } else {
    const cat = await prisma.category.upsert({
      where: { slug: "khac" },
      update: {},
      create: { name: "Khác", slug: "khac" },
    });
    defaultCategoryId = cat.id;
  }

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

    // Đọc file Vector (chứa cả imageVector và textVector nếu có)
    let vectorMap = new Map();
    const vectorPath = path.join(jsonDir, "__hotel_vectors.json");
    if (fs.existsSync(vectorPath)) {
      const vData = JSON.parse(fs.readFileSync(vectorPath, "utf-8"));
      vData.forEach((v: any) => {
        // Lưu cả object vector để lấy cả text và image sau này
        vectorMap.set(v.id, {
          image: v.vector || v.imageVector, // Tùy tên field trong json của bạn
          text: v.textVector,
        });
      });
    }

    console.log("🏨 Đang seed Hotels...");
    for (const item of homeStayData) {
      let categoryId = defaultCategoryId;

      if (item.category) {
        const catSlug = item.category.toLowerCase().replace(/ /g, "-");
        const existingCat = await prisma.category.findUnique({
          where: { slug: catSlug },
        });
        if (existingCat) categoryId = existingCat.id;
      }

      let saleOffPercent = item.saleOffPercent || 0;
      if (item.saleOff && saleOffPercent === 0) {
        const match = String(item.saleOff).match(/(\d+)/);
        if (match) saleOffPercent = parseInt(match[0], 10);
      }
      const hotelSlug =
        item.slug || item.title.toLowerCase().replace(/ /g, "-");

      // 🔥 MỚI: Tạo trường fullDescription cho RAG/Agent đọc
      // Gộp tiêu đề + mô tả + tiện ích + địa chỉ thành 1 văn bản giàu thông tin
      const fullDescText = `
        Tên: ${item.title}.
        Loại hình: ${item.category}.
        Mô tả: ${item.description}.
        Tiện ích: ${Array.isArray(item.amenities) ? item.amenities.join(", ") : item.amenities}.
        Địa chỉ: ${item.address}.
        Giá: ${item.price} VND.
      `.trim();

      const hotelData = {
        title: item.title,
        featuredImage: item.featuredImage,
        description: item.description,

        // 🔥 MỚI: Lưu fullDescription vào DB (nếu schema đã có cột này)
        // Nếu chưa có cột này trong schema.prisma, hãy comment dòng dưới lại
        fullDescription: fullDescText,

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
        reviewCount: item.reviewCount || 0,
        reviewStart: item.reviewStart || 0,
        viewCount: item.viewCount || 0,
        like: item.like ?? false,
        commentCount: item.commentCount || 0,
        saleOff: item.saleOff || null,
        saleOffPercent: saleOffPercent,
      };

      const savedHotel = await prisma.hotel.upsert({
        where: { slug: hotelSlug },
        update: hotelData,
        create: {
          // 🔥 QUAN TRỌNG: BẮT BUỘC PHẢI CÓ DÒNG NÀY ĐỂ KHỚP ID VỚI PYTHON
          id: item.id,
          slug: hotelSlug,
          ...hotelData,
        },
      });

      // --- CẬP NHẬT VECTOR ---
      const vectors = vectorMap.get(item.id);
      if (vectors) {
        // 1. Update Image Vector
        if (vectors.image && vectors.image.length > 0) {
          const imgVecStr = JSON.stringify(vectors.image);
          await prisma.$executeRaw`UPDATE "Hotel" SET "imageVector" = ${imgVecStr}::vector WHERE id = ${savedHotel.id}`;
        }

        // 2. 🔥 MỚI: Update Text Vector (Nếu có trong JSON và Schema)
        // Dùng cho Semantic Search: "Tìm chỗ chill view núi"
        if (vectors.text && vectors.text.length > 0) {
          const txtVecStr = JSON.stringify(vectors.text);
          // Hãy đảm bảo bạn đã thêm cột `textVector` trong schema.prisma
          await prisma.$executeRaw`UPDATE "Hotel" SET "textVector" = ${txtVecStr}::vector WHERE id = ${savedHotel.id}`;
        }
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
    console.log(`✨ Đang xử lý Interactions...`);

    // Xóa cũ insert mới để tránh lỗi ID
    await prisma.interaction.deleteMany({});

    // Lọc user ID hợp lệ
    const existingUsers = await prisma.user.findMany({ select: { id: true } });
    const validUserIds = new Set(existingUsers.map((u) => u.id));

    // Lọc hotel ID hợp lệ
    const existingHotels = await prisma.hotel.findMany({
      select: { id: true },
    });
    const validHotelIds = new Set(existingHotels.map((h) => h.id));

    const formattedInteractions = interactionsData
      .filter(
        (i: any) => validUserIds.has(i.userId) && validHotelIds.has(i.stayId)
      )
      .map((i: any) => ({
        userId: i.userId,
        hotelId: i.stayId,
        action: i.action,
        weight: i.weight,
        createdAt: new Date(i.timestamp),
      }));

    if (formattedInteractions.length > 0) {
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

  // --- 7. 🔥 QUAN TRỌNG: RESET SEQUENCE ID ---
  // Vì chúng ta insert ID cứng (1, 2, 3...), Postgres sequence có thể bị lệch.
  // Cần reset để khi tạo mới khách sạn sau này không bị lỗi "Duplicate ID".
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Hotel"', 'id'), coalesce(max(id)+1, 1), false) FROM "Hotel";`;
  console.log("✅ Đã reset ID sequence.");

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
