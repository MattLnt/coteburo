-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Marque" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "remise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoUrl" TEXT,

    CONSTRAINT "Marque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "marqueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "margePct" DOUBLE PRECISION,
    "icone" TEXT,
    "estOption" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gamme" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptif" TEXT,
    "descriptionTech" TEXT,
    "imageUrl" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marqueId" TEXT NOT NULL,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "bestSeller" BOOLEAN NOT NULL DEFAULT false,
    "enAvant" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "venteSurDevis" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Gamme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupeFinition" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "gammeId" TEXT,
    "vitrineId" TEXT,

    CONSTRAINT "GroupeFinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finition" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "imageUrl" TEXT,
    "couleur" TEXT,
    "paletteNom" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "groupeId" TEXT NOT NULL,

    CONSTRAINT "Finition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produit" (
    "codeRacine" TEXT NOT NULL,
    "marqueId" TEXT NOT NULL,
    "gamme" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "slug" TEXT,
    "descriptionWeb" TEXT,
    "categorie" TEXT,
    "imageUrl" TEXT,
    "prixPublicHT" DOUBLE PRECISION NOT NULL,
    "prixVenteHT" DOUBLE PRECISION,
    "prixVarieSelonFinition" BOOLEAN NOT NULL DEFAULT false,
    "prixVerrouille" BOOLEAN NOT NULL DEFAULT false,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prixAchatHT" DOUBLE PRECISION,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bestSeller" BOOLEAN NOT NULL DEFAULT false,
    "enAvant" BOOLEAN NOT NULL DEFAULT false,
    "sousCategorie" TEXT,
    "gammeId" TEXT,
    "vitrineId" TEXT,
    "hauteur" INTEGER,
    "longueur" INTEGER,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pied" TEXT,
    "plateau" TEXT,
    "profondeur" TEXT,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("codeRacine")
);

-- CreateTable
CREATE TABLE "Variante" (
    "codeArticle" TEXT NOT NULL,
    "codeRacine" TEXT NOT NULL,
    "finition" TEXT,
    "ean" TEXT,
    "poids" DOUBLE PRECISION,
    "prixPublicHT" DOUBLE PRECISION NOT NULL,
    "ecoContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prixVenteHT" DOUBLE PRECISION,
    "prixVerrouille" BOOLEAN NOT NULL DEFAULT false,
    "prixAchatHT" DOUBLE PRECISION,

    CONSTRAINT "Variante_pkey" PRIMARY KEY ("codeArticle")
);

-- CreateTable
CREATE TABLE "Reglages" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "tva" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "remiseGlobale" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adresse" TEXT,
    "bandeauActif" BOOLEAN NOT NULL DEFAULT false,
    "bandeauTexte" TEXT,
    "delaiLivraison" TEXT,
    "email" TEXT,
    "facebook" TEXT,
    "francoPort" DOUBLE PRECISION,
    "horaires" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "telephone" TEXT,
    "zoneLivraison" TEXT,
    "margeGlobale" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "seuilLivraisonGratuite" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "fraisLivraison" DOUBLE PRECISION NOT NULL DEFAULT 59,
    "validiteDevisJours" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "Reglages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PalierInstallation" (
    "id" TEXT NOT NULL,
    "seuilMax" DOUBLE PRECISION NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PalierInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Realisation" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "client" TEXT,
    "secteur" TEXT,
    "surface" TEXT,
    "imageUrl" TEXT,
    "slug" TEXT NOT NULL,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recit" TEXT,
    "citationTexte" TEXT,
    "citationAuteur" TEXT,
    "citationPoste" TEXT,
    "galerie" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avantImageUrl" TEXT,
    "apresImageUrl" TEXT,
    "carnetChantier" JSONB,

    CONSTRAINT "Realisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "extrait" TEXT,
    "contenu" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "categorie" TEXT,
    "auteur" TEXT,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetPasswordToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResetPasswordToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "typeRemise" TEXT NOT NULL DEFAULT 'pourcentage',
    "valeur" DOUBLE PRECISION NOT NULL,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionProduit" (
    "promotionId" TEXT NOT NULL,
    "codeRacine" TEXT NOT NULL,

    CONSTRAINT "PromotionProduit_pkey" PRIMARY KEY ("promotionId","codeRacine")
);

-- CreateTable
CREATE TABLE "Commande" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "societe" TEXT,
    "adresse" TEXT NOT NULL,
    "complement" TEXT,
    "codePostal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "pays" TEXT NOT NULL DEFAULT 'France',
    "totalHT" DOUBLE PRECISION NOT NULL,
    "totalTVA" DOUBLE PRECISION NOT NULL,
    "totalTTC" DOUBLE PRECISION NOT NULL,
    "totalEcoPart" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisLivraison" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisInstallation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avecInstallation" BOOLEAN NOT NULL DEFAULT false,
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "paye" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneCommande" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "codeRacine" TEXT,
    "designation" TEXT NOT NULL,
    "marque" TEXT,
    "finition" TEXT,
    "prixHT" DOUBLE PRECISION NOT NULL,
    "quantite" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "referenceFournisseur" TEXT,
    "ecoContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "LigneCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'nouveau',
    "token" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "societe" TEXT,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "typeProjet" TEXT,
    "surface" TEXT,
    "delai" TEXT,
    "budget" TEXT,
    "message" TEXT,
    "adresse" TEXT,
    "complement" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'France',
    "totalHT" DOUBLE PRECISION,
    "totalTVA" DOUBLE PRECISION,
    "totalTTC" DOUBLE PRECISION,
    "totalEcoPart" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisLivraison" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisInstallation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remiseType" TEXT NOT NULL DEFAULT 'pourcentage',
    "remiseValeur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noteClient" TEXT,
    "noteInterne" TEXT,
    "dateEnvoi" TIMESTAMP(3),
    "dateValidite" TIMESTAMP(3),
    "dateReponse" TIMESTAMP(3),
    "userId" TEXT,
    "commandeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneDevis" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "codeRacine" TEXT,
    "vitrineId" TEXT,
    "designation" TEXT NOT NULL,
    "marque" TEXT,
    "gammeNom" TEXT,
    "config" TEXT,
    "imageUrl" TEXT,
    "prixHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "ecoContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LigneDevis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favori" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeRacine" TEXT,
    "vitrineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduitVitrine" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptif" TEXT,
    "imageUrl" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "publie" BOOLEAN NOT NULL DEFAULT true,
    "gammeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "venteSurDevis" BOOLEAN NOT NULL DEFAULT true,
    "bestSeller" BOOLEAN NOT NULL DEFAULT false,
    "enAvant" BOOLEAN NOT NULL DEFAULT false,
    "promoPct" DOUBLE PRECISION,
    "promoDebut" TIMESTAMP(3),
    "promoFin" TIMESTAMP(3),
    "prixAPartir" DOUBLE PRECISION,
    "largeurMin" INTEGER,
    "largeurMax" INTEGER,
    "hauteurMin" INTEGER,
    "hauteurMax" INTEGER,
    "profondeurMin" INTEGER,
    "profondeurMax" INTEGER,
    "sansDeclinaisons" BOOLEAN NOT NULL DEFAULT false,
    "prixUnitaireTarifHT" DOUBLE PRECISION,
    "prixUnitaireHT" DOUBLE PRECISION,
    "prixUnitaireVerrouille" BOOLEAN NOT NULL DEFAULT false,
    "referenceUnitaire" TEXT,
    "optionsAdditionnelles" JSONB,
    "sectionsDevis" JSONB,
    "optionsInformatives" JSONB,
    "axesDeclinaisons" JSONB,
    "declinaisons" JSONB,
    "categoriePrincipaleId" TEXT,
    "sousCategoriePrincipaleId" TEXT,

    CONSTRAINT "ProduitVitrine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SousCategorie" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "categorieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SousCategorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaletteFinition" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "marque" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaletteFinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinitionModele" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "couleur" TEXT,
    "imageUrl" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "paletteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinitionModele_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GammeCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GammeCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_VitrineCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VitrineCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RealisationProduits" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RealisationProduits_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_VitrineSousCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VitrineSousCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProduitOptions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProduitOptions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Marque_nom_key" ON "Marque"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Marque_slug_key" ON "Marque"("slug");

-- CreateIndex
CREATE INDEX "Categorie_marqueId_idx" ON "Categorie"("marqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_marqueId_slug_key" ON "Categorie"("marqueId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Gamme_slug_key" ON "Gamme"("slug");

-- CreateIndex
CREATE INDEX "Gamme_marqueId_idx" ON "Gamme"("marqueId");

-- CreateIndex
CREATE INDEX "GroupeFinition_gammeId_idx" ON "GroupeFinition"("gammeId");

-- CreateIndex
CREATE INDEX "GroupeFinition_vitrineId_idx" ON "GroupeFinition"("vitrineId");

-- CreateIndex
CREATE INDEX "Finition_groupeId_idx" ON "Finition"("groupeId");

-- CreateIndex
CREATE UNIQUE INDEX "Produit_slug_key" ON "Produit"("slug");

-- CreateIndex
CREATE INDEX "Produit_marqueId_idx" ON "Produit"("marqueId");

-- CreateIndex
CREATE INDEX "Produit_gammeId_idx" ON "Produit"("gammeId");

-- CreateIndex
CREATE INDEX "Produit_categorie_idx" ON "Produit"("categorie");

-- CreateIndex
CREATE INDEX "Produit_sousCategorie_idx" ON "Produit"("sousCategorie");

-- CreateIndex
CREATE INDEX "Produit_hauteur_idx" ON "Produit"("hauteur");

-- CreateIndex
CREATE INDEX "Produit_longueur_idx" ON "Produit"("longueur");

-- CreateIndex
CREATE INDEX "Produit_vitrineId_idx" ON "Produit"("vitrineId");

-- CreateIndex
CREATE INDEX "Variante_codeRacine_idx" ON "Variante"("codeRacine");

-- CreateIndex
CREATE UNIQUE INDEX "Realisation_slug_key" ON "Realisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_publie_idx" ON "Article"("publie");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ResetPasswordToken_token_key" ON "ResetPasswordToken"("token");

-- CreateIndex
CREATE INDEX "ResetPasswordToken_userId_idx" ON "ResetPasswordToken"("userId");

-- CreateIndex
CREATE INDEX "ResetPasswordToken_token_idx" ON "ResetPasswordToken"("token");

-- CreateIndex
CREATE INDEX "PromotionProduit_codeRacine_idx" ON "PromotionProduit"("codeRacine");

-- CreateIndex
CREATE UNIQUE INDEX "Commande_numero_key" ON "Commande"("numero");

-- CreateIndex
CREATE INDEX "Commande_email_idx" ON "Commande"("email");

-- CreateIndex
CREATE INDEX "Commande_statut_idx" ON "Commande"("statut");

-- CreateIndex
CREATE INDEX "LigneCommande_commandeId_idx" ON "LigneCommande"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_numero_key" ON "Devis"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_token_key" ON "Devis"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_commandeId_key" ON "Devis"("commandeId");

-- CreateIndex
CREATE INDEX "Devis_email_idx" ON "Devis"("email");

-- CreateIndex
CREATE INDEX "Devis_statut_idx" ON "Devis"("statut");

-- CreateIndex
CREATE INDEX "Devis_token_idx" ON "Devis"("token");

-- CreateIndex
CREATE INDEX "LigneDevis_devisId_idx" ON "LigneDevis"("devisId");

-- CreateIndex
CREATE INDEX "Favori_userId_idx" ON "Favori"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favori_userId_codeRacine_key" ON "Favori"("userId", "codeRacine");

-- CreateIndex
CREATE UNIQUE INDEX "Favori_userId_vitrineId_key" ON "Favori"("userId", "vitrineId");

-- CreateIndex
CREATE INDEX "ProduitVitrine_gammeId_idx" ON "ProduitVitrine"("gammeId");

-- CreateIndex
CREATE INDEX "ProduitVitrine_largeurMin_idx" ON "ProduitVitrine"("largeurMin");

-- CreateIndex
CREATE INDEX "ProduitVitrine_hauteurMin_idx" ON "ProduitVitrine"("hauteurMin");

-- CreateIndex
CREATE INDEX "ProduitVitrine_profondeurMin_idx" ON "ProduitVitrine"("profondeurMin");

-- CreateIndex
CREATE UNIQUE INDEX "ProduitVitrine_gammeId_slug_key" ON "ProduitVitrine"("gammeId", "slug");

-- CreateIndex
CREATE INDEX "SousCategorie_categorieId_idx" ON "SousCategorie"("categorieId");

-- CreateIndex
CREATE UNIQUE INDEX "SousCategorie_categorieId_slug_key" ON "SousCategorie"("categorieId", "slug");

-- CreateIndex
CREATE INDEX "FinitionModele_paletteId_idx" ON "FinitionModele"("paletteId");

-- CreateIndex
CREATE INDEX "_GammeCategories_B_index" ON "_GammeCategories"("B");

-- CreateIndex
CREATE INDEX "_VitrineCategories_B_index" ON "_VitrineCategories"("B");

-- CreateIndex
CREATE INDEX "_RealisationProduits_B_index" ON "_RealisationProduits"("B");

-- CreateIndex
CREATE INDEX "_VitrineSousCategories_B_index" ON "_VitrineSousCategories"("B");

-- CreateIndex
CREATE INDEX "_ProduitOptions_B_index" ON "_ProduitOptions"("B");

-- AddForeignKey
ALTER TABLE "Categorie" ADD CONSTRAINT "Categorie_marqueId_fkey" FOREIGN KEY ("marqueId") REFERENCES "Marque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gamme" ADD CONSTRAINT "Gamme_marqueId_fkey" FOREIGN KEY ("marqueId") REFERENCES "Marque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupeFinition" ADD CONSTRAINT "GroupeFinition_gammeId_fkey" FOREIGN KEY ("gammeId") REFERENCES "Gamme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupeFinition" ADD CONSTRAINT "GroupeFinition_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finition" ADD CONSTRAINT "Finition_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "GroupeFinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_gammeId_fkey" FOREIGN KEY ("gammeId") REFERENCES "Gamme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_marqueId_fkey" FOREIGN KEY ("marqueId") REFERENCES "Marque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variante" ADD CONSTRAINT "Variante_codeRacine_fkey" FOREIGN KEY ("codeRacine") REFERENCES "Produit"("codeRacine") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduit" ADD CONSTRAINT "PromotionProduit_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommande" ADD CONSTRAINT "LigneCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDevis" ADD CONSTRAINT "LigneDevis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favori" ADD CONSTRAINT "Favori_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduitVitrine" ADD CONSTRAINT "ProduitVitrine_gammeId_fkey" FOREIGN KEY ("gammeId") REFERENCES "Gamme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SousCategorie" ADD CONSTRAINT "SousCategorie_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinitionModele" ADD CONSTRAINT "FinitionModele_paletteId_fkey" FOREIGN KEY ("paletteId") REFERENCES "PaletteFinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GammeCategories" ADD CONSTRAINT "_GammeCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GammeCategories" ADD CONSTRAINT "_GammeCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Gamme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VitrineCategories" ADD CONSTRAINT "_VitrineCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VitrineCategories" ADD CONSTRAINT "_VitrineCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RealisationProduits" ADD CONSTRAINT "_RealisationProduits_A_fkey" FOREIGN KEY ("A") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RealisationProduits" ADD CONSTRAINT "_RealisationProduits_B_fkey" FOREIGN KEY ("B") REFERENCES "Realisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VitrineSousCategories" ADD CONSTRAINT "_VitrineSousCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VitrineSousCategories" ADD CONSTRAINT "_VitrineSousCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "SousCategorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProduitOptions" ADD CONSTRAINT "_ProduitOptions_A_fkey" FOREIGN KEY ("A") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProduitOptions" ADD CONSTRAINT "_ProduitOptions_B_fkey" FOREIGN KEY ("B") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

