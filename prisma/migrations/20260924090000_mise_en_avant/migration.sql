-- Les produits mis en avant par catégorie et par sous-catégorie.
-- Une table ajoutée, rien de modifié ailleurs.

-- CreateTable
CREATE TABLE "MiseEnAvant" (
    "id" TEXT NOT NULL,
    "vitrineId" TEXT NOT NULL,
    "categorieId" TEXT,
    "sousCategorieId" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MiseEnAvant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MiseEnAvant_categorieId_idx" ON "MiseEnAvant"("categorieId");
CREATE INDEX "MiseEnAvant_sousCategorieId_idx" ON "MiseEnAvant"("sousCategorieId");
CREATE UNIQUE INDEX "MiseEnAvant_vitrineId_categorieId_key" ON "MiseEnAvant"("vitrineId", "categorieId");
CREATE UNIQUE INDEX "MiseEnAvant_vitrineId_sousCategorieId_key" ON "MiseEnAvant"("vitrineId", "sousCategorieId");

-- AddForeignKey
ALTER TABLE "MiseEnAvant" ADD CONSTRAINT "MiseEnAvant_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiseEnAvant" ADD CONSTRAINT "MiseEnAvant_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MiseEnAvant" ADD CONSTRAINT "MiseEnAvant_sousCategorieId_fkey" FOREIGN KEY ("sousCategorieId") REFERENCES "SousCategorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
