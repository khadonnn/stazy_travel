import { redlock } from "../utils/redis";
import crypto from "crypto";
import { prisma } from "@repo/product-db";
import type { Prisma } from "@repo/product-db";
import type { Queue } from "@repo/bullmq";
import type { SagaTimeoutJobData } from "../queues/saga-timeout.queue.js";

type BookingDbClient = Prisma.TransactionClient | typeof prisma;

// =========================================================
// HÀM CHÍNH: TẠO BOOKING (SINGLE TRANSACTION - POSTGRES ONLY)
// Gọi hàm này ở Controller khi User bấm "Đặt phòng"
// =========================================================
export const createBooking = async (
  userId: string,
  bookingData: any,
  sagaTimeoutQueue?: Queue<SagaTimeoutJobData>,
) => {
  const {
    hotelId,
    checkIn,
    checkOut,
    totalAmount,
    nights,
    contactDetails,
    bookingSnapshot,
  } = bookingData;

  const resource = `locks:hotel:${hotelId}:${checkIn}`;
  const ttl = 5000;
  let lock;

  try {
    // 1. Acquire Redis lock to prevent race conditions
    lock = await redlock.acquire([resource], ttl);
    console.log(`🔒 Acquired lock: ${resource}`);

    // 2. Check for booking conflict in PostgreSQL
    const conflict = await prisma.booking.findFirst({
      where: {
        hotelId: Number(hotelId),
        status: { in: ["CONFIRMED", "PENDING"] },
        checkIn: { lt: new Date(checkOut) },
        checkOut: { gt: new Date(checkIn) },
      },
    });

    if (conflict) {
      throw new Error(
        "Rất tiếc, phòng này vừa có người đặt! Vui lòng chọn ngày khác.",
      );
    }

    const bookingId = crypto.randomUUID();
    const requestId = crypto.randomUUID(); // For saga idempotency
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const basePrice = totalAmount / (nights || 1);

    // 3. Create booking + outbox message in a single Prisma transaction
    const newBooking = await prisma.$transaction(async (tx) => {
      // Create booking directly in PostgreSQL
      const booking = await tx.booking.create({
        data: {
          bookingId,
          userId,
          hotelId: Number(hotelId),
          guestName: contactDetails?.fullName || "Guest",
          guestEmail: contactDetails?.email || "guest@example.com",
          guestPhone: contactDetails?.phone || "",
          adults: contactDetails?.adults || 1,
          children: contactDetails?.children || 0,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights: nights || 1,
          basePrice,
          discount: 0,
          totalAmount,
          currency: "VND",
          paymentMethod: "STRIPE",
          paymentStatus: "PENDING",
          status: "PENDING",
          bookingSnapshot: bookingSnapshot
            ? JSON.parse(JSON.stringify(bookingSnapshot))
            : null,
          contactDetails: contactDetails
            ? JSON.parse(JSON.stringify(contactDetails))
            : null,
        },
      });

      // Create outbox message in the same transaction
      const outboxPayload = {
        event: "BOOKING_CREATED",
        bookingId,
        userId,
        email: contactDetails?.email || "guest@example.com",
        amount: totalAmount,
        currency: "VND",
        hotelId,
        hotelName: bookingSnapshot?.hotel?.name || "Unknown Hotel",
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
      };

      await tx.outboxMessage.create({
        data: {
          dedupKey: `booking:${bookingId}:BOOKING_CREATED`,
          aggregateType: "Booking",
          aggregateId: bookingId,
          eventType: "BOOKING_CREATED",
          topic: "booking-events",
          payload: outboxPayload,
          status: "PENDING",
        },
      });

      console.log(
        `✅ Created booking ${bookingId} and outbox message in PostgreSQL`,
      );
      return booking;
    });

    // 4️⃣ ADD SAGA TIMEOUT JOB (Outside transaction, after booking confirmed)
    // If queue not provided, skip timeout setup (for backward compatibility)
    if (sagaTimeoutQueue) {
      const timeoutMs = 15 * 60 * 1000; // 15 minutes
      try {
        await sagaTimeoutQueue.add(
          `timeout:${newBooking.bookingId}`,
          {
            bookingId: newBooking.bookingId!,
            sagaId: requestId,
            timeoutMs,
          },
          {
            delay: timeoutMs,
            attempts: 1,
            removeOnComplete: true,
            jobId: `timeout:${newBooking.bookingId}`,
          },
        );
        console.log(
          `⏰ [Saga] Created timeout job for booking ${newBooking.bookingId}`,
        );
      } catch (queueError: any) {
        console.error(
          `❌ [Saga] Failed to create timeout job: ${queueError.message}`,
          "Continuing without timeout...",
        );
        // Don't throw - continue without timeout (system still works, just lacks protection)
      }
    }

    return newBooking;
  } catch (error: any) {
    if (error.name === "ExecutionError") {
      throw new Error(
        "Phòng đang được giữ bởi khách khác, vui lòng thử lại sau giây lát.",
      );
    }
    throw error;
  } finally {
    // Always release the lock
    if (lock) {
      await lock
        .unlock()
        .catch((err) => console.error("❌ Lock release error:", err));
      console.log(`🔓 Released lock: ${resource}`);
    }
  }
};

// =========================================================
// HÀM UPDATE: PAYMENT SUCCESSFUL (POSTGRES ONLY)
// =========================================================
export const updateBookingStatusToPaid = async (
  bookingId: string,
  paymentData: any,
  db: BookingDbClient = prisma,
) => {
  console.log(`⚡ [Service] Processing booking payment: ${bookingId}`);

  try {
    const hotelInfo = paymentData.hotelInfo || {};
    const meta = paymentData.metadata || {};

    const incomingHotelId = Number(hotelInfo.id) || Number(meta.hotelId) || 1;
    const incomingHotelName =
      hotelInfo.name || paymentData.hotel || meta.hotelName;
    const incomingAddress = hotelInfo.address || meta.hotelAddress;
    const incomingImage = hotelInfo.image || meta.hotelImage;
    const incomingSlug = hotelInfo.slug || meta.hotelSlug;
    const incomingStars =
      Number(hotelInfo.stars) || Number(meta.hotelStars) || 0;

    const incomingCustomerName =
      paymentData.customerName ||
      paymentData.user ||
      meta.customerName ||
      "Stripe Customer";
    const incomingCustomerEmail =
      paymentData.customerEmail ||
      paymentData.email ||
      meta.customerEmail ||
      "stripe@stazy.com";
    const incomingPhone = paymentData.customerPhone || meta.customerPhone || "";

    const checkInDate = new Date(
      paymentData.checkInDate || meta.checkInDate || Date.now(),
    );
    const checkOutDate = new Date(
      paymentData.checkOutDate || meta.checkOutDate || Date.now(),
    );
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    const calculatedNights = Math.max(
      1,
      Math.ceil(timeDiff / (1000 * 3600 * 24)),
    );

    // Build hotel snapshot
    const fullSnapshot = {
      hotel: {
        id: incomingHotelId,
        name: incomingHotelName || "Unknown Hotel",
        slug: incomingSlug || "recovered-booking",
        address: incomingAddress || "Address not provided",
        image: incomingImage || "",
        stars: incomingStars || 0,
      },
      room: {
        id: incomingHotelId,
        name: "Standard Room",
        priceAtBooking: paymentData.amount || 0,
      },
    };

    const existingBooking = await db.booking.findFirst({
      where: { bookingId },
      select: { id: true, status: true },
    });

    if (existingBooking?.status === "CONFIRMED") {
      console.log(`✅ Booking ${bookingId} already CONFIRMED, skipping update`);
      return await db.booking.findUnique({
        where: { id: existingBooking.id },
      });
    }

    const bookingData = {
      status: "CONFIRMED" as const,
      paymentStatus: "SUCCEEDED" as const,
      paymentIntentId: paymentData.paymentIntentId || null,
      stripeSessionId:
        paymentData.stripeSessionId || meta.stripeSessionId || null,
      nights: calculatedNights,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      bookingSnapshot: fullSnapshot,
      contactDetails: {
        fullName: incomingCustomerName,
        email: incomingCustomerEmail,
        phone: incomingPhone,
      },
      updatedAt: new Date(),
    };

    const result = existingBooking
      ? await db.booking.update({
          where: { id: existingBooking.id },
          data: bookingData,
        })
      : await db.booking.create({
          data: {
            bookingId,
            userId: paymentData.userId || meta.userId || "guest_user",
            hotelId: incomingHotelId,
            guestName: incomingCustomerName,
            guestEmail: incomingCustomerEmail,
            guestPhone: incomingPhone,
            basePrice:
              (paymentData.amount || 0) / Math.max(1, calculatedNights),
            totalAmount: paymentData.amount || 0,
            currency: "VND",
            paymentMethod: "STRIPE",
            ...bookingData,
          },
        });

    console.log(`✅ Updated booking ${bookingId} to CONFIRMED in PostgreSQL`);
    return result;
  } catch (error: any) {
    console.error("❌ Error updating booking payment status:", error.message);
    throw error;
  }
};

export const cancelBookingOnPaymentFailure = async (
  bookingId: string,
  failureData: any,
  sagaTimeoutQueue?: Queue<SagaTimeoutJobData>,
) => {
  try {
    // 1. Remove timeout job (payment failed, no need to wait)
    if (sagaTimeoutQueue) {
      const jobId = `timeout:${bookingId}`;
      const job = await sagaTimeoutQueue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(
          `🗑️ [Saga] Removed timeout job for cancelled booking ${bookingId}`,
        );
      }
    }

    // Find existing booking
    const existingBooking = await prisma.booking.findFirst({
      where: { bookingId },
      select: { id: true, userId: true, hotelId: true },
    });

    if (!existingBooking) {
      console.warn(`⚠️ [Compensate] Booking not found: ${bookingId}`);
      return null;
    }

    // Update booking + create outbox event in ATOMIC transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: existingBooking.id },
        data: {
          status: "CANCELLED",
          paymentStatus: "FAILED",
          paymentFailureReason:
            failureData?.reason || "Payment processing failed",
          updatedAt: new Date(),
        },
      });

      console.log(
        `♻️ [Compensate] Booking ${bookingId} cancelled due to payment failure`,
      );

      // Create outbox event for notification service in same transaction
      await tx.outboxMessage.create({
        data: {
          dedupKey: `booking:${bookingId}:BOOKING_CANCELLED_PAYMENT_FAILED`,
          aggregateType: "Booking",
          aggregateId: bookingId,
          eventType: "BOOKING_CANCELLED_PAYMENT_FAILED",
          topic: "booking-events",
          payload: {
            event: "BOOKING_CANCELLED_PAYMENT_FAILED",
            bookingId,
            userId: existingBooking.userId,
            hotelId: existingBooking.hotelId,
            reason: failureData?.reason || "Payment processing failed",
            cancelledAt: new Date().toISOString(),
          },
          status: "PENDING",
        },
      });

      return updated;
    });

    return result;
  } catch (error: any) {
    console.error("❌ [Compensate] Error cancelling booking:", error.message);
    throw error;
  }
};

// =========================================================
// HÀM: REMOVE SAGA TIMEOUT WHEN PAYMENT SUCCEEDS
// =========================================================
export const removeSagaTimeoutOnPaymentSuccess = async (
  bookingId: string,
  sagaTimeoutQueue?: Queue<SagaTimeoutJobData>,
): Promise<void> => {
  if (!sagaTimeoutQueue) {
    console.warn(`⚠️ [Saga] Queue not available, skipping timeout removal`);
    return;
  }

  try {
    const jobId = `timeout:${bookingId}`;
    const job = await sagaTimeoutQueue.getJob(jobId);

    if (job) {
      await job.remove();
      console.log(
        `✅ [Saga] Removed timeout job after payment success: ${bookingId}`,
      );
    } else {
      console.log(
        `⚠️ [Saga] No timeout job found for ${bookingId} (may have already executed)`,
      );
    }
  } catch (error: any) {
    console.error(
      `❌ [Saga] Error removing timeout job: ${error.message}`,
      "Continuing...",
    );
    // Don't throw - continue even if we can't remove timeout
  }
};
