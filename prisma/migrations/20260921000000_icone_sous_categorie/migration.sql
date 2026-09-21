-- Le rayon porte son icône, comme la catégorie.
--
-- Le menu du site en montrait déjà une devant chaque rayon — mais celle de la
-- catégorie, répétée : les huit rayons de Sièges affichaient le même dessin.
-- La colonne est facultative ; un rayon sans la sienne retombe sur celle de
-- sa catégorie.
ALTER TABLE "SousCategorie" ADD COLUMN "icone" TEXT;
