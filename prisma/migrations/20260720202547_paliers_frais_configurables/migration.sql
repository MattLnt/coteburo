-- AlterTable
ALTER TABLE "Reglages" ADD COLUMN     "fraisLivraison" DOUBLE PRECISION NOT NULL DEFAULT 59,
ADD COLUMN     "seuilLivraisonGratuite" DOUBLE PRECISION NOT NULL DEFAULT 500;

-- CreateTable
CREATE TABLE "PalierInstallation" (
    "id" TEXT NOT NULL,
    "seuilMax" DOUBLE PRECISION NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PalierInstallation_pkey" PRIMARY KEY ("id")
);
