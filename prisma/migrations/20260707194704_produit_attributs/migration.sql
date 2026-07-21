-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "hauteur" INTEGER,
ADD COLUMN     "longueur" INTEGER,
ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pied" TEXT,
ADD COLUMN     "plateau" TEXT,
ADD COLUMN     "profondeur" TEXT;

-- CreateIndex
CREATE INDEX "Produit_longueur_idx" ON "Produit"("longueur");

-- CreateIndex
CREATE INDEX "Produit_hauteur_idx" ON "Produit"("hauteur");
