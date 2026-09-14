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

-- CreateIndex
CREATE INDEX "PromotionProduit_codeRacine_idx" ON "PromotionProduit"("codeRacine");

-- AddForeignKey
ALTER TABLE "PromotionProduit" ADD CONSTRAINT "PromotionProduit_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
