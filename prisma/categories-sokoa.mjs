import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rattache les produits Sokoa aux bonnes sous-catégories.
//
// L'import avait posé des noms inventés — « Sièges de direction »,
// « Fauteuils lounge » — qui n'existent pas dans la taxonomie du site.
// Les produits se retrouvaient donc sans rattachement, et invisibles
// dans la navigation par catégorie.
//
// La taxonomie réelle suit les sections du tarif Sokoa, ce qui rend la
// correspondance directe. Un produit peut appartenir à plusieurs
// sous-catégories : Kanpoa est à la fois cafétéria et outdoor.

const APPLIQUER = process.argv.includes("--appliquer");

// gamme → [catégorie, sous-catégories]
const AFFECTATIONS = [
  { gammes: ["Azkar", "Eman Direction"], categorie: "Sièges", sousCategories: ["Direction"] },
  { gammes: ["Eman", "Wi-Max", "Luz"], categorie: "Sièges", sousCategories: ["Collaboratif"] },
  { gammes: ["Wi-Max Ergo"], categorie: "Sièges", sousCategories: ["Ergo & Technique"] },
  { gammes: ["Sièges Hauts"], categorie: "Sièges", sousCategories: ["Siège haut"] },
  { gammes: ["Klik", "Luma", "Bero", "Adela"], categorie: "Sièges", sousCategories: ["Réunion & Formation"] },
  // Loria a des versions outdoor en plus de son usage réunion.
  { gammes: ["Loria"], categorie: "Sièges", sousCategories: ["Réunion & Formation", "Outdoor"] },
  { gammes: ["Ildo", "Kulbu", "Emeki", "Batbi", "Rhune", "Punta"], categorie: "Sièges", sousCategories: ["Convivialité"] },
  // Kanpoa est rangé en cafétéria au tarif, mais c'est du mobilier
  // extérieur : les deux rattachements se justifient.
  { gammes: ["Kanpoa"], categorie: "Sièges", sousCategories: ["Cafétéria", "Outdoor"] },
  // Maike passe de l'intérieur à l'extérieur sans précaution.
  { gammes: ["Maike"], categorie: "Sièges", sousCategories: ["Cafétéria", "Outdoor"] },
  // Archikit n'est pas un siège : c'est du rayonnage d'archives.
  { gammes: ["Archikit"], categorie: "Rangements", sousCategories: ["Archivage"] },
];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL ═══\n"
    : "═══ SIMULATION — relancer avec --appliquer ═══\n");

  // La taxonomie est commune à toutes les marques.
  const categories = await prisma.categorie.findMany({
    include: { sousCategories: { select: { id: true, nom: true } } },
  });

  const marque = await prisma.marque.findFirst({
    where: { slug: "sokoa" },
    select: { id: true },
  });
  if (!marque) { console.log("Marque Sokoa introuvable."); return; }

  let traites = 0, ignores = 0;

  for (const aff of AFFECTATIONS) {
    const cat = categories.find((c) => c.nom === aff.categorie);
    if (!cat) {
      console.log(`✗ Catégorie « ${aff.categorie} » introuvable.`);
      continue;
    }

    const sousCats = [];
    for (const nom of aff.sousCategories) {
      const sc = cat.sousCategories.find((s) => s.nom === nom);
      if (sc) sousCats.push(sc);
      else console.log(`✗ Sous-catégorie « ${nom} » introuvable dans ${cat.nom}.`);
    }
    if (!sousCats.length) continue;

    const vitrines = await prisma.produitVitrine.findMany({
      where: {
        gamme: { marqueId: marque.id, nom: { in: aff.gammes } },
        // Les accessoires gardent leur catégorie « Accessoires », qui
        // porte le drapeau estOption : c'est elle qui les rend
        // sélectionnables dans l'onglet Options.
        categories: { none: { estOption: true } },
      },
      select: { id: true, nom: true, gamme: { select: { nom: true } } },
      orderBy: { nom: "asc" },
    });

    if (!vitrines.length) { ignores++; continue; }

    console.log(`▸ ${aff.categorie} › ${aff.sousCategories.join(" + ")}`);
    console.log(`   ${vitrines.length} produit(s) — ${aff.gammes.join(", ")}`);

    if (!APPLIQUER) { traites += vitrines.length; continue; }

    for (const v of vitrines) {
      await prisma.produitVitrine.update({
        where: { id: v.id },
        data: {
          // set remplace les rattachements existants : on repart des
          // bons plutôt que d'accumuler avec les noms inventés.
          categories: { set: [{ id: cat.id }] },
          sousCategories: { set: sousCats.map((s) => ({ id: s.id })) },
          // Les principales déterminent l'URL publique du produit.
          categoriePrincipaleId: cat.id,
          sousCategoriePrincipaleId: sousCats[0].id,
        },
      });
      traites++;
    }
  }

  console.log(`\n${traites} produit(s) ${APPLIQUER ? "rattaché(s)" : "à rattacher"}.`);
  if (ignores) console.log(`${ignores} affectation(s) sans produit.`);

  if (!APPLIQUER) {
    console.log("\nnode prisma\\categories-sokoa.mjs --appliquer");
    return;
  }

  // ── Contrôle ──
  const orphelins = await prisma.produitVitrine.findMany({
    where: {
      gamme: { marqueId: marque.id },
      categories: { none: {} },
    },
    select: { nom: true, gamme: { select: { nom: true } } },
  });

  if (orphelins.length) {
    console.log(`\n⚠ ${orphelins.length} produit(s) sans catégorie :`);
    orphelins.forEach((v) => console.log(`   ${v.gamme.nom} — ${v.nom}`));
  } else {
    console.log("\nTous les produits Sokoa ont une catégorie.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());