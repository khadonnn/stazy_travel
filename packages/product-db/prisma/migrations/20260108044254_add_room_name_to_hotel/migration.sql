/*
  Warnings:

  - The values [CANCEL_BOOKING] on the enum `InteractionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InteractionType_new" AS ENUM ('VIEW', 'LIKE', 'SHARE', 'BOOK', 'CLICK_BOOK_NOW', 'CANCEL', 'SEARCH_QUERY', 'FILTER_APPLIED', 'RATING');
ALTER TABLE "public"."interactions" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "interactions" ALTER COLUMN "type" TYPE "InteractionType_new" USING ("type"::text::"InteractionType_new");
ALTER TYPE "InteractionType" RENAME TO "InteractionType_old";
ALTER TYPE "InteractionType_new" RENAME TO "InteractionType";
DROP TYPE "public"."InteractionType_old";
ALTER TABLE "interactions" ALTER COLUMN "type" SET DEFAULT 'VIEW';
COMMIT;

-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "roomName" TEXT NOT NULL DEFAULT 'Standard Room';
