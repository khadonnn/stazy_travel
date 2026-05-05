-- AlterEnum
ALTER TYPE "InteractionType" ADD VALUE 'ADD_TO_WISHLIST';

-- CreateTable
CREATE TABLE "processed_events" (
    "eventId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE INDEX "processed_events_createdAt_idx" ON "processed_events"("createdAt");
