// Sauvegarde du catalogue avant purge.
//
// Écrit un JSON complet de ce qui va disparaître : fiches et déclinaisons,
// gammes, catégories, finitions, palettes, et les commandes et devis de
// test. De quoi comparer l'ancien catalogue au nouveau une fois l'import
// passé, ou remonter une fiche à la main si un détail manquait.
//
//   node prisma/sauvegarder-catalogue.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const prisma = new PrismaClient();
const DOSSIER = "prisma/sauvegardes";

async function main() {
  await mkdir(DOSSIER, { recursive: true });
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const contenu = {
    _lisezmoi: [
      "Sauvegarde du catalogue Côté BURO avant la purge de septembre 2026.",
      "",
      "Le site repart de zéro : ce fichier garde l'état d'avant, pour",
      "comparer au nouveau catalogue importé depuis catalogue-coteburo.xlsx",
      "et retrouver, au besoin, une description ou une image qu'on aurait",
      "laissée en route.",
      "",
      "Les déclinaisons sont dans le champ JSON de chaque fiche, comme en",
      "base. Les commandes et devis sont ceux des tests, conservés pour",
      "mémoire.",
    ],
    date: new Date().toISOString(),
    marques: await prisma.marque.findMany({ orderBy: { nom: "asc" } }),
    categories: await prisma.categorie.findMany({
      orderBy: [{ marqueId: "asc" }, { ordre: "asc" }],
      include: { sousCategories: { orderBy: { ordre: "asc" } } },
    }),
    gammes: await prisma.gamme.findMany({
      orderBy: [{ marqueId: "asc" }, { nom: "asc" }],
      include: { groupesFinition: { include: { finitions: true } } },
    }),
    vitrines: await prisma.produitVitrine.findMany({
      orderBy: [{ gammeId: "asc" }, { nom: "asc" }],
      include: {
        groupesFinition: { include: { finitions: true } },
        categories: { select: { id: true, nom: true } },
        sousCategories: { select: { id: true, nom: true } },
        optionsLiees: { select: { id: true, nom: true } },
        produitsLies: { select: { id: true, nom: true } },
      },
    }),
    palettes: await prisma.paletteFinition.findMany({
      orderBy: { ordre: "asc" }, include: { finitions: true },
    }),
    commandes: await prisma.commande.findMany({ include: { lignes: true } }),
    devis: await prisma.devis.findMany({ include: { lignes: true } }),
    favoris: await prisma.favori.findMany(),
    promotions: await prisma.promotion.findMany(),
  };

  const fichier = join(DOSSIER, `catalogue-avant-purge-${horodatage}.json`);
  await writeFile(fichier, JSON.stringify(contenu, null, 1), "utf8");

  const decl = contenu.vitrines.reduce(
    (n, v) => n + (Array.isArray(v.declinaisons) ? v.declinaisons.length : 0), 0);
  const fin = contenu.gammes.reduce(
    (n, g) => n + g.groupesFinition.reduce((m, gr) => m + gr.finitions.length, 0), 0)
    + contenu.vitrines.reduce(
      (n, v) => n + v.groupesFinition.reduce((m, gr) => m + gr.finitions.length, 0), 0);

  console.log(`${contenu.marques.length} marques · ${contenu.categories.length} catégories · `
    + `${contenu.gammes.length} gammes`);
  console.log(`${contenu.vitrines.length} fiches · ${decl} déclinaisons · ${fin} finitions`);
  console.log(`${contenu.palettes.length} palettes · ${contenu.commandes.length} commandes · `
    + `${contenu.devis.length} devis`);
  console.log(`\nÉcrit → ${fichier}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
