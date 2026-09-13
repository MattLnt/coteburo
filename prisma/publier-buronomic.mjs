import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Publie les produits Buronomic prêts à paraître, ainsi que leurs gammes.
//
// Un produit n'est publié que s'il a de quoi tenir debout : une image,
// une catégorie, et un prix — sauf s'il est vendu sur devis, auquel cas
// sa fiche affiche un formulaire de demande plutôt qu'un montant.
//
// Les accessoires restent en brouillon : ils n'ont pas vocation à figurer
// au catalogue, seulement dans l'onglet Options des fiches auxquelles ils
// se rattachent. Le code du catalogue les remonte sans exiger qu'ils
// soient publiés.

const APPLIQUER = process.argv.includes("--appliquer");

// Sans argument, toutes les gammes. Avec, seulement celles nommées.
const DEMANDEES = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// Le prix affiché au client : celui de la déclinaison la moins chère, ou
// le prix unique pour un produit sans déclinaison.
function prixDe(v) {
  if (v.sansDeclinaisons) {
    return v.prixUnitaireHT ?? v.prixUnitaireTarifHT ?? null;
  }
  const montants = (Array.isArray(v.declinaisons) ? v.declinaisons : [])
    .map((d) => parseFloat(String(d.prixVenteHT ?? d.prixTarifHT ?? "").replace(",", ".")))
    .filter((x) => !Number.isNaN(x) && x > 0);
  return montants.length ? Math.min(...montants) : null;
}

function compterImages(v) {
  const galerie = Array.isArray(v.images) ? v.images.filter(Boolean) : [];
  if (!v.imageUrl) return galerie.length;
  return galerie.includes(v.imageUrl) ? galerie.length : galerie.length + 1;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  const marque = await prisma.marque.findFirst({
    where: { slug: "buronomic" },
    select: { id: true },
  });
  if (!marque) { console.log("Marque Buronomic introuvable."); return; }

  const vitrines = await prisma.produitVitrine.findMany({
    where: {
      gamme: {
        marqueId: marque.id,
        ...(DEMANDEES.length
          ? { OR: DEMANDEES.map((n) => ({ nom: { contains: n, mode: "insensitive" } })) }
          : {}),
      },
    },
    include: {
      gamme: { select: { id: true, nom: true, publie: true, venteSurDevis: true } },
      categories: { select: { nom: true, estOption: true } },
    },
    orderBy: [{ gamme: { nom: "asc" } }, { nom: "asc" }],
  });

  const aPublier = [];
  const incomplets = [];
  const accessoires = [];
  const surDevis = [];

  for (const v of vitrines) {
    if (v.categories.some((c) => c.estOption)) { accessoires.push(v); continue; }
    if (v.publie) continue;

    // Une fiche en vente sur devis a toute sa place au catalogue : elle
    // affiche un formulaire de demande au lieu d'un prix et d'un bouton
    // d'achat. On n'exige donc pas de montant.
    const devis = v.gamme.venteSurDevis || v.venteSurDevis;
    if (devis) surDevis.push(v);

    const nbImages = compterImages(v);
    const prix = prixDe(v);
    const manques = [];

    if (!nbImages) manques.push("pas d'image");
    if (!devis && prix == null) manques.push("pas de prix");
    if (!v.categories.length) manques.push("pas de catégorie");

    if (manques.length) incomplets.push({ v, manques, nbImages });
    else aPublier.push({ v, nbImages, prix, devis });
  }

  // ── Affichage ──
  console.log(`── ${aPublier.length} produit(s) à publier ──\n`);
  let gammeCourante = null;
  for (const { v, nbImages, devis } of aPublier) {
    if (v.gamme.nom !== gammeCourante) {
      gammeCourante = v.gamme.nom;
      console.log(`${gammeCourante}`);
    }
    const suffixe = devis ? ", sur devis" : "";
    console.log(`   ${v.nom.slice(0, 52)}  (${nbImages} image${nbImages > 1 ? "s" : ""}${suffixe})`);
  }

  if (incomplets.length) {
    console.log(`\n── ${incomplets.length} produit(s) incomplet(s) ──`);
    console.log(`   (détail dans le rapport)`);
  }

  const gammesConcernees = [...new Set(aPublier.map((x) => x.v.gamme.id))];
  const gammesAPublier = await prisma.gamme.findMany({
    where: { id: { in: gammesConcernees }, publie: false },
    select: { id: true, nom: true },
  });

  if (gammesAPublier.length) {
    console.log(`\n── ${gammesAPublier.length} gamme(s) à publier ──`);
    gammesAPublier.forEach((g) => console.log(`   ${g.nom}`));
  }

  console.log(`\n${accessoires.length} accessoire(s) laissé(s) en brouillon.`);
  if (surDevis.length) console.log(`${surDevis.length} produit(s) en vente sur devis, publié(s) sans prix.`);

  // ── Rapport ──
  const rapport = [
    `# Publication Buronomic`,
    ``,
    `Lancé le ${new Date().toLocaleString("fr-FR")}`,
    ``,
    `${aPublier.length} produit(s) prêt(s) · ${incomplets.length} incomplet(s)`,
    `${accessoires.length} accessoire(s) en brouillon · ${surDevis.length} sur devis`,
    ``,
  ];

  if (incomplets.length) {
    rapport.push(`## Produits incomplets\n`);
    let g = null;
    for (const { v, manques, nbImages } of incomplets) {
      if (v.gamme.nom !== g) { g = v.gamme.nom; rapport.push(`\n### ${g}\n`); }
      rapport.push(`- **${v.nom}** — ${manques.join(" · ")}${nbImages ? ` (${nbImages} image(s))` : ""}`);
    }
    rapport.push(``);
  }

  if (aPublier.length) {
    rapport.push(`## Produits publiés\n`);
    let g = null;
    for (const { v, nbImages, prix, devis } of aPublier) {
      if (v.gamme.nom !== g) { g = v.gamme.nom; rapport.push(`\n### ${g}\n`); }
      const montant = devis ? "sur devis" : `à partir de ${prix} €`;
      rapport.push(`- ${v.nom} — ${nbImages} image(s), ${montant}`);
    }
  }

  await writeFile("publication-buronomic.md", rapport.join("\n"), "utf8");
  console.log(`\nRapport dans publication-buronomic.md`);

  if (!APPLIQUER) {
    console.log("\nnode prisma\\publier-buronomic.mjs --appliquer");
    return;
  }

  // ── Exécution ──
  const res = await prisma.produitVitrine.updateMany({
    where: { id: { in: aPublier.map((x) => x.v.id) } },
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