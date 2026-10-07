-- Code promo saisi par le client au panier.
--
-- Une campagne porte désormais soit une remise automatique déduite des prix
-- du catalogue (modeRemise = 'auto', le fonctionnement d'origine), soit un
-- code que le client tape au panier (modeRemise = 'code').

ALTER TABLE "Promotion" ADD COLUMN "modeRemise" TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE "Promotion" ADD COLUMN "code" TEXT;
ALTER TABLE "Promotion" ADD COLUMN "codeMinimumHT" DOUBLE PRECISION;
ALTER TABLE "Promotion" ADD COLUMN "codeMaxUtilisations" INTEGER;
ALTER TABLE "Promotion" ADD COLUMN "codeUneFoisParClient" BOOLEAN NOT NULL DEFAULT false;

-- Deux campagnes ne peuvent pas partager un code : c'est lui qui désigne la
-- remise. L'index est unique mais tolère les NULL, donc les campagnes
-- automatiques, qui n'ont pas de code, coexistent sans se gêner.
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- Le code utilisé par une commande, et ce qu'il a retiré. totalHT reste NET :
-- la remise en est déjà déduite, et le brut se relit en additionnant remiseCode.
ALTER TABLE "Commande" ADD COLUMN "codePromo" TEXT;
ALTER TABLE "Commande" ADD COLUMN "remiseCode" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Le compteur d'utilisations d'un code se lit sur les commandes PAYÉES, pas
-- dans une colonne : un panier abandonné ne doit pas consommer une place.
CREATE INDEX "Commande_codePromo_idx" ON "Commande"("codePromo");
