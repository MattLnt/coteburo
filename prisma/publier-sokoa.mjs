import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Publie les produits Sokoa prêts à paraître, ainsi que leurs gammes.
//
// Les accessoires restent en brouillon : ils n'ont pas vocation à figurer
// au catalogue, seulement dans l'onglet Options des fiches auxquelles ils
// se rattachent. Le code du catalogue les remonte sans exiger qu'ils
// soient publiés.
//
// Un produit n'est publié que s'il a de quoi tenir debout : une image et
// un prix. Les autres sont listés à la fin, pour traitement manuel.

const APPLIQUER = process.argv.includes("--appliquer");

function prixDe(v) {
  if (v.sansDeclinaisons) {
    return v.prixUnitaireHT ?? v.prixUnitaireTarifHT ?? null;
  }
  const montants = (Array.isArray(v.declinaisons) ? v.declinaisons : [])
    .map((d) => parseFloat(String(d.prixVenteHT ?? d.prixTarifHT ?? "").replace(",", ".")))
    .filter((x) => !Number.isNaN(x) && x > 0);
  return montants.length ? Math.min(...montants) : null;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  const marque = await prisma.marque.findFirst({
    where: { slug: "sokoa" },
    select: { id: true },
  });
  if (!marque) { console.log("Marque Sokoa introuvable."); return; }

  const vitrines = await prisma.produitVitrine.findMany({
    where: { gamme: { marqueId: marque.id } },
    include: {
      gamme: { select: { id: true, nom: true, publie: true } },
      categories: { select: { nom: true, estOption: true } },
    },
    orderBy: [{ gamme: { nom: "asc" } }, { nom: "asc" }],
  });

  const aPublier = [];
  const incomplets = [];
  const accessoires = [];

  for (const v of vitrines) {
    if (v.categories.some((c) => c.estOption)) { accessoires.push(v); continue; }
    if (v.publie) continue;

    const image = v.imageUrl || (v.images?.length ? v.images[0] : null);
    const prix = prixDe(v);
    const manques = [];

    if (!image) manques.push("pas d'image");
    if (prix == null) manques.push("pas de prix");
    if (!v.categories.length) manques.push("pas de catégorie");

    if (manques.length) {
      incomplets.push({ v, manques });
    } else {
      aPublier.push(v);
    }
  }

  // ── Produits prêts ──
  console.log(`── ${aPublier.length} produit(s) à publier ──\n`);
  let gammeCourante = null;
  for (const v of aPublier) {
    if (v.gamme.nom !== gammeCourante) {
      gammeCourante = v.gamme.nom;
      console.log(`${gammeCourante}`);
    }
    console.log(`   ${v.nom}`);
  }

  // ── Produits incomplets ──
  if (incomplets.length) {
    console.log(`\n── ${incomplets.length} produit(s) incomplet(s) ──\n`);
    for (const { v, manques } of incomplets) {
      console.log(`   ${v.nom}`);
      console.log(`      ${manques.join(" · ")}`);
    }
  }

  // ── Gammes ──
  const gammesConcernees = [...new Set(aPublier.map((v) => v.gamme.id))];
  const gammesAPublier = await prisma.gamme.findMany({
    where: { id: { in: gammesConcernees }, publie: false },
    select: { id: true, nom: true },
  });

  if (gammesAPublier.length) {
    console.log(`\n── ${gammesAPublier.length} gamme(s) à publier ──`);
    gammesAPublier.forEach((g) => console.log(`   ${g.nom}`));
  }

  console.log(`\n${accessoires.length} accessoire(s) laissé(s) en brouillon, comme prévu.`);

  if (!APPLIQUER) {
    console.log("\nnode prisma\\publier-sokoa.mjs --appliquer");
    return;
  }

  // ── Exécution ──
  const res = await prisma.produitVitrine.updateMany({
    where: { id: { in: aPublier.map((v) => v.id) } },
    data: { publie: true },
  });
  console.log(`\n${res.count} produit(s) publié(s).`);

  if (gammesAPublier.length) {
    const g = await prisma.gamme.updateMany({
      where: { id: { in: gammesAPublier.map((x) => x.id) } },
      data: { publie: true },
    });
    console.log(`${g.count} gamme(s) publiée(s).`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());