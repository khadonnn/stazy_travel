// seed.ts
import {
  PrismaClient,
  InteractionType,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
} from "../generated/prisma/client";
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

  // --- 0. DỌN DẸP DỮ LIỆU CŨ ---
  // Xóa theo thứ tự để tránh lỗi khóa ngoại (Foreign Key)
  await prisma.systemMetric.deleteMany();
  await prisma.review.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.searchQueryLog.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();

  // Reset ID sequence (Postgres specific)
  try {
    await prisma.$executeRaw`ALTER SEQUENCE hotels_id_seq RESTART WITH 1;`;
    await prisma.$executeRaw`ALTER SEQUENCE categories_id_seq RESTART WITH 1;`;
  } catch (e) {
    // Bỏ qua nếu lỗi
  }

  // --- 1. SETUP DEFAULT ADMIN ---
  const adminEmail = "admin@stazy.com";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Stazy Super Admin",
      password: "hashed_password_here",
      role: "ADMIN",
      avatar: "https://i.pravatar.cc/150?u=admin",
      createdAt: new Date(),
    },
  });
  console.log("👤 Admin setup done.");

  // --- 2. SEED CATEGORIES ---
  const categories = [
    { id: 1, name: "Khách sạn", slug: "khach-san", icon: "🏨" },
    { id: 2, name: "Homestay", slug: "homestay", icon: "🏡" },
    { id: 3, name: "Resort", slug: "resort", icon: "🏖️" },
    { id: 4, name: "Biệt thự", slug: "biet-thu", icon: "🏰" },
    { id: 5, name: "Căn hộ", slug: "can-ho", icon: "🏢" },
    { id: 6, name: "Nhà gỗ", slug: "nha-go", icon: "🏕️" },
    { id: 7, name: "Khác", slug: "khac", icon: "🌍" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    });
  }
  console.log(`📂 Categories synced.`);

  // --- 3. SEED USERS (REAL USERS FROM JSON) ---
  const usersData = readJson("__users.json");
  console.log(`👤 Đang xử lý ${usersData.length} Real Users...`);

  // Tạo Map để tra cứu thông tin User nhanh khi tạo Booking sau này
  const userMap = new Map<string, any>();

  if (usersData.length > 0) {
    for (const userData of usersData) {
      const u: any = userData;
      const { preference, posts, ...userInfo } = u;

      // Lưu vào map để dùng lại
      userMap.set(userInfo.id, userInfo);

      // Xử lý UserPreference dates
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
  const vectorsData = readJson("__hotel_vectors.json");
  const vectorMap = new Map<any, any>(vectorsData.map((v: any) => [v.id, v]));

  console.log(`🏨 Đang xử lý ${hotelsData.length} Hotels...`);

  for (const hotel of hotelsData) {
    const { id, category, reviewStar, name, ...rest } = hotel;
    const hotelInput = {
      ...rest,
      categoryId: rest.categoryId,
      reviewStar: reviewStar || rest.reviewStar || 0,
      roomName: name || "Standard Room",
      galleryImgs: rest.galleryImgs || [],
      amenities: rest.amenities || [],
      tags: rest.tags || [],
      suitableFor: rest.suitableFor || [],
      accessibility: rest.accessibility || [],
      nearbyLandmarks: rest.nearbyLandmarks || [],
      createdAt: rest.createdAt ? new Date(rest.createdAt) : new Date(),
      updatedAt: new Date(),
    };

    await prisma.hotel.upsert({
      where: { id: id },
      update: hotelInput,
      create: { id, ...hotelInput },
    });

    // Update Vectors (Raw SQL)
    const vecData = vectorMap.get(id);
    if (vecData) {
      if (vecData.imageVector) {
        const imgVecStr = `[${vecData.imageVector.join(",")}]`;
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

  // Lấy list ID user hiện có trong DB để đảm bảo tính toàn vẹn dữ liệu
  const existingUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );

  for (const interaction of interactionsData) {
    const { userId, hotelId, type, timestamp, metadata, rating } = interaction;

    // Chỉ tạo interaction nếu User ID tồn tại (Vì interaction được tạo từ file users.json nên chắc chắn tồn tại)
    if (existingUserIds.has(userId)) {
      // Tạo Interaction
      await prisma.interaction.create({
        data: {
          userId,
          hotelId,
          type: type as InteractionType,
          rating: rating || null,
          timestamp: new Date(timestamp),
          metadata: metadata || {},
        },
      });

      // Logic Booking tự động (Derived Data)
      // Logic Booking tự động
      if (type === "BOOK") {
        const checkInDate = new Date(timestamp);
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + 2);
        const totalPrice = metadata?.totalPrice || 2000000;

        // [QUAN TRỌNG] Lấy thông tin User thật
        const realUser = userMap.get(userId);
        const guestName = realUser ? realUser.name : "Guest Unknown";
        const guestEmail = realUser ? realUser.email : `${userId}@example.com`;
        const guestPhone = realUser ? realUser.phone : "0909000000";

        // --- LOGIC MỚI: Random trạng thái thanh toán để biểu đồ đẹp hơn ---
        const rand = Math.random();
        let status: BookingStatus = BookingStatus.COMPLETED;
        let paymentStatus: PaymentStatus = PaymentStatus.SUCCEEDED;

        // 10% là đơn đang chờ thanh toán (Có trong Total, chưa có trong Paid)
        if (rand < 0.1) {
          status = BookingStatus.PENDING;
          paymentStatus = PaymentStatus.PENDING;
        }
        // 5% là đơn đã hủy (Không tính doanh thu hoặc tùy logic dashboard)
        else if (rand < 0.15) {
          status = BookingStatus.CANCELLED;
          paymentStatus = PaymentStatus.REFUNDED;
        }
        // 5% là thanh toán lỗi
        else if (rand < 0.2) {
          status = BookingStatus.PENDING;
          paymentStatus = PaymentStatus.FAILED;
        }
        // 80% còn lại là Thành công (SUCCEEDED)

        await prisma.booking.create({
          data: {
            userId,
            hotelId,
            guestName,
            guestEmail,
            guestPhone,
            adults: metadata?.adults || 2,
            children: metadata?.children || 0,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            nights: 2,
            basePrice: totalPrice,
            totalAmount: totalPrice,

            // Sử dụng biến status đã random ở trên
            status: status,
            paymentStatus: paymentStatus,
            paymentMethod: PaymentMethod.STRIPE,

            createdAt: new Date(timestamp),
          },
        });
      }
    }
  }

  // --- 5.5 SEED REVIEWS ---
  const reviewsData = readJson("__reviews.json");
  console.log(`💬 Đang xử lý ${reviewsData.length} Reviews...`);

  for (const review of reviewsData) {
    if (existingUserIds.has(review.userId)) {
      await prisma.review.create({
        data: {
          userId: review.userId,
          hotelId: review.hotelId,
          rating: review.rating,
          comment: review.comment,
          sentiment: review.sentiment,
          createdAt: new Date(review.createdAt),
        },
      });
    }
  }

  // --- 5.6 SEED SYSTEM METRICS (KPIs) ---
  const metricsData = readJson("__metrics.json");
  if (metricsData && metricsData.length > 0) {
    console.log(`📊 Đang cập nhật ${metricsData.length} dòng AI Metrics...`);
    const formattedMetrics = metricsData.map((m: any) => ({
      rmse: m.rmse,
      precisionAt5: m.precisionAt5,
      recallAt5: m.recallAt5,
      datasetSize: m.datasetSize || 0,
      algorithm: "SVD",
      createdAt: new Date(m.createdAt),
    }));

    await prisma.systemMetric.createMany({
      data: formattedMetrics,
    });
  }

  // --- 6. SEED RECOMMENDATIONS ---
  const recsData = readJson("__recommendations.json");
  console.log(`🔮 Đang seed Recommendations...`);

  for (const rec of recsData) {
    if (existingUserIds.has(rec.userId)) {
      await prisma.recommendation.upsert({
        where: { userId: rec.userId },
        update: {
          hotelIds: rec.hotelIds,
          score: rec.score || {},
        },
        create: {
          userId: rec.userId,
          hotelIds: rec.hotelIds,
          score: rec.score || {},
        },
      });
    }
  }

  // --- 7. RESET SEQUENCE CUỐI CÙNG ---
  try {
    await prisma.$executeRaw`SELECT setval('hotels_id_seq', (SELECT MAX(id) FROM hotels));`;
    await prisma.$executeRaw`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));`;
    await prisma.$executeRaw`SELECT setval('user_preferences_id_seq', (SELECT MAX(id) FROM user_preferences));`;
    console.log("🔄 Sequences reset done.");
  } catch (err) {
    console.warn("⚠️  Không thể reset sequence.");
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
