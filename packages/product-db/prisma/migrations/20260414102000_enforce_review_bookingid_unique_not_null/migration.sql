-- Add bookingId as nullable first to avoid failing on existing rows
ALTER TABLE "reviews"
ADD COLUMN "bookingId" VARCHAR(255);

-- Backfill from existing primary key id to guarantee non-null + uniqueness
UPDATE "reviews"
SET "bookingId" = id::text
WHERE "bookingId" IS NULL OR BTRIM("bookingId") = '';

-- Enforce required + unique after data cleanup
ALTER TABLE "reviews"
ALTER COLUMN "bookingId" SET NOT NULL;

CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");
