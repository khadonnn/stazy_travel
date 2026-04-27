/*
  Warnings:

  - You are about to alter the column `paymentIntentId` on the `bookings` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_hotelId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_userId_fkey";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "bookingId" VARCHAR(255),
ADD COLUMN     "bookingSnapshot" JSONB,
ADD COLUMN     "contactDetails" JSONB,
ADD COLUMN     "paymentFailureReason" TEXT,
ADD COLUMN     "stripeSessionId" VARCHAR(255),
ALTER COLUMN "paymentMethod" SET DEFAULT 'STRIPE',
ALTER COLUMN "paymentIntentId" SET DATA TYPE VARCHAR(255);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbox_messages_dedupKey_key" ON "outbox_messages"("dedupKey");

-- CreateIndex
CREATE INDEX "outbox_messages_status_availableAt_idx" ON "outbox_messages"("status", "availableAt");

-- CreateIndex
CREATE INDEX "outbox_messages_aggregateType_aggregateId_idx" ON "outbox_messages"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
