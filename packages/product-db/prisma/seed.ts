import {
  PrismaClient,
  InteractionType,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
} from "../generated/prisma/client";
// Lưu ý: Import type từ generated client để đảm bảo type-safe
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

// Hàm tiện ích đọc file JSON an toàn
const readJson = (filename: string) => {
  const filePath = path.join(process.cwd(), "jsons", filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Không tìm thấy file: ${filename} (Bỏ qua bước này)`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

async function main() {
  console.log("🚀 Bắt đầu quá trình Seeding...");

  // --- 0. DỌN DẸP DỮ LIỆU CŨ (Tùy chọn, cẩn thận khi chạy trên Prod) ---
  // Xóa theo thứ tự quan hệ ngược để tránh lỗi khóa ngoại
  // await prisma.recommendation.deleteMany();
  // await prisma.booking.deleteMany();
  // await prisma.interaction.deleteMany();
  // await prisma.searchQueryLog.deleteMany();
  // await prisma.hotel.deleteMany();
  // await prisma.userPreference.deleteMany();
  // await prisma.user.deleteMany();
  // console.log("🗑️  Đã dọn dẹp database cũ.");

  // --- 1. SETUP DEFAULT ADMIN ---
  const adminEmail = "admin@stazy.com";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Stazy Super Admin",
      password: "hashed_password_here", // Thực tế nên hash
      role: "ADMIN",
      avatar: "https://i.pravatar.cc/150?u=admin",
      createdAt: new Date(),
    },
  });
  console.log("👤 Admin setup done.");

  // --- 2. SEED CATEGORIES ---
  const categories = [
    {
      id: 1,
      name: "Khách sạn",
      slug: "khach-san",
      icon: "HiOutlineOfficeBuilding",
    },
    { id: 2, name: "Homestay", slug: "homestay", icon: "HiOutlineHome" },
    { id: 3, name: "Resort", slug: "resort", icon: "HiOutlineSun" },
    { id: 4, name: "Biệt thự", slug: "biet-thu", icon: "HiOutlineKey" },
    { id: 5, name: "Căn hộ", slug: "can-ho", icon: "HiOutlineBuildingOffice2" },
    { id: 6, name: "Nhà gỗ", slug: "nha-go", icon: "HiOutlineTree" },
    { id: 7, name: "Khác", slug: "khac", icon: "HiOutlineDotsHorizontal" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    });
  }
  console.log(`📂 Categories synced.`);

  // --- 3. SEED USERS ---
  // Sử dụng hàm readJson đã viết sẵn, không cần jsonDir hay fs.existsSync thủ công
  const usersData = readJson("__users.json");
  console.log(`👤 Đang xử lý ${usersData.length} Users...`);

  if (usersData.length > 0) {
    for (const userData of usersData) {
      const u: any = userData;

      // 1. Tách 'posts' ra
      const { preference, posts, ...userInfo } = u;

      // 2. Xử lý Preference (Date conversion)
      let formattedPreference = undefined;
      if (preference) {
        formattedPreference = {
          ...preference,
          lastBookingAt: preference.lastBookingAt
            ? new Date(preference.lastBookingAt)
            : null,
          updatedAt: preference.updatedAt
            ? new Date(preference.updatedAt)
            : new Date(),
        };
      }

      // 3. Xử lý User (Date conversion)
      const finalUserData = {
        ...userInfo,
        dob: userInfo.dob ? new Date(userInfo.dob) : null,
        createdAt: userInfo.createdAt
          ? new Date(userInfo.createdAt)
          : new Date(),
        updatedAt: userInfo.updatedAt
          ? new Date(userInfo.updatedAt)
          : new Date(),
      };

      // 4. Upsert
      await prisma.user.upsert({
        where: { id: userInfo.id },
        update: {
          ...finalUserData,
          preference: formattedPreference
            ? {
                upsert: {
                  create: formattedPreference,
                  update: formattedPreference,
                },
              }
            : undefined,
        },
        create: {
          ...finalUserData,
          preference: formattedPreference
            ? { create: formattedPreference }
            : undefined,
        },
      });
    }
  }

  // --- 4. SEED HOTELS & VECTORS ---
  const hotelsData = readJson("__homeStay.json");
  const vectorsData = readJson("__hotel_vectors.json"); // [{id, imageVector, policiesVector}]

  // Tạo Map để tra cứu vector O(1)
  const vectorMap = new Map<any, any>(vectorsData.map((v: any) => [v.id, v]));

  console.log(`🏨 Đang xử lý ${hotelsData.length} Hotels...`);

  for (const hotel of hotelsData) {
    const { id, category, reviewStar, ...rest } = hotel;

    // Chuẩn bị data (loại bỏ field dư thừa, format date)
    const hotelInput = {
      ...rest,
      categoryId: rest.categoryId,
      reviewStar: reviewStar || rest.reviewStar || 0, // Fix naming cũ/mới

      // Map JSON array sang PostgreSQL array (Text[])
      galleryImgs: rest.galleryImgs || [],
      amenities: rest.amenities || [],
      tags: rest.tags || [],
      suitableFor: rest.suitableFor || [], // Enum array
      accessibility: rest.accessibility || [],
      nearbyLandmarks: rest.nearbyLandmarks || [],

      createdAt: rest.createdAt ? new Date(rest.createdAt) : new Date(),
      updatedAt: new Date(), // Luôn update mới nhất

      // Kết nối quan hệ
      // Không cần category: connect vì categoryId đã là foreign key trực tiếp
    };

    // 4.1 Upsert Hotel (Chưa có Vector)
    await prisma.hotel.upsert({
      where: { id: id },
      update: hotelInput,
      create: {
        id, // Giữ ID cứng từ JSON
        ...hotelInput,
      },
    });

    // 4.2 Update Vector (Raw SQL)
    // Lưu ý: Prisma chưa support write vector trực tiếp trong hàm create/update
    const vecData = vectorMap.get(id);
    if (vecData) {
      if (vecData.imageVector) {
        const imgVecStr = `[${vecData.imageVector.join(",")}]`;
        // Lưu ý tên bảng "hotels" (map name) hay "Hotel" (model name) -> Dựa vào schema @@map("hotels")
        await prisma.$executeRaw`UPDATE hotels SET "imageVector" = ${imgVecStr}::vector WHERE id = ${id}`;
      }

      if (vecData.policiesVector) {
        const polVecStr = `[${vecData.policiesVector.join(",")}]`;
        await prisma.$executeRaw`UPDATE hotels SET "policiesVector" = ${polVecStr}::vector WHERE id = ${id}`;
      }
    }
  }

  // --- 5. SEED INTERACTIONS & BOOKINGS ---
  const interactionsData = readJson("__interactions.json");
  console.log(`✨ Đang xử lý ${interactionsData.length} Interactions...`);

  let bookingCount = 0;

  // Xóa interaction cũ để clean state (vì ID interaction tự tăng, khó upsert)
  await prisma.interaction.deleteMany();

  for (const interaction of interactionsData) {
    const { userId, hotelId, type, timestamp, metadata } = interaction;

    // Kiểm tra ràng buộc khóa ngoại (User/Hotel phải tồn tại)
    // Vì ta seed theo thứ tự nên chắc chắn tồn tại, nhưng check cho an toàn

    // 5.1 Create Interaction
    await prisma.interaction.create({
      data: {
        userId,
        hotelId,
        type: type as InteractionType, // Cast về Enum
        timestamp: new Date(timestamp),
        metadata: metadata || {},
      },
    });

    // 5.2 Logic Booking tự động (Derived Data)
    if (type === "BOOK") {
      const checkInDate = new Date(timestamp);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 2); // Mặc định ở 2 đêm

      const totalPrice = metadata?.totalPrice || 2000000;

      await prisma.booking.create({
        data: {
          userId,
          hotelId,

          // Giả lập thông tin khách
          guestName: "Guest Auto Generated",
          guestEmail: `${userId}@example.com`,
          guestPhone: "0909000000",
          adults: metadata?.adults || 2,
          children: metadata?.children || 0,

          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights: 2,

          basePrice: totalPrice,
          totalAmount: totalPrice,

          status: BookingStatus.COMPLETED,
          paymentStatus: PaymentStatus.SUCCEEDED,
          paymentMethod: PaymentMethod.STRIPE,

          createdAt: new Date(timestamp),
        },
      });
      bookingCount++;
    }
  }
  console.log(`✅ Generated ${bookingCount} bookings from interactions.`);

  // --- 6. SEED RECOMMENDATIONS ---
  const recsData = readJson("__recommendations.json");
  console.log(`🔮 Đang seed Recommendations...`);

  for (const rec of recsData) {
    await prisma.recommendation.upsert({
      where: { userId: rec.userId },
      update: {
        hotelIds: rec.hotelIds,
        score: rec.score || {}, // JSON score
      },
      create: {
        userId: rec.userId,
        hotelIds: rec.hotelIds,
        score: rec.score || {},
      },
    });
  }
  // --- 6.5. SEED SEARCH LOGS (FAKE DATA) ---
  console.log("🔍 Đang tạo giả lập lịch sử tìm kiếm...");

  const searchKeywords = [
    "Khách sạn view biển Nha Trang",
    "Homestay Đà Lạt giá rẻ",
    "Resort có hồ bơi vô cực",
    "Biệt thự Vũng Tàu cho nhóm",
    "Chỗ ở gần phố cổ Hội An",
    "Khách sạn tình yêu Sài Gòn",
    "Villa Sapa săn mây",
    "Căn hộ cao cấp Landmark 81",
    "Du lịch bụi Hà Giang",
    "Resort Phú Quốc bãi sao",
    "homestay có bếp tự nấu Sapa",
    "chỗ nghỉ giá dưới 1 triệu ở Phú Quốc",
    "chỗ nghỉ gần sân bay Tân Sơn Nhất",
    "khách sạn có chỗ đậu xe rộng Cần Thơ",
    "nơi ở sinh viên giá rẻ Đà Nẵng",
  ];

  const fakeSearchLogs = []; // Khai báo mảng rỗng, để TS tự suy luận sau
  const usersForLog = await prisma.user.findMany({
    select: { id: true },
    take: 10,
  });

  for (let i = 0; i < 50; i++) {
    // Lấy random user, dùng optional chaining (?.) và fallback null để tránh undefined
    const randomUser =
      usersForLog[Math.floor(Math.random() * usersForLog.length)];
    const userId = Math.random() > 0.3 && randomUser ? randomUser.id : null;

    // 🔥 FIX LỖI CHÍNH: Thêm "|| ''" để đảm bảo query luôn là string, không bao giờ undefined
    const randomQuery =
      searchKeywords[Math.floor(Math.random() * searchKeywords.length)] ||
      "Khách sạn";

    fakeSearchLogs.push({
      userId: userId,
      query: randomQuery,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
      // Ép kiểu 'any' cho filters để Prisma nhận JSON thoải mái
      filters: {
        priceMax: Math.random() > 0.5 ? 2000000 : null,
        amenities: Math.random() > 0.7 ? ["pool", "wifi"] : [],
        guests: Math.random() > 0.6 ? { adults: 2, children: 1 } : null,
      } as any,
    });
  }

  // Dùng createMany
  if (fakeSearchLogs.length > 0) {
    await prisma.searchQueryLog.createMany({
      data: fakeSearchLogs,
    });
    console.log(`✅ Đã tạo ${fakeSearchLogs.length} dòng log tìm kiếm.`);
  }
  // --- 7. RESET SEQUENCE (Quan trọng cho Postgres) ---
  // Reset sequence ID cho bảng hotels, categories... để tránh lỗi duplicate key khi insert mới sau này
  try {
    await prisma.$executeRaw`SELECT setval('hotels_id_seq', (SELECT MAX(id) FROM hotels));`;
    await prisma.$executeRaw`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));`;
    // User ID là string UUID/String nên không cần reset sequence
    console.log("🔄 Sequences reset done.");
  } catch (err) {
    console.warn(
      "⚠️  Không thể reset sequence (Có thể do tên sequence khác nhau tùy môi trường)."
    );
  }

  console.log("🏁 SEEDING HOÀN TẤT! Hệ thống đã sẵn sàng.");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi Seeding Critial:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
