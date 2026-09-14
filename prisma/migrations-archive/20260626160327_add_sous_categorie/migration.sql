-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "sousCategorie" TEXT;

-- CreateIndex
CREATE INDEX "Produit_sousCategorie_idx" ON "Produit"("sousCategorie");
