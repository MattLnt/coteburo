-- Une campagne peut viser un fournisseur entier (« 25 % sur Sokoa »).
-- Une colonne ajoutée avec sa valeur par défaut, rien de modifié ailleurs.

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN "marques" TEXT[] DEFAULT ARRAY[]::TEXT[];
