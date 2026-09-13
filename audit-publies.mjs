import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Contrôle de ce qui est en ligne.
//
// Le catalogue a été constitué par imports successifs, nettoyages et
// scripts. Avant d'aller plus loin, on vérifie que chaque fiche publiée
// tient debout : une image, un prix, une catégorie, une URL valide.
//
// On repère aussi les accessoires publiés par erreur : ils n'ont pas
// vocation à figurer au catalogue, seulement dans l'onglet Options.

function compterImages(v) {
  const galerie = Array.isArray(v.images) ? v.images.filter(Boolean) : [];
  if (!v.imageUrl) return galerie.length;
  return galerie.includes(v.imageUrl) ? galerie.length : galerie.length + 1;
}

function prixDe(v) {
  if (v.sansDeclinaisons) return v.prixUnitaireHT ?? v.prixUnitaireTarifHT ?? null;
  const montants = (Array.isArray(v.declinaisons) ? v.declinaisons : [])
    .map((d) => parseFloat(String(d.prixVenteHT ?? d.prixTarifHT ?? "").replace(",", ".")))
    .filter((x) => !Number.isNaN(x) && x > 0);
  return montants.length ? Math.min(...montants) : null;
}

(async () => {
  const vitrines = await prisma.produitVitrine.findMany({
    where: { publie: true },
    include: {
      gamme: { select: { nom: true, publie: true, venteSurDevis: true, marque: { select: { nom: true } } } },
      categories: { select: { nom: true, estOption: true } },
      sousCategories: { select: { nom: true } },
      groupesFinition: { select: { nom: true, _count: { select: { finitions: true } } } },
    },
    orderBy: [{ gamme: { nom: "asc" } }, { nom: "asc" }],
  });

  const rapport = [
    `# Audit des produits publiés`,
    ``,
    `Lancé le ${new Date().toLocaleString("fr-FR")}`,
    `${vitrines.length} produit(s) en ligne`,
    ``,
  ];

  const accessoiresPublies = [];
  const sansImage = [];
  const sansPrix = [];
  const sansCategorie = [];
  const gammeNonPubliee = [];
  const finitionsVides = [];

  for (const v of vitrines) {
    const marque = v.gamme.marque?.nom || "?";
    const ligne = `**${marque} · ${v.gamme.nom}** — ${v.nom}`;

    // Un accessoire au catalogue occupe une carte sans intérêt pour le
    // visiteur : sa place est dans l'onglet Options d'un produit.
    if (v.categories.some((c) => c.estOption)) accessoiresPublies.push({ v, ligne });

    if (!compterImages(v)) sansImage.push(ligne);

    const surDevis = v.gamme.venteSurDevis || v.venteSurDevis;
    if (!surDevis && prixDe(v) == null) sansPrix.push(ligne);

    // Sans catégorie, l'URL publique ne peut pas se construire.
    if (!v.categories.length) sansCategorie.push(ligne);

    // Une gamme en brouillon rend ses produits inaccessibles, même publiés.
    if (!v.gamme.publie) gammeNonPubliee.push(ligne);

    // Un groupe de finitions sans couleur affiche des pastilles vides.
    const vides = v.groupesFinition.filter((g) => g._count.finitions === 0);
    if (vides.length) finitionsVides.push(`${ligne} — ${vides.map((g) => g.nom).join(", ")}`);
  }

  const section = (titre, liste, explication) => {
    rapport.push(`\n## ${titre} — ${liste.length}\n`);
    if (explication) rapport.push(`${explication}\n`);
    if (!liste.length) { rapport.push(`Rien à signaler.`); return; }
    liste.forEach((l) => rapport.push(`- ${l}`));
  };

  section("Accessoires publiés", accessoiresPublies.map((x) => x.ligne),
    `Ils apparaissent au catalogue alors qu'ils devraient rester en brouillon : le code des fiches produits les remonte sans exiger qu'ils soient publiés.`);

  section("Produits sans image", sansImage,
    `Une carte sans visuel dans une grille de produits.`);

  section("Produits sans prix", sansPrix,
    `Ils s'afficheront sans montant, ou en « sur devis » sans que ce soit voulu.`);

  section("Produits sans catégorie", sansCategorie,
    `Sans catégorie, l'URL publique ne peut pas se construire : la fiche est injoignable.`);

  section("Gamme en brouillon", gammeNonPubliee,
    `Le produit est publié mais sa gamme non : il reste invisible.`);

  section("Groupes de finitions vides", finitionsVides,
    `Le client voit un intitulé « à choisir » sans aucune pastille en dessous.`);

  await writeFile("audit-publies.md", rapport.join("\n"), "utf8");

  console.log(`${vitrines.length} produit(s) publié(s) examiné(s)\n`);
  console.log(`   accessoires publiés      ${accessoiresPublies.length}`);
  console.log(`   sans image               ${sansImage.length}`);
  console.log(`   sans prix                ${sansPrix.length}`);
  console.log(`   sans catégorie           ${sansCategorie.length}`);
  console.log(`   gamme en brouillon       ${gammeNonPubliee.length}`);
  console.log(`   finitions vides          ${finitionsVides.length}`);
  console.log(`\nDétail dans audit-publies.md`);

  process.exit(0);
})();