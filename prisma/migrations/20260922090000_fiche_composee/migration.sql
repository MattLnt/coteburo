-- Une fiche composée se commande en plusieurs références, pas en une.
-- Deux colonnes ajoutées, rien de supprimé ni de réécrit.

-- AlterTable
ALTER TABLE "Choix" ADD COLUMN     "element" TEXT;

-- AlterTable
ALTER TABLE "Combinaison" ADD COLUMN     "elements" JSONB;
