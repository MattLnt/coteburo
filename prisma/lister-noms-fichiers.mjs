// prisma/lister-noms-fichiers.mjs — LECTURE SEULE
// Écrit directement un fichier texte propre (évite les soucis d'encodage PowerShell).
import { PrismaClient } from "@prisma/client";
import fs from "fs";
const prisma = new PrismaClient();

async function main() {
  const gammes = await prisma.gamme.findMany({
    orderBy: { nom: "asc" },
    include: { vitrines: { orderBy: [{ ordre: "asc" }, { nom: "asc" }], select: { nom: true, slug: true } } },
  });

  const lignes = [];
  lignes.push("NOMS DE FICHIERS A UTILISER (format : gamme_carte_1.jpg, _2.jpg pour plusieurs angles)");
  lignes.push("=".repeat(70));

  let totalCartes = 0;
  for (const g of gammes) {
    if (g.vitrines.length === 0) continue;
    lignes.push("");
    lignes.push(`## ${g.nom}  (${g.slug})`);
    for (const v of g.vitrines) {
      lignes.push(`  [ ] ${v.nom}`);
      lignes.push(`      -> ${g.slug}_${v.slug}_1.jpg`);
      totalCartes++;
    }
  }

  lignes.push("");
  lignes.push("=".repeat(70));
  lignes.push(`Total cartes : ${totalCartes}`);

  const contenu = lignes.join("\r\n");
  fs.writeFileSync("noms-fichiers-cartes.txt", contenu, { encoding: "utf8" });
  console.log(`Fichier écrit : noms-fichiers-cartes.txt (${totalCartes} cartes)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());