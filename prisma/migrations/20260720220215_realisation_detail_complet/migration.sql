-- AlterTable
ALTER TABLE "Realisation" ADD COLUMN     "apresImageUrl" TEXT,
ADD COLUMN     "avantImageUrl" TEXT,
ADD COLUMN     "carnetChantier" JSONB,
ADD COLUMN     "citationAuteur" TEXT,
ADD COLUMN     "citationPoste" TEXT,
ADD COLUMN     "citationTexte" TEXT,
ADD COLUMN     "galerie" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "recit" TEXT;

-- CreateTable
CREATE TABLE "_RealisationProduits" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RealisationProduits_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RealisationProduits_B_index" ON "_RealisationProduits"("B");

-- AddForeignKey
ALTER TABLE "_RealisationProduits" ADD CONSTRAINT "_RealisationProduits_A_fkey" FOREIGN KEY ("A") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RealisationProduits" ADD CONSTRAINT "_RealisationProduits_B_fkey" FOREIGN KEY ("B") REFERENCES "Realisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
