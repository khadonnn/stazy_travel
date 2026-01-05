/*
  Warnings:

  - You are about to drop the column `date` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `reviewStar` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `action` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `interactions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('BUSINESS', 'FAMILY', 'COUPLE', 'SOLO', 'GROUP');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'PAYPAL', 'VNPAY', 'BANK_TRANSFER', 'CASH_ON_CHECKIN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'LIKE', 'SHARE', 'BOOK', 'CLICK_BOOK_NOW', 'CANCEL_BOOKING', 'SEARCH_QUERY', 'FILTER_APPLIED');

-- DropForeignKey
ALTER TABLE "interactions" DROP CONSTRAINT "interactions_hotelId_fkey";

-- DropForeignKey
ALTER TABLE "interactions" DROP CONSTRAINT "interactions_userId_fkey";

-- DropForeignKey
ALTER TABLE "recommendations" DROP CONSTRAINT "recommendations_userId_fkey";

-- AlterTable
ALTER TABLE "hotels" DROP COLUMN "date",
DROP COLUMN "reviewStar",
ADD COLUMN     "accessibility" TEXT[],
ADD COLUMN     "cancellationRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "fullDescription" TEXT,
ADD COLUMN     "nearbyLandmarks" TEXT[],
ADD COLUMN     "policies" TEXT,
ADD COLUMN     "policiesVector" vector(512),
ADD COLUMN     "reviewStar" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "suitableFor" "TripType"[],
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "interactions" DROP COLUMN "action",
DROP COLUMN "createdAt",
DROP COLUMN "weight",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "type" "InteractionType" NOT NULL DEFAULT 'VIEW',
ALTER COLUMN "hotelId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "recommendations" ADD COLUMN     "score" JSONB;

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "favoriteAmenities" TEXT[],
    "favoriteCities" TEXT[],
    "avgPriceExpect" DECIMAL(12,2),
    "preferredRatingMin" DOUBLE PRECISION,
    "pastBookingCount" INTEGER NOT NULL DEFAULT 0,
    "lastBookingAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentIntentId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_query_logs" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "bookings_hotelId_idx" ON "bookings"("hotelId");

-- CreateIndex
CREATE INDEX "interactions_userId_type_idx" ON "interactions"("userId", "type");

-- CreateIndex
CREATE INDEX "interactions_hotelId_idx" ON "interactions"("hotelId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_query_logs" ADD CONSTRAINT "search_query_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
