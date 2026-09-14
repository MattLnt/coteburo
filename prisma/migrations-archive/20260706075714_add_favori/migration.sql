-- CreateTable
CREATE TABLE "Favori" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeRacine" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favori_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favori_userId_idx" ON "Favori"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favori_userId_codeRacine_key" ON "Favori"("userId", "codeRacine");
