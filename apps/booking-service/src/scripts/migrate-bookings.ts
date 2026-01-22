/**
 * MIGRATION SCRIPT: Sync tất cả bookings từ MongoDB sang PostgreSQL
 * Chạy một lần để đồng bộ data cũ
 *
 * Usage: tsx src/scripts/migrate-bookings.ts
 */

import { Booking } from "@repo/booking-db";
import { prisma } from "@repo/product-db";
import { connectBookingDB } from "@repo/booking-db";

const syncBookingToPostgres = async (mongoBooking: any) => {
  try {
    const userId = mongoBooking.userId;
    const hotelId = Number(mongoBooking.hotelId);
    const contactDetails = mongoBooking.contactDetails || {};
    const guestCount = mongoBooking.guestCount || {};
    const totalPrice = Number(mongoBooking.totalPrice || 0);
    const nights = Number(mongoBooking.nights || 1);
    const basePrice = nights > 0 ? totalPrice / nights : totalPrice;

    // Map status
    let pgStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" =
      "PENDING";
    if (
      mongoBooking.status === "CONFIRMED" ||
      mongoBooking.payment?.status === "PAID"
    ) {
      pgStatus = "CONFIRMED";
    } else if (mongoBooking.status === "CANCELLED") {
      pgStatus = "CANCELLED";
    } else if (mongoBooking.status === "COMPLETED") {
      pgStatus = "COMPLETED";
    }

    // Map paymentStatus
    let pgPaymentStatus: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" =
      "PENDING";
    if (mongoBooking.payment?.status === "PAID") {
      pgPaymentStatus = "SUCCEEDED";
    }

    // Upsert vào PostgreSQL
    await prisma.booking.upsert({
      where: { id: mongoBooking.bookingId },
      create: {
        id: mongoBooking.bookingId,
        userId: userId,
        hotelId: hotelId,
        guestName: contactDetails.fullName || "Guest",
        guestEmail: contactDetails.email || "guest@example.com",
        guestPhone: contactDetails.phone || "",
        adults: Number(guestCount.adults || 1),
        children: Number(guestCount.children || 0),
        checkIn: new Date(mongoBooking.checkIn),
        checkOut: new Date(mongoBooking.checkOut),
        nights: nights,
        basePrice: basePrice,
        discount: 0,
        totalAmount: totalPrice,
        currency: "VND",
        paymentMethod: "STRIPE",
        paymentStatus: pgPaymentStatus,
        paymentIntentId:
          mongoBooking.payment?.paymentIntentId ||
          mongoBooking.payment?.stripeSessionId ||
          null,
        status: pgStatus,
        createdAt: mongoBooking.createdAt || new Date(),
      },
      update: {
        status: pgStatus,
        paymentStatus: pgPaymentStatus,
        guestName: contactDetails.fullName || "Guest",
        guestEmail: contactDetails.email || "guest@example.com",
        guestPhone: contactDetails.phone || "",
        adults: Number(guestCount.adults || 1),
        children: Number(guestCount.children || 0),
        nights: nights,
        basePrice: basePrice,
        totalAmount: totalPrice,
        paymentIntentId:
          mongoBooking.payment?.paymentIntentId ||
          mongoBooking.payment?.stripeSessionId ||
          null,
        updatedAt: new Date(),
      },
    });

    return true;
  } catch (error: any) {
    console.error(
      `❌ Failed to sync booking ${mongoBooking.bookingId}:`,
      error.message,
    );
    return false;
  }
};

const main = async () => {
  console.log("🚀 Starting MongoDB → PostgreSQL migration...\n");

  try {
    // 1. Connect to MongoDB
    await connectBookingDB();
    console.log("✅ Connected to MongoDB\n");

    // 2. Fetch all bookings từ MongoDB
    const mongoBookings = await Booking.find().sort({ createdAt: -1 });
    console.log(`📦 Found ${mongoBookings.length} bookings in MongoDB\n`);

    if (mongoBookings.length === 0) {
      console.log("⚠️  No bookings to migrate. Exiting...");
      process.exit(0);
    }

    // 3. Sync từng booking
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < mongoBookings.length; i++) {
      const booking = mongoBookings[i];
      process.stdout.write(
        `\r[${i + 1}/${mongoBookings.length}] Syncing ${booking.bookingId}...`,
      );

      const success = await syncBookingToPostgres(booking);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log("\n\n✨ Migration completed!");
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${mongoBookings.length}\n`);
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

main();
