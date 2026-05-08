/*
  Warnings:

  - Added the required column `destination` to the `hotels` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "destination" TEXT NOT NULL;
