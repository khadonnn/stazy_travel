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
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
};

async function main() {
  console.log("🚀 Bắt đầu quá trình Seeding...");

  // --- 0. DỌN DẸP DỮ LIỆU CŨ ---
  // Xóa theo thứ tự để tránh lỗi khóa ngoại (Foreign Key)
  await prisma.dailyStat.deleteMany(); // <--- MỚI: Xóa thống kê ngày cũ
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
    // Bỏ qua nếu lỗi (do environment khác nhau)
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

  const existingUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id),
  );

  for (const interaction of interactionsData) {
    // MỚI: Thêm sessionId từ JSON
    const { userId, hotelId, type, timestamp, metadata, rating, sessionId } =
      interaction;

    if (existingUserIds.has(userId)) {
      // 5.1 Tạo Interaction
      await prisma.interaction.create({
        data: {
          userId,
          hotelId,
          type: type as InteractionType,
          rating: rating || null, // Hỗ trợ type RATING
          timestamp: new Date(timestamp),
          sessionId: sessionId || null, // Lưu sessionId để vẽ Funnel
          metadata: metadata || {},
        },
      });

      // 5.2 Logic Booking tự động (Derived Data)
      // Chỉ tạo Booking record khi gặp event BOOK.
      // Doanh thu tổng hợp sẽ lấy từ bảng DailyStat, còn bảng Booking dùng cho list view.
      if (type === "BOOK") {
        const checkInDate = new Date(timestamp);
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + 2);
        const totalPrice = metadata?.amount || 2000000;

        const realUser = userMap.get(userId);
        const guestName = realUser ? realUser.name : "Guest Unknown";
        const guestEmail = realUser ? realUser.email : `${userId}@example.com`;
        const guestPhone = realUser ? realUser.phone : "0909000000";
        // Random chọn phương thức thanh toán
        const methods = Object.values(PaymentMethod);
        const randomIndex = Math.floor(Math.random() * methods.length);
        const randomPaymentMethod =
          methods[randomIndex] || PaymentMethod.STRIPE;
        // Random trạng thái thanh toán
        const rand = Math.random();
        let status: BookingStatus = BookingStatus.COMPLETED;
        let paymentStatus: PaymentStatus = PaymentStatus.SUCCEEDED;

        if (rand < 0.1) {
          status = BookingStatus.PENDING;
          paymentStatus = PaymentStatus.PENDING;
        } else if (rand < 0.15) {
          status = BookingStatus.CANCELLED;
          paymentStatus = PaymentStatus.REFUNDED;
        } else if (rand < 0.2) {
          status = BookingStatus.PENDING;
          paymentStatus = PaymentStatus.FAILED;
        }

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
            status: status,
            paymentStatus: paymentStatus,
            paymentMethod: randomPaymentMethod,
            createdAt: new Date(timestamp),
            // Nếu bảng Booking của bạn có cột sessionId, hãy thêm vào đây:
            // sessionId: sessionId
          },
        });
      }
    }
  }

  // --- 5.5 SEED REVIEWS ---
  // Sync với Interaction type RATING
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

  // --- 6. SEED DAILY STATS (MỚI) ---
  // Dữ liệu này được tổng hợp sẵn từ Python Script
  const dailyStatsData = readJson("__daily_stats.json");
  if (dailyStatsData && dailyStatsData.length > 0) {
    console.log(`📈 Đang seed ${dailyStatsData.length} Daily Stats...`);
    await prisma.dailyStat.createMany({
      data: dailyStatsData.map((stat: any) => ({
        date: new Date(stat.date),
        totalRevenue: stat.totalRevenue,
        totalBookings: stat.totalBookings,
        totalViews: stat.totalViews,
        conversionRate: stat.conversionRate,
        // Nếu có trường khác trong schema thì map vào đây
      })),
      skipDuplicates: true,
    });
  }

  // --- 7. SEED SYSTEM METRICS & TUNING (KPIs) ---
  const metricsData = readJson("__metrics.json"); // File này chứa cả tuning params
  if (metricsData && metricsData.length > 0) {
    console.log(`📊 Đang cập nhật AI Metrics & Tuning Data...`);

    const formattedMetrics = metricsData.map((m: any) => ({
      algorithm: "SVD",
      rmse: m.rmse,
      precisionAt5: m.precisionAt5,
      recallAt5: m.recallAt5,
      datasetSize: m.datasetSize || 0,
      executionTimeMs: m.executionTimeMs || 0, // MỚI: Thời gian chạy
      // MỚI: Lưu params tuning (K vs RMSE) vào JSON
      tuningParams: m.tuningParams ? m.tuningParams : {},
      createdAt: new Date(m.createdAt),
    }));

    await prisma.systemMetric.createMany({
      data: formattedMetrics,
    });
  }

  // --- 8. SEED RECOMMENDATIONS ---
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

  // --- 9. RESET SEQUENCE CUỐI CÙNG ---
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
    console.error("❌ Lỗi Seeding Critical:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
