-- AlterTable
ALTER TABLE "Categorie" ADD COLUMN     "margePct" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Gamme" ADD COLUMN     "venteSurDevis" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProduitVitrine" ADD COLUMN     "venteSurDevis" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Reglages" ADD COLUMN     "margeGlobale" DOUBLE PRECISION NOT NULL DEFAULT 0.30;
