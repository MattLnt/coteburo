// Réécrit l'arborescence du catalogue sur celle que le client a fournie.
//
//   node prisma/reclasser-architecture-client.mjs
//   node prisma/reclasser-architecture-client.mjs --appliquer
//   node prisma/reclasser-architecture-client.mjs --supprimer-vides
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Le client dit que les catégories du site n'ont rien à voir avec son
//   fichier. Il a raison, et pas seulement sur les noms : « Sièges visiteur
//   et accueil » contenait cent fiches dont les six tables Klik, les quatre
//   poufs Kulbu et neuf tabourets. Une sous-catégorie qui accueille des
//   tables n'est plus un rayon, c'est une corbeille.
//
//   On ne peut donc PAS traduire l'ancien classement vers le nouveau : il
//   faut reclasser fiche par fiche.
//
// COMMENT ON DÉCIDE
//   Le nom d'une fiche est bâti « <produit> - <Gamme> », et la gamme dit le
//   reste. Les règles ci-dessous se lisent dans l'ordre, la première qui
//   accroche gagne. Elles sont écrites à la main plutôt que déduites : une
//   heuristique qui range un mange-debout dans les sièges parce qu'il vient
//   d'une gamme de cafétéria, c'est exactement le défaut qu'on répare.
//
//   Une fiche qu'AUCUNE règle n'attrape fait échouer le script. C'est le
//   filet : tant qu'il reste une fiche sans règle, rien ne s'écrit.
//
// CE QU'IL NE FAIT PAS
//   Supprimer les anciennes sous-catégories devenues vides avec --appliquer.
//   Elles sont listées à la fin ; --supprimer-vides les retire, une fois
//   la liste validée. Il refuse tout rayon qui porte encore une fiche.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
// Retire les rayons et catégories devenus vides. Séparé de --appliquer :
// on ne supprime rien sans validation, même ce qui ne contient plus rien.
const SUPPRIMER_VIDES = process.argv.includes("--supprimer-vides");
const titre = (t) => console.log(`\n${"═".repeat(76)}\n${t}\n${"═".repeat(76)}`);
const slugify = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ── L'arborescence demandée ──────────────────────────────────────────────
const ARBRE = [
  ["Mobilier d'accueil", "accueil", [["Comptoirs d'accueil", "accueil"]]],
  ["Bureaux", "bureaux", [
    ["Ergonomic", "bureaux"], ["Direction", "bureaux"], ["Coworking", "bureaux"],
    ["Collaboratif", "bureaux"], ["Compléments & accessoires", "accessoire"],
    ["Bureaux classiques", "bureaux"]]],
  ["Rangements", "rangements", [
    ["Caissons", "casier"], ["Armoires", "rangements"],
    ["Bibliothèque", "etagere"], ["Archivage", "rangements"]]],
  ["Tables", "tables", [
    ["Tables modulaires", "tables"], ["Tables polyvalentes", "tables"],
    ["Tables basses", "tables"], ["Tables de réunion", "tables"]]],
  ["Accessoires", "accessoire", [["Convivialité", "canape"]]],
  ["Acoustique", "acoustique", [["Cloisons fixe", "cloison"]]],
  ["Cabines", "acoustique", []],
  ["Sièges", "sieges", [
    ["Direction", "sieges"], ["Collaboratif", "sieges"], ["Convivialité", "canape"],
    ["Réunion & formation", "sieges"], ["Ergo & technique", "sieges"],
    ["Sièges hauts", "sieges"], ["Cafétéria", "sieges"], ["Outdoor", "exterieur"],
    ["Poufs", "pouf"], ["Tabourets", "sieges"]]],
];

// ── Les règles, dans l'ordre ─────────────────────────────────────────────
const R = (g, n, cat, sous) => ({ g: g && new RegExp(g, "i"), n: n && new RegExp(n, "i"), cat, sous });
const BUR_COMP = ["Bureaux", "Compléments & accessoires"];

const REGLES = [
  // ── Buronomic ──────────────────────────────────────────────────────────
  R("^FIFTY-FULL$", null, "Mobilier d'accueil", "Comptoirs d'accueil"),
  R("^ESSENTIELLE$", null, "Cabines", null),
  R("^BEWALL", null, "Acoustique", "Cloisons fixe"),
  R("^OASYS$", null, "Accessoires", "Convivialité"),

  R("^ALTO$", "^Caisson ", "Rangements", "Caissons"),
  R("^ALTO$", "^Rangement ", "Rangements", "Armoires"),
  R("^ALTO$", "^Table basse", "Tables", "Tables basses"),
  R("^ALTO$", "^Bureau ", "Bureaux", "Collaboratif"),
  R("^ALTO$", null, ...BUR_COMP),
  R("^ALTO ASSISE$", null, "Sièges", "Convivialité"),
  R("^ALTO ASSISE CONFIDENTIELLE$", null, "Sièges", "Convivialité"),
  R("^ALTO BIBLIOTHEQUE$", null, "Rangements", "Bibliothèque"),
  R("^ALTO COWORKING$", null, "Bureaux", "Coworking"),
  R("^ALTO RANGEMENT$", null, "Rangements", "Armoires"),
  R("^ALTO REUNION$", "^Table de réunion", "Tables", "Tables de réunion"),
  R("^ALTO REUNION$", null, ...BUR_COMP),
  R("^ALTO RH$", "^Caisson ", "Rangements", "Caissons"),
  R("^ALTO RH$", "^Rangement ", "Rangements", "Armoires"),
  R("^ALTO RH$", "^Table de réunion", "Tables", "Tables de réunion"),
  R("^ALTO RH$", "^Bureau ", "Bureaux", "Ergonomic"),

  R("^ASTRO$", "^Bureau multiposte", "Bureaux", "Collaboratif"),
  R("^ASTRO$", "^Bureau plan", "Bureaux", "Bureaux classiques"),
  R("^ASTRO$", null, ...BUR_COMP),
  R("^ASTRO DIRECTION$", "^Bureau de direction", "Bureaux", "Direction"),
  R("^ASTRO DIRECTION$", "^Meuble de service", "Rangements", "Armoires"),
  R("^ASTRO DIRECTION$", null, ...BUR_COMP),
  R("^ASTRO REUNION$", null, "Tables", "Tables de réunion"),
  R("^ASTROLITE$", "^Bureau multiposte", "Bureaux", "Collaboratif"),
  R("^ASTROLITE$", "^Bureau plan", "Bureaux", "Bureaux classiques"),
  R("^ASTROLITE$", null, ...BUR_COMP),
  R("^ASTROLITE HAUTE$", null, "Tables", "Tables polyvalentes"),
  R("^ASTROLITE MOBILE$", null, "Bureaux", "Bureaux classiques"),
  R("^ASTROLITE REUNION$", null, "Tables", "Tables de réunion"),
  R("^ASTROLITE RH$", "^Bureau ", "Bureaux", "Ergonomic"),
  R("^ASTROLITE RH$", null, ...BUR_COMP),

  R("^CLASSIF$", null, "Rangements", "Archivage"),
  R("^COHESION", "^Table de coworking", "Bureaux", "Coworking"),
  R("^COHESION", null, ...BUR_COMP),
  R("^COMFORT$", null, "Rangements", "Caissons"),
  R("^CONNECTIQUE$", null, ...BUR_COMP),
  R("^COURTOISIE$", null, ...BUR_COMP),
  R("^DETENTE$", "^Table ", "Tables", "Tables polyvalentes"),
  R("^DETENTE$", "^Tabouret", "Sièges", "Tabourets"),
  R("^EKO$", null, "Rangements", "Armoires"),
  R("^ELECTRIFICATION$", null, ...BUR_COMP),
  R("^ENSEMBLE$", "modulaire", "Tables", "Tables modulaires"),
  R("^ENSEMBLE$", null, "Tables", "Tables polyvalentes"),
  R("^ENVOL CLASSIC$", "^Bureau ", "Bureaux", "Ergonomic"),
  R("^ENVOL CLASSIC$", null, ...BUR_COMP),
  R("^ENVOL EVO$", "^Table de réunion", "Tables", "Tables de réunion"),
  R("^ENVOL EVO$", "^Bureau ", "Bureaux", "Ergonomic"),
  R("^ENVOL EVO$", null, ...BUR_COMP),
  R("^ENVOL MANAGER$", "^Bureau de direction", "Bureaux", "Direction"),
  R("^ENVOL MANAGER$", null, ...BUR_COMP),
  R("^ENVOL ONE$", "^Bureau ", "Bureaux", "Ergonomic"),
  R("^ENVOL ONE$", null, ...BUR_COMP),
  R("^ERGONOMIE$", null, ...BUR_COMP),
  R("^ESSENTIEL$", "^Bureau ", "Bureaux", "Bureaux classiques"),
  R("^ESSENTIEL$", null, ...BUR_COMP),
  R("^ESSENTIEL RH$", "^Bureau ", "Bureaux", "Ergonomic"),
  R("^ESSENTIEL RH$", null, ...BUR_COMP),
  R("^EUREKA$", "^Table ", "Tables", "Tables modulaires"),
  R("^EUREKA$", null, ...BUR_COMP),
  R("^EXTENSIONS$", null, ...BUR_COMP),
  R("^GALET$", null, "Tables", "Tables basses"),
  R("^GUEST$", null, "Tables", "Tables basses"),
  R("^PAISIBLE$", null, "Rangements", "Caissons"),
  R("^PARTAGE$", "^Bureau multiposte", "Bureaux", "Collaboratif"),
  R("^PARTAGE$", "^Bureau plan", "Bureaux", "Bureaux classiques"),
  R("^PARTAGE REUNION$", null, "Tables", "Tables de réunion"),
  R("^QUIETUDE$", "^Bibliothèque", "Rangements", "Bibliothèque"),
  R("^QUIETUDE$", "^Châssis", "Rangements", "Archivage"),
  R("^QUIETUDE$", null, "Rangements", "Armoires"),
  R("^RENCONTRE$", null, "Tables", "Tables polyvalentes"),
  R("^RETRO$", null, "Bureaux", "Bureaux classiques"),
  R("^SOLUTION ", null, "Tables", "Tables modulaires"),
  R("^STRICTO DIRECTION$", "^Bureau de direction", "Bureaux", "Direction"),
  R("^STRICTO DIRECTION$", null, ...BUR_COMP),

  // ── OfficePro ──────────────────────────────────────────────────────────
  R("^Amy$", null, "Sièges", "Ergo & technique"),
  R("^Arco$", "^Pouf", "Sièges", "Poufs"),
  R("^Arco$", null, "Sièges", "Convivialité"),
  R("^Beez$", "^Chaise haute", "Sièges", "Sièges hauts"),
  R("^Beez$", "^Chaise$", "Sièges", "Cafétéria"),
  R("^Beez$", null, "Tables", "Tables polyvalentes"),
  R("^Bristol$", null, "Sièges", "Direction"),
  R("^Budget$", null, "Sièges", "Sièges hauts"),
  R("^Cheyenne$", null, "Sièges", "Ergo & technique"),
  R("^Coigny$", null, "Sièges", "Réunion & formation"),
  R("^Ergostar Ultra$", null, "Sièges", "Direction"),
  R("^Galet$", null, "Tables", "Tables basses"),
  R("^Giro$", null, "Tables", "Tables basses"),
  R("^Heavy$", null, "Sièges", "Ergo & technique"),
  R("^Khong$", null, "Sièges", "Collaboratif"),
  R("^Lando$", null, "Sièges", "Direction"),
  R("^Liberty$", null, "Sièges", "Direction"),
  R("^Loops$", "^Chaise haute", "Sièges", "Sièges hauts"),
  R("^Loops$", "^Tabouret", "Sièges", "Tabourets"),
  R("^Loops$", null, "Sièges", "Collaboratif"),
  R("^Proseat$", null, "Sièges", "Ergo & technique"),
  R("^Scott$", "^Siège visiteur", "Sièges", "Collaboratif"),
  R("^Scott$", null, "Sièges", "Ergo & technique"),
  R("^Shineo$", null, "Sièges", "Convivialité"),
  R("^Square$", null, "Tables", "Tables basses"),
  R("^Steno$", null, "Sièges", "Sièges hauts"),
  R("^Tecseat$", "^Tabouret", "Sièges", "Tabourets"),
  R("^Tecseat$", null, "Sièges", "Réunion & formation"),
  R("^Tecsy$", "dessinateur", "Sièges", "Ergo & technique"),
  R("^Tecsy$", null, "Sièges", "Direction"),
  R("^Vaseat$", null, "Sièges", "Direction"),
  R("^Wave$", null, "Sièges", "Direction"),
  R("^Verano$", "^Table basse", "Tables", "Tables basses"),
  R("^Verano$", "^(Grande|Petite) table|^Table |^Mange debout", "Tables", "Tables polyvalentes"),
  R("^Verano$", "^Support pour plantes", "Accessoires", "Convivialité"),
  R("^Verano$", null, "Sièges", "Outdoor"),

  // ── Sokoa ──────────────────────────────────────────────────────────────
  R("^Adela$", "^Tabouret", "Sièges", "Tabourets"),
  R("^Adela$", "^Siège giratoire", "Sièges", "Ergo & technique"),
  R("^Adela$", null, "Sièges", "Collaboratif"),
  R("^Adio$", "^Siège giratoire", "Sièges", "Ergo & technique"),
  R("^Adio$", null, "Sièges", "Collaboratif"),
  R("^Alaia by Sokoa$", null, "Sièges", "Ergo & technique"),
  R("^Archikit$", null, "Rangements", "Bibliothèque"),
  R("^Azkar$", null, "Sièges", "Direction"),
  R("^Batbi$", null, "Sièges", "Convivialité"),
  R("^Bero$", null, "Sièges", "Collaboratif"),
  R("^Eden$", null, "Sièges", "Direction"),
  R("^Eman$", "de direction", "Sièges", "Direction"),
  R("^Eman$", null, "Sièges", "Ergo & technique"),
  R("^Emeki$", "^Pouf", "Sièges", "Poufs"),
  R("^Emeki$", null, "Sièges", "Convivialité"),
  R("^Ildo$", null, "Sièges", "Convivialité"),
  R("^Kanpoa by Colos$", "Table", "Tables", "Tables polyvalentes"),
  R("^Kanpoa by Colos$", "^Tabouret", "Sièges", "Tabourets"),
  R("^Kanpoa by Colos$", "lounge", "Sièges", "Convivialité"),
  R("^Kanpoa by Colos$", null, "Sièges", "Cafétéria"),
  R("^Klik$", "^Table ", "Tables", "Tables polyvalentes"),
  R("^Klik$", "^Tabouret", "Sièges", "Tabourets"),
  R("^Klik$", "giratoire HAUTE", "Sièges", "Sièges hauts"),
  R("^Klik$", null, "Sièges", "Réunion & formation"),
  R("^Kulbu$", null, "Sièges", "Poufs"),
  R("^Loria$", "^Tabouret", "Sièges", "Tabourets"),
  R("^Loria$", "^Chaise haute", "Sièges", "Sièges hauts"),
  R("^Loria$", "giratoire", "Sièges", "Ergo & technique"),
  R("^Loria$", null, "Sièges", "Collaboratif"),
  R("^Luma$", null, "Sièges", "Ergo & technique"),
  R("^Luz$", null, "Sièges", "Ergo & technique"),
  R("^Maike$", "^Tabouret", "Sièges", "Tabourets"),
  R("^Maike$", null, "Sièges", "Cafétéria"),
  R("^Punta$", "^Table basse", "Tables", "Tables basses"),
  R("^Punta$", null, "Sièges", "Convivialité"),
  R("^Rhune$", "^Table basse", "Tables", "Tables basses"),
  R("^Rhune$", null, "Sièges", "Convivialité"),
  R("^Sièges Hauts$", null, "Sièges", "Sièges hauts"),
  R("^Tertio$", null, "Sièges", "Ergo & technique"),
  R("^Wi-Max", null, "Sièges", "Ergo & technique"),
];

function classer(nom, gamme) {
  for (const r of REGLES) {
    if (r.g && !r.g.test(gamme || "")) continue;
    if (r.n && !r.n.test(nom || "")) continue;
    return r;
  }
  return null;
}

async function supprimerVides() {
  console.log("═══ SUPPRESSION DES RAYONS VIDES ═══\n");
  const vides = await prisma.sousCategorie.findMany({
    where: { vitrines: { none: {} } },
    select: { id: true, nom: true, categorie: { select: { nom: true } } },
  });
  for (const v of vides) {
    await prisma.sousCategorie.delete({ where: { id: v.id } });
    console.log(`   rayon retiré : ${v.categorie.nom} › ${v.nom}`);
  }
  // Une catégorie ne part que sans rayon ET sans fiche : Cabines n'a pas
  // de rayon et doit rester.
  const cats = await prisma.categorie.findMany({
    where: { vitrines: { none: {} }, sousCategories: { none: {} } },
    select: { id: true, nom: true },
  });
  for (const c of cats) {
    await prisma.categorie.delete({ where: { id: c.id } });
    console.log(`   catégorie retirée : ${c.nom}`);
  }
  console.log(`\n   ${vides.length} rayons et ${cats.length} catégories supprimés.`);
}

async function main() {
  if (SUPPRIMER_VIDES) return supprimerVides();
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  // TOUTES les fiches, brouillons et hors-catalogue compris : une fiche
  // invisible qui reste accrochée à un ancien rayon l'empêche de disparaître.
  const fiches = await prisma.produitVitrine.findMany({
    select: { id: true, nom: true, gamme: { select: { nom: true } },
      categoriePrincipaleId: true, sousCategoriePrincipaleId: true,
      categories: { select: { id: true } }, sousCategories: { select: { id: true } } },
  });

  const plan = [];
  const orphelines = [];
  for (const f of fiches) {
    const r = classer(f.nom, f.gamme?.nom);
    if (!r) { orphelines.push(f); continue; }
    plan.push({ ...f, cat: r.cat, sous: r.sous });
  }

  if (orphelines.length) {
    titre(`✗ ${orphelines.length} FICHES SANS RÈGLE — rien ne sera écrit`);
    for (const f of orphelines) console.log(`   ${(f.gamme?.nom || "—").padEnd(24)} ${f.nom}`);
    process.exitCode = 1;
    return;
  }

  // ── Ce que ça donne ────────────────────────────────────────────────────
  titre(`LA NOUVELLE ARBORESCENCE — ${plan.length} fiches`);
  for (const [cat, , sousList] of ARBRE) {
    const dansCat = plan.filter((p) => p.cat === cat);
    console.log(`\n${cat.toUpperCase()}  (${dansCat.length})`);
    if (!sousList.length) { console.log(`   — sans sous-catégorie —        ${String(dansCat.length).padStart(4)}`); continue; }
    for (const [sous] of sousList) {
      const n = dansCat.filter((p) => p.sous === sous).length;
      console.log(`   ${sous.padEnd(30)} ${String(n).padStart(4)}${n === 0 ? "   ← VIDE" : ""}`);
    }
    for (const p of dansCat.filter((p) => !sousList.some(([s]) => s === p.sous))) {
      console.log(`   ✗ sous-catégorie inconnue « ${p.sous} » : ${p.nom}`);
    }
  }

  if (!APPLIQUER) {
    titre("DÉTAIL PAR SOUS-CATÉGORIE");
    for (const [cat, , sousList] of ARBRE) {
      for (const [sous] of (sousList.length ? sousList : [[null]])) {
        const l = plan.filter((p) => p.cat === cat && p.sous === sous);
        if (!l.length) continue;
        console.log(`\n── ${cat} › ${sous ?? "(racine)"}  (${l.length})`);
        for (const p of l.sort((a, b) => a.nom.localeCompare(b.nom))) console.log(`   ${p.nom}`);
      }
    }
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  // ── Écriture ───────────────────────────────────────────────────────────
  const marque = await prisma.marque.findFirst({ where: { slug: "buronomic" } })
    || await prisma.marque.findFirst();

  const idCat = new Map();
  const idSous = new Map();
  for (let i = 0; i < ARBRE.length; i++) {
    const [nom, icone, sousList] = ARBRE[i];
    const slug = slugify(nom);
    const existe = await prisma.categorie.findFirst({ where: { marqueId: marque.id, slug } });
    const cat = existe
      ? await prisma.categorie.update({ where: { id: existe.id }, data: { nom, ordre: i, icone } })
      : await prisma.categorie.create({ data: { nom, slug, marqueId: marque.id, ordre: i, icone } });
    idCat.set(nom, cat.id);

    for (let j = 0; j < sousList.length; j++) {
      const [sNom, sIcone] = sousList[j];
      const sSlug = slugify(sNom);
      const sExiste = await prisma.sousCategorie.findFirst({ where: { categorieId: cat.id, slug: sSlug } });
      const sc = sExiste
        ? await prisma.sousCategorie.update({ where: { id: sExiste.id }, data: { nom: sNom, ordre: j, icone: sIcone } })
        // SousCategorie.id n'a pas de valeur par défaut : la base porte des
        // identifiants lisibles, « sc-<categorie>-<rayon> ». On suit l'usage.
        : await prisma.sousCategorie.create({ data: { id: `sc-${slug}-${sSlug}`, nom: sNom, slug: sSlug, categorieId: cat.id, ordre: j, icone: sIcone } });
      idSous.set(`${nom}›${sNom}`, sc.id);
    }
  }

  let n = 0, dejaBien = 0;
  for (const p of plan) {
    const catId = idCat.get(p.cat);
    const sousId = p.sous ? idSous.get(`${p.cat}›${p.sous}`) : null;
    if (!catId || (p.sous && !sousId)) throw new Error(`cible introuvable pour ${p.nom}`);
    // Déjà en place : on n'écrit pas. Chaque écriture coûte plusieurs
    // allers-retours vers Railway ; le script se relance en quelques minutes
    // au lieu d'une demi-heure.
    const enPlace = p.categoriePrincipaleId === catId && p.sousCategoriePrincipaleId === sousId
      && p.categories.length === 1 && p.categories[0].id === catId
      && p.sousCategories.length === (sousId ? 1 : 0) && (!sousId || p.sousCategories[0].id === sousId);
    if (enPlace) { dejaBien++; continue; }
    await prisma.produitVitrine.update({
      where: { id: p.id },
      data: {
        categories: { set: [{ id: catId }] },
        sousCategories: { set: sousId ? [{ id: sousId }] : [] },
        categoriePrincipaleId: catId,
        sousCategoriePrincipaleId: sousId,
      },
    });
    if (++n % 100 === 0) console.log(`   ${n}/${plan.length}`);
  }
  console.log(`\n   ${n} fiches reclassées · ${dejaBien} déjà en place.`);

  // ── Ce qui reste, et qu'on ne supprime pas ─────────────────────────────
  const vides = await prisma.sousCategorie.findMany({
    where: { vitrines: { none: {} } },
    select: { nom: true, categorie: { select: { nom: true } } },
  });
  const catsVides = await prisma.categorie.findMany({
    where: { vitrines: { none: {} }, sousCategories: { none: {} } },
    select: { nom: true },
  });
  titre("À VALIDER AVANT SUPPRESSION");
  console.log(`   ${vides.length} sous-catégories désormais vides :`);
  for (const v of vides) console.log(`      ${v.categorie.nom} › ${v.nom}`);
  console.log(`   ${catsVides.length} catégories vides :`);
  for (const c of catsVides) console.log(`      ${c.nom}`);
  console.log("\n   Rien n'a été supprimé.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
