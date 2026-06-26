-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
