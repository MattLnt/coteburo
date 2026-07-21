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
CREATE TABLE "_VitrineCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VitrineCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_VitrineSousCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VitrineSousCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "SousCategorie_categorieId_idx" ON "SousCategorie"("categorieId");

-- CreateIndex
CREATE UNIQUE INDEX "SousCategorie_categorieId_slug_key" ON "SousCategorie"("categorieId", "slug");

-- CreateIndex
CREATE INDEX "_VitrineCategories_B_index" ON "_VitrineCategories"("B");

-- CreateIndex
CREATE INDEX "_VitrineSousCategories_B_index" ON "_VitrineSousCategories"("B");

-- AddForeignKey
ALTER TABLE "SousCategorie" ADD CONSTRAINT "SousCategorie_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VitrineCategories" ADD CONSTRAINT "_VitrineCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VitrineCategories" ADD CONSTRAINT "_VitrineCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VitrineSousCategories" ADD CONSTRAINT "_VitrineSousCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "ProduitVitrine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VitrineSousCategories" ADD CONSTRAINT "_VitrineSousCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "SousCategorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
