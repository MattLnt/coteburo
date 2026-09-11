import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Trois produits ont échappé au script précédent, faute de code tarifaire
// lisible dans leurs valeurs d'axe.
//
// Wi-Max Ergo : la valeur s'appelle « XF3 / B » — le code n'est pas en tête.
// Batbi : les colonnes du tarif portent des noms de tissus (X-Trevira,
//         Eden Free, Select ou Grain) et non des catégories.
//
// Plutôt que de complexifier la détection automatique, on traite ces cas
// à la main : la correspondance est nommée explicitement.

const CAS = [
  {
    produit: "Fauteuil dossier tapissé - Wi-Max Ergo",
    liens: [{ groupe: "Revêtement catégorie B", valeur: "XF3 / B", palette: "Tissu B" }],
  },
  {
    produit: "Fauteuil dossier résille - Wi-Max Ergo",
    liens: [{ groupe: "Revêtement assise catégorie B", valeur: "XF3 / B", palette: "Tissu B" }],
  },
  {
    produit: "Chauffeuse 1 place - Batbi",
    liens: [
      { groupe: "Revêtement catégorie B — X-Trevira", valeur: "X-Trevira", palette: "Tissu B" },
      { groupe: "Revêtement catégorie B+ — Eden Free", valeur: "Eden Free", palette: "Tissu B+" },
      { groupe: "Revêtement catégorie D — Select ou Grain", valeur: "Select ou Grain", palette: "Tissu D" },
    ],
  },
];

function trouverAxeRevetement(axes) {
  return (axes || []).find((a) => {
    const nom = (a.nom || "").toLowerCase();
    return nom.includes("revêtement") || nom.includes("revetement");
  }) || null;
}

async function main() {
  const palettes = await prisma.paletteFinition.findMany({
    include: { finitions: { orderBy: { ordre: "asc" } } },
  });
  const parNom = new Map(palettes.map((p) => [p.nom, p]));

  for (const cas of CAS) {
    const v = await prisma.produitVitrine.findFirst({
      where: { nom: { startsWith: cas.produit } },
      include: { groupesFinition: { include: { finitions: true } } },
    });

    if (!v) { console.log(`✗ ${cas.produit} — introuvable`); continue; }

    const axes = Array.isArray(v.axesDeclinaisons) ? v.axesDeclinaisons : [];
    const axe = trouverAxeRevetement(axes);
    if (!axe) { console.log(`✗ ${cas.produit} — pas d'axe de revêtement`); continue; }

    // On repart du finitionsParValeur déjà posé par le script précédent,
    // pour ne pas écraser les catégories déjà rattachées.
    const parValeur = { ...(axe.finitionsParValeur || {}) };
    const aSupprimer = [];
    const faits = [];

    for (const lien of cas.liens) {
      if (!(axe.valeurs || []).includes(lien.valeur)) {
        console.log(`   ⚠ valeur « ${lien.valeur} » absente de l'axe`);
        continue;
      }

      const palette = parNom.get(lien.palette);
      if (!palette) { console.log(`   ⚠ palette « ${lien.palette} » introuvable`); continue; }

      parValeur[lien.valeur] = palette.finitions.map((f) => ({
        id: f.id,
        nom: f.nom,
        couleur: f.couleur || null,
        imageUrl: f.imageUrl || null,
        paletteNom: palette.nom,
      }));

      const groupe = v.groupesFinition.find((g) => g.nom === lien.groupe);
      if (groupe) aSupprimer.push(groupe.id);

      faits.push(`${lien.valeur} (${palette.finitions.length})`);
    }

    if (faits.length === 0) { console.log(`✗ ${cas.produit} — rien à faire`); continue; }

    const nouveauxAxes = axes.map((a) =>
      a.id === axe.id ? { ...a, finitionsParValeur: parValeur } : a
    );

    await prisma.produitVitrine.update({
      where: { id: v.id },
      data: { axesDeclinaisons: nouveauxAxes },
    });
    if (aSupprimer.length) {
      await prisma.groupeFinition.deleteMany({ where: { id: { in: aSupprimer } } });
    }

    console.log(`✓ ${v.nom}`);
    console.log(`   ${faits.join(" · ")}`);
  }

  // Contrôle final : reste-t-il des groupes vides sur les produits Sokoa ?
  const marque = await prisma.marque.findFirst({ where: { slug: "sokoa" }, select: { id: true } });
  const vides = await prisma.groupeFinition.findMany({
    where: {
      finitions: { none: {} },
      vitrine: { gamme: { marqueId: marque.id } },
    },
    select: { nom: true, vitrine: { select: { nom: true } } },
  });

  if (vides.length === 0) {
    console.log("\nAucun groupe de finitions vide sur les produits Sokoa.");
  } else {
    console.log(`\n⚠ ${vides.length} groupe(s) encore vide(s) :`);
    vides.forEach((g) => console.log(`   ${g.vitrine?.nom} → « ${g.nom} »`));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());