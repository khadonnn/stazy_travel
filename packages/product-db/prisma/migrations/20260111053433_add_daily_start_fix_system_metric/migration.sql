-- AlterTable
ALTER TABLE "interactions" ADD COLUMN     "sessionId" VARCHAR(255);

-- AlterTable
ALTER TABLE "system_metrics" ADD COLUMN     "executionTimeMs" INTEGER,
ADD COLUMN     "trainingHistory" JSONB,
ADD COLUMN     "tuningParams" JSONB;

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "interestedCategories" TEXT[];

-- CreateTable
CREATE TABLE "daily_stats" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "totalCancels" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "totalClickBook" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "totalSearch" INTEGER NOT NULL DEFAULT 0,
    "miscInteractions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_stats_date_key" ON "daily_stats"("date");
