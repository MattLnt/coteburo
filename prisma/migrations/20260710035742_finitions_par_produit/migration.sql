-- AlterTable
ALTER TABLE "GroupeFinition" ADD COLUMN     "vitrineId" TEXT,
ALTER COLUMN "gammeId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "GroupeFinition_vitrineId_idx" ON "GroupeFinition"("vitrineId");

-- AddForeignKey
ALTER TABLE "GroupeFinition" ADD CONSTRAINT "GroupeFinition_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
