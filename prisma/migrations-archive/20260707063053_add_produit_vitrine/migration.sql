-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "vitrineId" TEXT;

-- CreateTable
CREATE TABLE "ProduitVitrine" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptif" TEXT,
    "imageUrl" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "publie" BOOLEAN NOT NULL DEFAULT true,
    "gammeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduitVitrine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProduitVitrine_gammeId_idx" ON "ProduitVitrine"("gammeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProduitVitrine_gammeId_slug_key" ON "ProduitVitrine"("gammeId", "slug");

-- CreateIndex
CREATE INDEX "Produit_vitrineId_idx" ON "Produit"("vitrineId");

-- AddForeignKey
ALTER TABLE "ProduitVitrine" ADD CONSTRAINT "ProduitVitrine_gammeId_fkey" FOREIGN KEY ("gammeId") REFERENCES "Gamme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
