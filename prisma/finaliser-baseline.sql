-- Finalise le baseline des migrations.
--
-- prisma/migrations/ ne contient plus qu'une migration de référence
-- (00000000000000_baseline), qui décrit le schéma tel qu'il est réellement.
-- Mais _prisma_migrations garde encore la trace des 33 migrations d'origine,
-- désormais absentes du dossier. Tant qu'elles y figurent, `prisma migrate dev`
-- refuse de travailler et propose d'effacer la base.
--
-- Cette instruction ne touche QUE la table de suivi interne de Prisma :
-- aucune table métier, aucune donnée produit, commande ou devis.
-- Les 33 lignes sont sauvegardées dans
-- prisma/sauvegardes/_prisma_migrations-*.json, et les fichiers SQL d'origine
-- dans prisma/migrations-archive/.
--
--   npx prisma db execute --file prisma/finaliser-baseline.sql --schema prisma/schema.prisma
--
-- Puis contrôler :
--   npx prisma migrate dev --name verification   → « Already in sync »

DELETE FROM "_prisma_migrations"
WHERE "migration_name" <> '00000000000000_baseline';
