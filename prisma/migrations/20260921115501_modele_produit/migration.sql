-- CreateEnum
CREATE TYPE "NatureChoix" AS ENUM ('tarifaire', 'finition', 'option');

-- CreateEnum
CREATE TYPE "RenduChoix" AS ENUM ('boutons', 'pastilles', 'nuancier', 'liste', 'vignettes', 'cases');

-- CreateEnum
CREATE TYPE "RoleVisuel" AS ENUM ('vignette', 'galerie', 'ambiance', 'schema');

-- CreateEnum
CREATE TYPE "OrigineDonnee" AS ENUM ('tarif', 'editorial');

-- CreateTable
CREATE TABLE "Choix" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "nature" "NatureChoix" NOT NULL,
    "rendu" "RenduChoix" NOT NULL DEFAULT 'boutons',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "obligatoire" BOOLEAN NOT NULL DEFAULT true,
    "origine" "OrigineDonnee" NOT NULL DEFAULT 'tarif',
    "vitrineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Choix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValeurChoix" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "couleur" TEXT,
    "imageUrl" TEXT,
    "suffixeReference" TEXT,
    "supplementHT" DOUBLE PRECISION,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "choixId" TEXT NOT NULL,
    "paletteId" TEXT,

    CONSTRAINT "ValeurChoix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combinaison" (
    "id" TEXT NOT NULL,
    "valeurs" JSONB NOT NULL,
    "empreinte" TEXT NOT NULL,
    "prixTarifHT" DOUBLE PRECISION,
    "ecoContribution" DOUBLE PRECISION,
    "poids" DOUBLE PRECISION,
    "ean" TEXT,
    "referenceBase" TEXT,
    "pageCatalogue" INTEGER,
    "ancienId" TEXT,
    "vitrineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combinaison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visuel" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "role" "RoleVisuel" NOT NULL DEFAULT 'galerie',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "valeurChoixId" TEXT,
    "vitrineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visuel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Choix_vitrineId_idx" ON "Choix"("vitrineId");

-- CreateIndex
CREATE UNIQUE INDEX "Choix_vitrineId_cle_key" ON "Choix"("vitrineId", "cle");

-- CreateIndex
CREATE INDEX "ValeurChoix_choixId_idx" ON "ValeurChoix"("choixId");

-- CreateIndex
CREATE INDEX "ValeurChoix_paletteId_idx" ON "ValeurChoix"("paletteId");

-- CreateIndex
CREATE UNIQUE INDEX "ValeurChoix_choixId_libelle_key" ON "ValeurChoix"("choixId", "libelle");

-- CreateIndex
CREATE INDEX "Combinaison_vitrineId_idx" ON "Combinaison"("vitrineId");

-- CreateIndex
CREATE INDEX "Combinaison_ancienId_idx" ON "Combinaison"("ancienId");

-- CreateIndex
CREATE UNIQUE INDEX "Combinaison_vitrineId_empreinte_key" ON "Combinaison"("vitrineId", "empreinte");

-- CreateIndex
CREATE INDEX "Visuel_vitrineId_idx" ON "Visuel"("vitrineId");

-- CreateIndex
CREATE INDEX "Visuel_valeurChoixId_idx" ON "Visuel"("valeurChoixId");

-- AddForeignKey
ALTER TABLE "Choix" ADD CONSTRAINT "Choix_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValeurChoix" ADD CONSTRAINT "ValeurChoix_choixId_fkey" FOREIGN KEY ("choixId") REFERENCES "Choix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValeurChoix" ADD CONSTRAINT "ValeurChoix_paletteId_fkey" FOREIGN KEY ("paletteId") REFERENCES "PaletteFinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combinaison" ADD CONSTRAINT "Combinaison_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visuel" ADD CONSTRAINT "Visuel_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visuel" ADD CONSTRAINT "Visuel_valeurChoixId_fkey" FOREIGN KEY ("valeurChoixId") REFERENCES "ValeurChoix"("id") ON DELETE SET NULL ON UPDATE CASCADE;

