-- AlterTable
ALTER TABLE "LigneCommande" ADD COLUMN     "choix" JSONB,
ADD COLUMN     "combinaisonId" TEXT,
ADD COLUMN     "fournisseur" TEXT,
ADD COLUMN     "ligneParenteId" TEXT,
ADD COLUMN     "referenceComplete" TEXT,
ADD COLUMN     "vitrineId" TEXT;

-- AlterTable
ALTER TABLE "LigneDevis" ADD COLUMN     "choix" JSONB,
ADD COLUMN     "combinaisonId" TEXT,
ADD COLUMN     "fournisseur" TEXT,
ADD COLUMN     "ligneParenteId" TEXT,
ADD COLUMN     "referenceComplete" TEXT;

-- CreateIndex
CREATE INDEX "LigneCommande_vitrineId_idx" ON "LigneCommande"("vitrineId");

-- CreateIndex
CREATE INDEX "LigneCommande_ligneParenteId_idx" ON "LigneCommande"("ligneParenteId");

-- CreateIndex
CREATE INDEX "LigneDevis_vitrineId_idx" ON "LigneDevis"("vitrineId");

-- CreateIndex
CREATE INDEX "LigneDevis_ligneParenteId_idx" ON "LigneDevis"("ligneParenteId");

-- AddForeignKey
ALTER TABLE "LigneCommande" ADD CONSTRAINT "LigneCommande_ligneParenteId_fkey" FOREIGN KEY ("ligneParenteId") REFERENCES "LigneCommande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDevis" ADD CONSTRAINT "LigneDevis_ligneParenteId_fkey" FOREIGN KEY ("ligneParenteId") REFERENCES "LigneDevis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

