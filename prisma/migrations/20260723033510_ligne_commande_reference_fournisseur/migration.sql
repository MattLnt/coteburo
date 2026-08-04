-- AlterTable
ALTER TABLE "LigneCommande" ADD COLUMN     "referenceFournisseur" TEXT,
ALTER COLUMN "codeRacine" DROP NOT NULL;
