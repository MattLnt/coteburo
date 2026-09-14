// Import des fiches OfficePro en base, à partir de prisma/officepro-fiches.json.
//
// En simulation par défaut : le script compte, compare à l'existant et dit ce
// qu'il ferait, sans rien écrire.
//
// Tout arrive en brouillon. Aucune fiche n'a encore d'image — le rapprochement
// des visuels est une étape à part, et publier un catalogue sans photo ne
// rendrait service à personne. Publier se fera ensuite, gamme par gamme.
//
//   node prisma/officepro-import.mjs
//   node prisma/officepro-import.mjs --appliquer
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { ESPACES, EMPLACEMENTS_PAR_TYPE, GAMMES } from "./officepro-correspondances.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const SOURCE = "prisma/officepro-fiches.json";

const norm = (s) => (s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
const slugifier = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const arrondir2 = (n) => Math.round(n * 100) / 100;
// Même règle que lib/prixCatalogue : un montant négatif est une minoration et
// échappe à la marge.
const appliquerMarge = (tarif, marge) => (tarif < 0 ? tarif : arrondir2(tarif * (1 + (marge ?? 0))));

const id7 = (n) => `op${n.toString(36).padStart(5, "0")}`;

async function main() {
  console.log(APPLIQUER ? "═══ MODE RÉEL ═══\n" : "═══ SIMULATION — rien n'est écrit ═══\n");

  const fiches = JSON.parse(await readFile(SOURCE, "utf8"));
  const reglages = await prisma.reglages.findUnique({ where: { id: 1 }, select: { margeGlobale: true } });
  const marge = reglages?.margeGlobale ?? 0;
  console.log(`marge globale lue en réglages : ${marge} — un tarif de 100 € se vend ${appliquerMarge(100, marge)} €\n`);

  const marque = await prisma.marque.findUnique({ where: { slug: "officepro" }, select: { id: true, nom: true } });
  if (!marque) { console.log("Marque OfficePro absente."); return; }

  // ── Emplacements ──
  const cats = await prisma.categorie.findMany({ select: { id: true, slug: true, sousCategories: { select: { id: true, slug: true } } } });
  const catParSlug = new Map(cats.map((c) => [c.slug, c]));
  const emplacements = new Set([...Object.values(ESPACES), ...Object.values(EMPLACEMENTS_PAR_TYPE)].map((e) => `${e.categorie}/${e.sousCategorie}`));
  const manquants = [...emplacements].filter((e) => {
    const [c, s] = e.split("/");
    return !catParSlug.get(c)?.sousCategories.some((x) => x.slug === s);
  });
  if (manquants.length) { console.log(`Emplacements introuvables au catalogue : ${manquants.join(", ")}`); return; }
  console.log(`${emplacements.size} emplacements utilisés, tous présents au catalogue.`);

  // ── Gammes ──
  const gammesBase = await prisma.gamme.findMany({
    select: { id: true, nom: true, slug: true, marqueId: true, venteSurDevis: true, marque: { select: { slug: true } }, _count: { select: { vitrines: true } } },
  });
  const parNom = new Map(gammesBase.map((g) => [norm(g.nom), g]));

  const aCreer = [], aReutiliser = [], aDeplacer = [];
  for (const g of GAMMES) {
    const existe = parNom.get(norm(g.nom));
    if (!existe) aCreer.push(g);
    else if (existe.marque.slug === "officepro") aReutiliser.push({ g, existe });
    // Même nom sous une autre marque, et sans aucune vitrine : c'est une gamme
    // OfficePro rangée par erreur sous Buronomic, pas un homonyme légitime.
    else if (existe._count.vitrines === 0) aDeplacer.push({ g, existe });
    else aReutiliser.push({ g, existe, conflit: true });
  }

  console.log(`\ngammes : ${aCreer.length} à créer · ${aReutiliser.length} déjà sous OfficePro · ${aDeplacer.length} à rattacher depuis une autre marque`);
  if (aDeplacer.length) {
    console.log("   à rattacher (vides, homonymes sous une autre marque) :");
    console.log("      " + aDeplacer.map(({ g, existe }) => `${g.nom} [${existe.marque.slug}]`).join(" · "));
  }
  const conflits = aReutiliser.filter((x) => x.conflit);
  if (conflits.length) console.log(`   ⚠ ${conflits.length} homonymes portant déjà des vitrines : ${conflits.map((x) => x.g.nom).join(", ")}`);

  // Une gamme OfficePro déjà nommée « Galet OfficePro » ferait doublon avec la
  // « Galet » qu'on rattache : deux gammes pour un même produit dans l'admin.
  const sousOfficePro = gammesBase.filter((g) => g.marque.slug === "officepro");
  const doublons = [];
  for (const g of GAMMES) {
    const proches = sousOfficePro.filter((x) => norm(x.nom) !== norm(g.nom) && norm(x.nom).startsWith(norm(g.nom)));
    if (proches.length && (aDeplacer.some((d) => d.g === g) || aCreer.includes(g))) {
      doublons.push({ gamme: g.nom, proches: proches.map((x) => `${x.nom} (${x._count.vitrines} vitrines)`) });
    }
  }
  if (doublons.length) {
    console.log(`   ⚠ ${doublons.length} doublons de gamme à trancher avant d'appliquer :`);
    for (const d of doublons) console.log(`      « ${d.gamme} » cohabiterait avec ${d.proches.join(", ")}`);
  }

  // ── Vitrines existantes ──
  const dejaLa = await prisma.produitVitrine.findMany({
    where: { gamme: { marque: { slug: "officepro" } } },
    select: { id: true, nom: true, slug: true, publie: true, gamme: { select: { nom: true } } },
  });
  console.log(`\n${dejaLa.length} vitrines OfficePro déjà en base :`);
  for (const v of dejaLa) console.log(`   [${v.gamme.nom}] ${v.nom}${v.publie ? "" : "  (brouillon)"}`);

  // ── Fiches à écrire ──
  const prevues = fiches.map((f, i) => {
    const decl = f.declinaisons.map((d, j) => ({
      id: id7(i * 100 + j),
      valeurs: d.valeurs,
      prixTarifHT: d.prixTarifHT != null ? String(d.prixTarifHT) : "",
      prixVenteHT: d.prixTarifHT != null ? String(appliquerMarge(d.prixTarifHT, marge)) : "",
      prixVerrouille: false,
      // Écotaxe Valdelia reprise telle quelle : c'est ce qu'OfficePro facture.
      ecoContribution: d.ecoContribution ?? 0,
      referenceFournisseur: d.referenceFournisseur || null,
      codeBarre: d.codeBarre || null,
    }));
    const axes = f.axes.map((a) => ({ id: a.id, nom: a.id.charAt(0).toUpperCase() + a.id.slice(1), valeurs: a.valeurs }));
    return { fiche: f, slug: slugifier(f.nom), axes, declinaisons: decl };
  });

  // Doublons de slug au sein d'une même gamme : la base les refuserait.
  const vus = new Map();
  const collisions = [];
  for (const p of prevues) {
    const cle = `${p.fiche.gamme}/${p.slug}`;
    if (vus.has(cle)) collisions.push(cle); else vus.set(cle, p);
  }
  if (collisions.length) console.log(`\n⚠ ${collisions.length} slugs en double : ${[...new Set(collisions)].join(", ")}`);

  // Fiches déjà présentes, par nom : l'import les remplacerait.
  const parNomExistant = new Map(dejaLa.map((v) => [norm(v.nom), v]));
  const remplacees = prevues.filter((p) => parNomExistant.has(norm(p.fiche.nom)));
  if (remplacees.length) console.log(`\n${remplacees.length} fiches déjà en base sous le même nom : ${remplacees.map((p) => p.fiche.nom).join(" · ")}`);

  // ── Options liées ──
  // Une fiche sans prix dont la mention dit « inclus avec X » est un accessoire
  // du porteur : il la reçoit en option, comme le coussin d'assise Buronomic.
  const options = [];
  for (const p of prevues) {
    const mention = p.fiche.declinaisons.find((d) => d.prixMention)?.prixMention;
    if (!mention) continue;
    const cible = prevues.find((q) => q !== p && norm(mention).includes(norm(q.fiche.type || "")) && q.fiche.gamme.startsWith(p.fiche.gamme.split(" ")[0]));
    options.push({ accessoire: p, porteur: cible || null, mention });
  }
  console.log(`\n${options.length} fiches sans prix, rattachées comme option :`);
  for (const o of options) console.log(`   ${o.accessoire.fiche.nom} → ${o.porteur ? o.porteur.fiche.nom : "PORTEUR NON TROUVÉ"}   « ${o.mention} »`);

  // ── Récapitulatif ──
  const totalDecl = prevues.reduce((s, p) => s + p.declinaisons.length, 0);
  const surDevis = prevues.filter((p) => p.fiche.surDevis).length;
  console.log(`\n${prevues.length} fiches · ${totalDecl} déclinaisons · ${surDevis} sur devis · toutes en brouillon`);

  const prix = prevues.flatMap((p) => p.declinaisons.map((d) => Number(d.prixVenteHT)).filter((n) => n > 0));
  console.log(`prix de vente calculés : ${prix.length} · min ${Math.min(...prix)} € · max ${Math.max(...prix)} €`);

  console.log("\nexemple :");
  const ex = prevues.find((p) => p.declinaisons.length > 3);
  console.log(`   ${ex.fiche.nom}  [${ex.fiche.gamme}]  ${ex.slug}`);
  console.log(`   ${ex.fiche.emplacement.categorie}/${ex.fiche.emplacement.sousCategorie} · ${ex.axes.length} axes · ${ex.declinaisons.length} déclinaisons`);
  for (const d of ex.declinaisons.slice(0, 3)) {
    console.log(`      ${String(d.referenceFournisseur).padEnd(13)} ${Object.values(d.valeurs).join(" / ").slice(0, 38).padEnd(40)} tarif ${d.prixTarifHT} € → vente ${d.prixVenteHT} € · éco ${d.ecoContribution} €`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer.");
    return;
  }

  // ── Écriture ──
  await mkdir("prisma/sauvegardes", { recursive: true });
  const fichierSauv = `prisma/sauvegardes/officepro-avant-import-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(fichierSauv, JSON.stringify({ gammes: gammesBase.filter((g) => g.marque.slug === "officepro"), vitrines: dejaLa }, null, 2), "utf8");
  console.log(`\nSauvegarde de l'existant : ${fichierSauv}`);

  const idGamme = new Map();
  for (const { g, existe } of aReutiliser) idGamme.set(g.nom, existe.id);
  for (const { g, existe } of aDeplacer) {
    await prisma.gamme.update({ where: { id: existe.id }, data: { marqueId: marque.id, venteSurDevis: !!g.surDevis } });
    idGamme.set(g.nom, existe.id);
  }
  for (const g of aCreer) {
    const cree = await prisma.gamme.create({
      data: { nom: g.nom, slug: slugifier(g.nom), marqueId: marque.id, publie: false, venteSurDevis: !!g.surDevis },
    });
    idGamme.set(g.nom, cree.id);
  }
  console.log(`${idGamme.size} gammes prêtes.`);

  const idVitrine = new Map();
  for (const p of prevues) {
    const e = p.fiche.emplacement;
    const cat = catParSlug.get(e.categorie);
    const sous = cat.sousCategories.find((x) => x.slug === e.sousCategorie);
    const gammeId = idGamme.get(p.fiche.gamme);
    const donnees = {
      nom: p.fiche.nom,
      slug: p.slug,
      gammeId,
      publie: false,
      venteSurDevis: !!p.fiche.surDevis,
      sansDeclinaisons: p.declinaisons.length <= 1 && p.axes.length === 0,
      axesDeclinaisons: p.axes,
      declinaisons: p.declinaisons,
      categoriePrincipaleId: cat.id,
      sousCategoriePrincipaleId: sous.id,
      categories: { set: [{ id: cat.id }] },
      sousCategories: { set: [{ id: sous.id }] },
    };
    const existe = await prisma.produitVitrine.findFirst({ where: { gammeId, slug: p.slug }, select: { id: true } });
    const v = existe
      ? await prisma.produitVitrine.update({ where: { id: existe.id }, data: donnees })
      : await prisma.produitVitrine.create({ data: { ...donnees, categories: { connect: [{ id: cat.id }] }, sousCategories: { connect: [{ id: sous.id }] } } });
    idVitrine.set(p.fiche.nom, v.id);
  }
  console.log(`${idVitrine.size} fiches écrites.`);

  let lies = 0;
  for (const o of options) {
    if (!o.porteur) continue;
    const idAcc = idVitrine.get(o.accessoire.fiche.nom);
    const idPor = idVitrine.get(o.porteur.fiche.nom);
    if (!idAcc || !idPor) continue;
    await prisma.produitVitrine.update({ where: { id: idPor }, data: { optionsLiees: { connect: [{ id: idAcc }] } } });
    lies++;
  }
  console.log(`${lies} options rattachées à leur porteur.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
