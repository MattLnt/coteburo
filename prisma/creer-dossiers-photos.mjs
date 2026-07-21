// prisma/creer-dossiers-photos.mjs
// Crée 1 dossier par gamme dans PHOTOS_CARTES, avec une LISTE.txt de rappel dedans.
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const DOSSIER_RACINE = "C:\\Users\\akeys\\Documents\\COTEBURO\\Buronomic\\PHOTOS_CARTES";

async function main() {
  const gammes = await prisma.gamme.findMany({
    orderBy: { nom: "asc" },
    include: { vitrines: { orderBy: [{ ordre: "asc" }, { nom: "asc" }], select: { nom: true, slug: true } } },
  });

  if (!fs.existsSync(DOSSIER_RACINE)) fs.mkdirSync(DOSSIER_RACINE, { recursive: true });

  let nbDossiers = 0;
  for (const g of gammes) {
    if (g.vitrines.length === 0) continue;
    const dossierGamme = path.join(DOSSIER_RACINE, g.slug);
    if (!fs.existsSync(dossierGamme)) fs.mkdirSync(dossierGamme, { recursive: true });

    const lignes = [
      `${g.nom} — noms de fichiers à utiliser dans ce dossier`,
      "=".repeat(60),
      "",
      ...g.vitrines.map((v) => `[ ] ${v.nom}\n      -> ${v.slug}_1.jpg`),
    ];
    fs.writeFileSync(path.join(dossierGamme, "LISTE.txt"), lignes.join("\r\n"), { encoding: "utf8" });
    nbDossiers++;
  }

  console.log(`✅ ${nbDossiers} dossiers créés dans :\n   ${DOSSIER_RACINE}`);
  console.log(`   Chacun contient une LISTE.txt avec les noms de fichiers attendus.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());