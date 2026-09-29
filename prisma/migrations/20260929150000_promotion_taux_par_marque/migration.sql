-- Une campagne porte un taux par fournisseur (« −25 % Buronomic, −20 % Sokoa »)
-- et décide si elle s'affiche dans le bandeau.
-- Les fournisseurs déjà visés reprennent le taux de leur campagne, puis la
-- colonne de ce matin (marques) disparaît.

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN "remisesMarques" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Promotion" ADD COLUMN "afficherBandeau" BOOLEAN NOT NULL DEFAULT true;

-- Reprise des campagnes existantes
UPDATE "Promotion" p
SET "remisesMarques" = (
  SELECT COALESCE(jsonb_object_agg(m, p."valeur"), '{}'::jsonb)
  FROM unnest(p."marques") AS m
)
WHERE cardinality(p."marques") > 0 AND p."typeRemise" = 'pourcentage' AND p."valeur" > 0;

ALTER TABLE "Promotion" DROP COLUMN "marques";
