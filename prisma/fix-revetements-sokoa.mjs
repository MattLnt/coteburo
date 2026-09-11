import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Deux problèmes cumulés sur les produits Sokoa :
//
// 1. Les groupes « Revêtement catégorie X » sont vides. L'import devait les
//    remplir depuis les palettes partagées, mais celles-ci n'existaient pas
//    encore au moment des premières gammes.
//
// 2. Même remplis, ces six groupes s'afficheraient tous en même temps, tous
//    marqués « À choisir ». Or le client n'en choisit qu'un : celui de la
//    catégorie retenue dans les déclinaisons.
//
// Ce script remplit depuis les palettes, puis rattache chaque nuancier à sa
// valeur d'axe via finitionsParValeur. Le bon nuancier n'apparaît alors
// qu'une fois la catégorie choisie.

function trouverAxeRevetement(axes) {
  return (axes || []).find((a) => {
    const nom = (a.nom || "").toLowerCase();
    return nom.includes("revêtement") || nom.includes("revetement");
  }) || null;
}

// Extrait le code tarifaire d'un libellé.
// « Revêtement assise catégorie B+ » → « b+ »
// « E — cuir » → « e »
// « C — Step Mélange, Noma ou Atlantic » → « c »
function codeTarifaire(libelle) {
  const t = (libelle || "").toLowerCase();
  const apresCategorie = t.match(/cat[ée]gorie\s+([a-z]\+?)/);
  if (apresCategorie) return apresCategorie[1];
  const debut = t.trim().match(/^([a-z]\+?)(\s|—|-|$)/);
  if (debut) return debut[1];
  return null;
}

const PALETTES = {
  "b": "Tissu B",
  "b+": "Tissu B+",
  "c": "Tissu C",
  "d": "Tissu D",
  "e": "Tissu E",
  "h": "Tissu H",
};

async function main() {
  const palettes = await prisma.paletteFinition.findMany({
    include: { finitions: { orderBy: { ordre: "asc" } } },
  });
  const parNom = new Map(palettes.map((p) => [p.nom, p]));

  const marque = await prisma.marque.findFirst({ where: { slug: "sokoa" }, select: { id: true } });
  if (!marque) { console.log("Marque Sokoa introuvable."); return; }

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marqueId: marque.id } },
    include: {
      gamme: { select: { nom: true } },
      groupesFinition: { orderBy: { ordre: "asc" }, include: { finitions: { orderBy: { ordre: "asc" } } } },
    },
  });

  let traites = 0, sansAxe = 0;

  for (const v of vitrines) {
    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
    const axe = trouverAxeRevetement(axes);
    if (!axe || !v.groupesFinition.length) { sansAxe++; continue; }

    // Chaque valeur d'axe porte son code : « B+ », « E — cuir »…
    const valeurParCode = new Map();
    for (const val of axe.valeurs || []) {
      const code = codeTarifaire(val);
      if (code) valeurParCode.set(code, val);
    }

    const parValeur = {};
    const aSupprimer = [];
    const conserves = [];

    for (const g of v.groupesFinition) {
      const code = codeTarifaire(g.nom);
      const valeur = code ? valeurParCode.get(code) : null;

      if (!valeur) {
        // Coloris de résille, de coque, de piétement : ils valent pour
        // tout le produit, quel que soit le revêtement. On les laisse.
        conserves.push(g.nom);
        continue;
      }

      // Le groupe est vide : on le remplit depuis la palette correspondante.
      let finitions = g.finitions;
      if (finitions.length === 0) {
        const palette = parNom.get(PALETTES[code]);
        if (!palette) { conserves.push(g.nom); continue; }
        finitions = palette.finitions.map((f) => ({
          id: f.id, nom: f.nom, couleur: f.couleur,
          imageUrl: f.imageUrl, paletteNom: palette.nom,
        }));
      }

      parValeur[valeur] = finitions.map((f) => ({
        id: f.id,
        nom: f.nom,
        couleur: f.couleur || null,
        imageUrl: f.imageUrl || null,
        paletteNom: f.paletteNom || null,
      }));
      aSupprimer.push(g.id);
    }

    if (Object.keys(parValeur).length === 0) { sansAxe++; continue; }

    const nouveauxAxes = axes.map((a) =>
      a.id === axe.id ? { ...a, finitionsParValeur: parValeur } : a
    );

    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: { axesDeclinaisons: nouveauxAxes },
    });
    await prisma.groupeFinition.deleteMany({ where: { id: { in: aSupprimer } } });

    const detail = Object.entries(parValeur)
      .map(([val, f]) => `${val} (${f.length})`)
      .join(" · ");
    console.log(`✓ ${v.gamme.nom} — ${v.nom}`);
    console.log(`   ${detail}`);
    if (conserves.length) console.log(`   conservés : ${conserves.join(", ")}`);

    traites++;
  }

  console.log(`\n${traites} produit(s) corrigé(s), ${sansAxe} sans axe de revêtement.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());