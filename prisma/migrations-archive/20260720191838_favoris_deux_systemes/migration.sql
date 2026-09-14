/*
  Warnings:

  - A unique constraint covering the columns `[userId,vitrineId]` on the table `Favori` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Favori" ADD COLUMN     "vitrineId" TEXT,
ALTER COLUMN "codeRacine" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Favori_userId_vitrineId_key" ON "Favori"("userId", "vitrineId");

-- AddForeignKey
ALTER TABLE "Favori" ADD CONSTRAINT "Favori_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
