-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "gammeId" TEXT;

-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "marqueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gamme" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptif" TEXT,
    "descriptionTech" TEXT,
    "imageUrl" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marqueId" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "bestSeller" BOOLEAN NOT NULL DEFAULT false,
    "enAvant" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gamme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupeFinition" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "gammeId" TEXT NOT NULL,

    CONSTRAINT "GroupeFinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finition" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "imageUrl" TEXT,
    "couleur" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "groupeId" TEXT NOT NULL,

    CONSTRAINT "Finition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Categorie_marqueId_idx" ON "Categorie"("marqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_marqueId_slug_key" ON "Categorie"("marqueId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Gamme_slug_key" ON "Gamme"("slug");

-- CreateIndex
CREATE INDEX "Gamme_marqueId_idx" ON "Gamme"("marqueId");

-- CreateIndex
CREATE INDEX "Gamme_categorieId_idx" ON "Gamme"("categorieId");

-- CreateIndex
CREATE INDEX "GroupeFinition_gammeId_idx" ON "GroupeFinition"("gammeId");

-- CreateIndex
CREATE INDEX "Finition_groupeId_idx" ON "Finition"("groupeId");

-- CreateIndex
CREATE INDEX "Produit_gammeId_idx" ON "Produit"("gammeId");

-- AddForeignKey
ALTER TABLE "Categorie" ADD CONSTRAINT "Categorie_marqueId_fkey" FOREIGN KEY ("marqueId") REFERENCES "Marque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gamme" ADD CONSTRAINT "Gamme_marqueId_fkey" FOREIGN KEY ("marqueId") REFERENCES "Marque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gamme" ADD CONSTRAINT "Gamme_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupeFinition" ADD CONSTRAINT "GroupeFinition_gammeId_fkey" FOREIGN KEY ("gammeId") REFERENCES "Gamme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finition" ADD CONSTRAINT "Finition_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "GroupeFinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_gammeId_fkey" FOREIGN KEY ("gammeId") REFERENCES "Gamme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
