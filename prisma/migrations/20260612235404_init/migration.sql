-- CreateTable
CREATE TABLE "Marque" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "remise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Marque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "codeRacine" TEXT NOT NULL,
    "marqueId" TEXT NOT NULL,
    "gamme" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "slug" TEXT,
    "descriptionWeb" TEXT,
    "categorie" TEXT,
    "imageUrl" TEXT,
    "prixPublicHT" DOUBLE PRECISION NOT NULL,
    "prixVenteHT" DOUBLE PRECISION,
    "prixVarieSelonFinition" BOOLEAN NOT NULL DEFAULT false,
    "prixVerrouille" BOOLEAN NOT NULL DEFAULT false,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("codeRacine")
);

-- CreateTable
CREATE TABLE "Variante" (
    "codeArticle" TEXT NOT NULL,
    "codeRacine" TEXT NOT NULL,
    "finition" TEXT,
    "ean" TEXT,
    "poids" DOUBLE PRECISION,
    "prixPublicHT" DOUBLE PRECISION NOT NULL,
    "ecoContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prixVenteHT" DOUBLE PRECISION,
    "prixVerrouille" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Variante_pkey" PRIMARY KEY ("codeArticle")
);

-- CreateTable
CREATE TABLE "Reglages" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tva" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "remiseGlobale" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reglages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Realisation" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "client" TEXT,
    "secteur" TEXT,
    "surface" TEXT,
    "imageUrl" TEXT,
    "slug" TEXT NOT NULL,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Realisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Marque_nom_key" ON "Marque"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Marque_slug_key" ON "Marque"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Produit_slug_key" ON "Produit"("slug");

-- CreateIndex
CREATE INDEX "Produit_marqueId_idx" ON "Produit"("marqueId");

-- CreateIndex
CREATE INDEX "Produit_categorie_idx" ON "Produit"("categorie");

-- CreateIndex
CREATE INDEX "Variante_codeRacine_idx" ON "Variante"("codeRacine");

-- CreateIndex
CREATE UNIQUE INDEX "Realisation_slug_key" ON "Realisation"("slug");

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_marqueId_fkey" FOREIGN KEY ("marqueId") REFERENCES "Marque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variante" ADD CONSTRAINT "Variante_codeRacine_fkey" FOREIGN KEY ("codeRacine") REFERENCES "Produit"("codeRacine") ON DELETE CASCADE ON UPDATE CASCADE;
