-- DropForeignKey
ALTER TABLE "Visuel" DROP CONSTRAINT "Visuel_valeurChoixId_fkey";

-- DropIndex
DROP INDEX "Visuel_valeurChoixId_idx";

-- AlterTable
ALTER TABLE "ValeurChoix" ADD COLUMN     "modeleId" TEXT;

-- AlterTable
ALTER TABLE "Visuel" DROP COLUMN "valeurChoixId",
ADD COLUMN     "recadre" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "urlOrigine" TEXT;

-- CreateTable
CREATE TABLE "VisuelValeur" (
    "visuelId" TEXT NOT NULL,
    "valeurChoixId" TEXT NOT NULL,

    CONSTRAINT "VisuelValeur_pkey" PRIMARY KEY ("visuelId","valeurChoixId")
);

-- CreateTable
CREATE TABLE "ExclusionFinition" (
    "id" TEXT NOT NULL,
    "valeurs" JSONB NOT NULL,
    "vitrineId" TEXT NOT NULL,

    CONSTRAINT "ExclusionFinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisuelValeur_valeurChoixId_idx" ON "VisuelValeur"("valeurChoixId");

-- CreateIndex
CREATE INDEX "ExclusionFinition_vitrineId_idx" ON "ExclusionFinition"("vitrineId");

-- CreateIndex
CREATE INDEX "ValeurChoix_modeleId_idx" ON "ValeurChoix"("modeleId");

-- AddForeignKey
ALTER TABLE "ValeurChoix" ADD CONSTRAINT "ValeurChoix_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "FinitionModele"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisuelValeur" ADD CONSTRAINT "VisuelValeur_visuelId_fkey" FOREIGN KEY ("visuelId") REFERENCES "Visuel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisuelValeur" ADD CONSTRAINT "VisuelValeur_valeurChoixId_fkey" FOREIGN KEY ("valeurChoixId") REFERENCES "ValeurChoix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExclusionFinition" ADD CONSTRAINT "ExclusionFinition_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

