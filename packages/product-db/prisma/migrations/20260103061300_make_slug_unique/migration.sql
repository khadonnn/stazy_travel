/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `hotels` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "hotels_slug_key" ON "hotels"("slug");
