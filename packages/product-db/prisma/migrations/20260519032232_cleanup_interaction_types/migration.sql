/*
  Warnings:

  - The values [LIKE,SHARE,RATING] on the enum `InteractionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "SenderRole" AS ENUM ('USER', 'ADMIN', 'AI');

-- AlterEnum
BEGIN;
CREATE TYPE "InteractionType_new" AS ENUM ('VIEW', 'ADD_TO_WISHLIST', 'BOOK', 'CLICK_BOOK_NOW', 'CANCEL', 'SEARCH_QUERY', 'FILTER_APPLIED', 'RATE_POSITIVE', 'RATE_NEGATIVE');
ALTER TABLE "public"."interactions" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "interactions" ALTER COLUMN "type" TYPE "InteractionType_new" USING ("type"::text::"InteractionType_new");
ALTER TYPE "InteractionType" RENAME TO "InteractionType_old";
ALTER TYPE "InteractionType_new" RENAME TO "InteractionType";
DROP TYPE "public"."InteractionType_old";
ALTER TABLE "interactions" ALTER COLUMN "type" SET DEFAULT 'VIEW';
COMMIT;

-- AlterTable
ALTER TABLE "system_metrics" ADD COLUMN     "baselineMae" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "baselineNdcg" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "baselinePrecision" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "baselineRecall" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "baselineRmse" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "mae" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ndcgAt5" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" "SenderRole" NOT NULL,
    "text" TEXT,
    "images" TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_userId_idx" ON "chat_messages"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_isRead_idx" ON "chat_messages"("isRead");

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");
