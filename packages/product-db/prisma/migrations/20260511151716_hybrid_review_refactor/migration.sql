/*
  Warnings:

  - The `sentiment` column on the `reviews` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ReviewSentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "explicitSentiments" JSONB,
ADD COLUMN     "nlpProcessed" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "sentiment",
ADD COLUMN     "sentiment" "ReviewSentiment";

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");
