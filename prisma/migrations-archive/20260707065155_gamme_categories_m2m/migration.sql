/*
  Warnings:

  - You are about to drop the column `categorieId` on the `Gamme` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Gamme" DROP CONSTRAINT "Gamme_categorieId_fkey";

-- DropIndex
DROP INDEX "Gamme_categorieId_idx";

-- AlterTable
ALTER TABLE "Gamme" DROP COLUMN "categorieId";

-- CreateTable
CREATE TABLE "_GammeCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GammeCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_GammeCategories_B_index" ON "_GammeCategories"("B");

-- AddForeignKey
ALTER TABLE "_GammeCategories" ADD CONSTRAINT "_GammeCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GammeCategories" ADD CONSTRAINT "_GammeCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Gamme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
