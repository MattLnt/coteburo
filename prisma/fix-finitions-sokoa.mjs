import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Chez Sokoa, le prix dépend de la catégorie tarifaire du revêtement.
// L'import a créé un groupe de finitions par catégorie (B, B+, C, D, E, H),
// tous affichés en même temps sur la fiche — le client devait choisir un
// coloris dans chacun.
//
// Ce script les déplace vers finitionsParValeur de l'axe « revêtement » :
// le nuancier n'apparaît qu'une fois la catégorie choisie, et ne montre
// que les coloris de cette catégorie.

// Repère l'axe qui porte les catégories tarifaires.
function trouverAxeRevetement(axes) {
  return (axes || []).find((a) => {
    const nom = (a.nom || "").toLowerCase();
    return nom.includes("revêtement") || nom.includes("revetement");
  }) || null;
}

// Associe un groupe de finitions à une valeur d'axe.
// « Revêtement catégorie B+ » doit matcher la valeur « B+ » et pas « B ».
// On teste donc les valeurs de la plus longue à la plus courte.
function valeurPourGroupe(nomGroupe, valeurs) {
  const g = (nomGroupe || "").toLowerCase();
  const triees = [...valeurs].sort((a, b) => b.length - a.length);

  for (const v of triees) {
    // La valeur peut être « B+ » ou « E — cuir » : on prend le code devant.
    const code = v.split("—")[0].trim().toLowerCase();
    if (!code) continue;
    // Bornes de mot pour éviter que « B » matche « B+ ».
    const motif = new RegExp(`(^|[^a-z0-9+])${code.replace(/[+]/g, "\\+")}([^a-z0-9+]|$)`, "i");
    if (motif.test(g)) return v;
  }
  return null;
}

async function main() {
  const marque = await prisma.marque.findFirst({ where: { nom: "Sokoa" }, select: { id: true } });
  if (!marque) { console.log("Marque Sokoa introuvable."); return; }

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marqueId: marque.id } },
    include: {
      gamme: { select: { nom: true } },
      groupesFinition: { orderBy: { ordre: "asc" }, include: { finitions: { orderBy: { ordre: "asc" } } } },
    },
  });

  let traites = 0, ignores = 0;

  for (const v of vitrines) {
    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
    const axe = trouverAxeRevetement(axes);

    if (!axe) { ignores++; continue; }
    if (!v.groupesFinition.length) { ignores++; continue; }

    const parValeur = {};
    const groupesADetruire = [];
    const groupesGardes = [];

    for (const g of v.groupesFinition) {
      const valeur = valeurPourGroupe(g.nom, axe.valeurs || []);

      if (!valeur || !g.finitions.length) {
        // Groupe sans correspondance : coloris de résille, de coque,
        // de piétement. Il concerne tout le produit, on le laisse.
        groupesGardes.push(g.nom);
        continue;
      }

      parValeur[valeur] = g.finitions.map((f) => ({
        id: f.id,
        nom: f.nom,
        couleur: f.couleur || null,
        imageUrl: f.imageUrl || null,
        paletteNom: f.paletteNom || null,
      }));
      groupesADetruire.push(g.id);
    }

    if (Object.keys(parValeur).length === 0) { ignores++; continue; }

    const nouveauxAxes = axes.map((a) =>
      a.id === axe.id ? { ...a, finitionsParValeur: parValeur } : a
    );

    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: { axesDeclinaisons: nouveauxAxes },
    });

    await prisma.groupeFinition.deleteMany({ where: { id: { in: groupesADetruire } } });

    const reste = groupesGardes.length ? ` · ${groupesGardes.length} groupe(s) conservé(s)` : "";
    console.log(`✓ ${v.gamme.nom} — ${v.nom}`);
    console.log(`   ${Object.keys(parValeur).length} catégorie(s) rattachée(s) à « ${axe.nom} »${reste}`);
    traites++;
  }

  console.log(`\n${traites} produit(s) corrigé(s), ${ignores} ignoré(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());