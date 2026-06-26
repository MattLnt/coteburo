-- AlterTable
ALTER TABLE "Reglages" ADD COLUMN     "adresse" TEXT,
ADD COLUMN     "bandeauActif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bandeauTexte" TEXT,
ADD COLUMN     "delaiLivraison" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "francoPort" DOUBLE PRECISION,
ADD COLUMN     "horaires" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "zoneLivraison" TEXT;
