// Import du catalogue Côté BURO depuis catalogue-2026/catalogue-coteburo.xlsx.
//
// En simulation par défaut. Il faut --appliquer pour écrire.
//
//   node prisma/importer-catalogue.mjs
//   node prisma/importer-catalogue.mjs --appliquer
//   node prisma/importer-catalogue.mjs --appliquer --marque=officepro
//   node prisma/importer-catalogue.mjs --appliquer --gamme=Eman   (une seule gamme)
//   node prisma/importer-catalogue.mjs --appliquer --options-seules
//
// POURQUOI ON PEUT DÉCOUPER
//   La base est distante et l'import dure une vingtaine de minutes : passer
//   fournisseur par fournisseur ménage la machine et laisse une reprise
//   propre si le processus s'arrête en route. Comme tout est rejouable, un
//   découpage ne change rien au résultat final. La réconciliation, elle, se
//   fait toujours contre le classeur ENTIER : c'est le seul moyen de voir ce
//   qui manque encore quand on n'importe qu'un morceau.
//
// REJOUABLE SANS DOUBLON
//   Rien n'est créé à l'aveugle : chaque objet a une clé stable et passe par
//   un upsert.
//     catégorie       (marqueId, slug)
//     sous-catégorie  identifiant calculé « sc-<cat>-<souscat> »
//     gamme           slug
//     fiche           (gammeId, slug)
//     déclinaison     identifiant calculé depuis la réf. complète
//   Les groupes de finition, eux, sont reconstruits : on les efface et on les
//   récrit, parce qu'ils n'ont pas de clé naturelle et qu'un upsert les
//   dédoublerait à chaque passage.
//
// UNE SEULE ARCHITECTURE POUR TROIS FOURNISSEURS
//   Le schéma rattache une catégorie à une marque, mais le site interroge
//   toujours celle de Buronomic (getCategoriesMenu, getFiltresCatalogue) et
//   les fiches des trois marques s'y accrochent par la relation
//   plusieurs-à-plusieurs. On garde cette convention : créer l'architecture
//   trois fois ferait apparaître « Bureaux » trois fois dans les filtres.
//
// LES PRIX
//   On n'écrit que le TARIF FOURNISSEUR et l'écotaxe. Le prix de vente naît
//   à l'affichage, dans lib/prixCatalogue.js, par application de la marge des
//   Réglages. Inscrire ici un prix de vente le figerait et ferait divergerpanier
//   et catalogue au premier changement de marge.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const FILTRE_GAMME = (process.argv.find((a) => a.startsWith("--gamme=")) || "").slice(8) || null;
const FILTRE_MARQUE = ((process.argv.find((a) => a.startsWith("--marque=")) || "").slice(9) || null)
  ?.toLowerCase() || null;
// --options-seules rejoue le seul rattachement des options, sur tout le
// catalogue déjà en base. Utile quand l'import s'est fait en plusieurs
// passages : rien à réécrire, juste les liens à refaire.
const OPTIONS_SEULES = process.argv.includes("--options-seules");
const PARTIEL = !!(FILTRE_GAMME || FILTRE_MARQUE || OPTIONS_SEULES);

const CLASSEUR = "catalogue-2026/catalogue-coteburo.xlsx";
const MARQUES = { BURONOMIC: "buronomic", OFFICEPRO: "officepro", SOKOA: "sokoa" };
// La marque qui porte l'architecture, cf. l'en-tête.
const PORTEUSE = "buronomic";

// L'architecture arrêtée avec le client : six catégories, trente et une
// sous-catégories. L'ordre de cette liste est l'ordre d'affichage.
// « Tables d'extérieur » n'apparaît dans le classeur qu'en sous-catégorie 2,
// sur les tables Verano et Beez rangées d'abord en sièges d'extérieur : c'est
// bien une trentième entrée, sous Tables.
const ARCHITECTURE = [
  { nom: "Bureaux", sous: [
    "Bureaux individuels", "Bureaux de direction", "Bureaux bench et collaboratifs",
    "Bureaux réglables en hauteur", "Compléments et électrification"] },
  { nom: "Sièges", sous: [
    "Sièges de direction", "Sièges opérateur et ergonomiques", "Sièges visiteur et accueil",
    "Sièges de réunion et formation", "Sièges techniques et ateliers",
    "Tabourets et sièges hauts", "Banquettes et poutres", "Sièges d'extérieur"] },
  { nom: "Tables", sous: [
    "Tables de réunion", "Tables modulaires et pliantes", "Tables basses",
    "Tables hautes et mange-debout", "Tables de cafétéria", "Tables d'extérieur"] },
  { nom: "Rangements", sous: [
    "Armoires", "Caissons", "Bibliothèques et archivage", "Casiers et vestiaires"] },
  { nom: "Espaces et acoustique", sous: [
    "Cabines acoustiques", "Cloisons et séparateurs", "Comptoirs d'accueil",
    "Mobilier de convivialité"] },
  // Les accessoires ne se vendent pas seuls : la catégorie est marquée
  // « option », ce qui la sort des listes produit du site.
  { nom: "Accessoires", estOption: true, sous: [
    "Accessoires de rangement", "Électrification et câbles", "Éclairage et bras écran",
    "Coussins et accessoires d'assise"] },
];

// ─────────── petits outils ───────────

function slug(s) {
  return String(s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[ØøŒœ]/g, (c) => ({ Ø: "o", ø: "o", Œ: "oe", œ: "oe" })[c])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Empreinte courte et stable d'une chaîne : sert d'identifiant rejouable. */
function empreinte(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}

const texte = (v) => {
  const t = String(v ?? "").trim();
  return t === "" || t === "None" ? null : t;
};

const nombre = (v) => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const entier = (v) => {
  const n = nombre(v);
  return n == null ? null : Math.round(n);
};

/** Une description technique « ## Titre / - puces » en sections de devis. */
function sections(brut) {
  const t = texte(brut);
  if (!t) return [];
  const out = [];
  let courante = null;
  for (const ligne of t.split(/\r?\n/)) {
    const l = ligne.trim();
    if (!l) continue;
    const titre = l.match(/^#{2,3}\s*(.+)$/);
    if (titre) {
      courante = { titre: titre[1].trim(), puces: [] };
      out.push(courante);
      continue;
    }
    const puce = l.replace(/^[-•*]\s*/, "");
    if (!courante) {
      courante = { titre: "Description technique", puces: [] };
      out.push(courante);
    }
    courante.puces.push(puce);
  }
  return out
    .filter((s) => s.puces.length)
    .map((s, i) => ({
      id: `s${i}${empreinte(s.titre)}`,
      titre: s.titre,
      contenu: `<ul>${s.puces.map((p) => `<li><p>${echapper(p)}</p></li>`).join("")}</ul>`,
    }));
}

const echapper = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ─────────── lecture du classeur ───────────

const COLONNES = {
  gamme: "Gamme", nature: "Nature", surDevis: "Sur devis",
  categorie: "Catégorie", sous1: "Sous-catégorie 1", sous2: "Sous-catégorie 2",
  nom: "Nom sur le site", designation: "Désignation fournisseur", page: "Page cat.",
  refProduit: "Réf. produit", refFinition: "Réf. finition", refComplete: "Réf. complète",
  tarif: "Tarif HT", ecotaxe: "Écotaxe",
  descGenerale: "Description générale", descTechnique: "Description technique",
  options: "Options (réf.)",
  largMin: "Larg. min", largMax: "Larg. max", profMin: "Prof. min", profMax: "Prof. max",
  hautMin: "Haut. min", hautMax: "Haut. max", poids: "Poids (kg)", ean: "Code EAN",
};

/** Le classeur, ramené aux filtres de la ligne de commande.
 *
 * `toutLeClasseur` ignore les filtres : c'est la référence contre laquelle on
 * réconcilie la base, même sur un import partiel.
 */
function lireClasseur(toutLeClasseur = false) {
  const wb = XLSX.readFile(CLASSEUR);
  const fiches = new Map(); // clé « marque|gamme|nom » → fiche
  let lignes = 0;

  for (const onglet of wb.SheetNames) {
    const marqueSlug = MARQUES[onglet];
    if (!marqueSlug) throw new Error(`Onglet inattendu : ${onglet}`);
    if (!toutLeClasseur && FILTRE_MARQUE && marqueSlug !== FILTRE_MARQUE) continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[onglet], { defval: null, raw: true });
    if (!rows.length) throw new Error(`Onglet vide : ${onglet}`);
    for (const c of Object.values(COLONNES)) {
      if (!(c in rows[0])) throw new Error(`Colonne « ${c} » absente de l'onglet ${onglet}`);
    }

    for (const r of rows) {
      lignes += 1;
      const g = texte(r[COLONNES.gamme]);
      const nom = texte(r[COLONNES.nom]);
      if (!g || !nom) throw new Error(`Ligne sans gamme ou sans nom dans ${onglet}`);
      if (!toutLeClasseur && FILTRE_GAMME && g !== FILTRE_GAMME) continue;

      const cle = `${marqueSlug}|${g}|${nom}`;
      if (!fiches.has(cle)) {
        fiches.set(cle, { marqueSlug, onglet, gamme: g, nom, lignes: [] });
      }
      fiches.get(cle).lignes.push(r);
    }
  }
  return { fiches: [...fiches.values()], lignes };
}

// ─────────── mise en forme d'une fiche ───────────

/** Les axes de déclinaison d'une fiche, et ses déclinaisons.
 *
 * Deux axes naturels : le modèle (réf. produit) et la finition. Ils ne
 * suffisent pas toujours — Archikit tient 144 références sous une seule
 * réf. produit et une finition muette. On ajoute alors un axe « référence »,
 * qui porte la réf. complète : moins élégant, mais aucune ligne ne se perd.
 */
function declinaisons(f, alertes) {
  const L = f.lignes;
  const modele = (r) => texte(r[COLONNES.designation]) || texte(r[COLONNES.refProduit]);
  const finition = (r) => {
    const v = texte(r[COLONNES.refFinition]);
    // « € » est l'en-tête de colonne du tarif Sokoa, pas une finition.
    return v && v !== "€" ? v : null;
  };

  // Un modèle peut porter deux réf. produit sous la même désignation : on
  // désambiguïse en accolant la référence.
  const refsParModele = new Map();
  for (const r of L) {
    const m = modele(r);
    if (!refsParModele.has(m)) refsParModele.set(m, new Set());
    refsParModele.get(m).add(texte(r[COLONNES.refProduit]));
  }
  const libelleModele = (r) => {
    const m = modele(r);
    return refsParModele.get(m).size > 1 ? `${m} (${texte(r[COLONNES.refProduit])})` : m;
  };

  const modeles = [...new Set(L.map(libelleModele))];
  const finitions = [...new Set(L.map(finition).filter(Boolean))];

  const axes = [];
  if (modeles.length > 1) axes.push({ id: "modele", nom: "Modèle", valeurs: modeles });
  if (finitions.length > 1) axes.push({ id: "finition", nom: "Finition", valeurs: finitions });

  // Les axes retenus identifient-ils chaque ligne sans ambiguïté ?
  const clef = (r) => axes.map((a) => (a.id === "modele" ? libelleModele(r) : finition(r))).join("¦");
  const vus = new Set();
  let ambigu = axes.length === 0;
  for (const r of L) {
    const k = clef(r);
    if (vus.has(k)) { ambigu = true; break; }
    vus.add(k);
  }
  if (ambigu) {
    const refs = [...new Set(L.map((r) => texte(r[COLONNES.refComplete])))];
    if (refs.length === L.length) {
      axes.length = 0;
      axes.push({ id: "reference", nom: "Référence", valeurs: refs });
    } else {
      axes.push({ id: "reference", nom: "Référence", valeurs: refs });
    }
  }

  const lignesOut = [];
  const pris = new Set();
  const doublons = [];
  for (const r of L) {
    const valeurs = {};
    for (const a of axes) {
      if (a.id === "modele") valeurs.modele = libelleModele(r);
      else if (a.id === "finition") valeurs.finition = finition(r);
      else valeurs.reference = texte(r[COLONNES.refComplete]);
    }
    const ref = texte(r[COLONNES.refComplete]);
    // L'identifiant mêle la référence ET les valeurs d'axes : chez Sokoa une
    // même référence se décline en catégories de tissu, seul le prix change.
    let id = `d${empreinte(`${ref || ""}¦${JSON.stringify(valeurs)}`)}`;
    if (pris.has(id)) {
      doublons.push(ref);
      let n = 2;
      while (pris.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    pris.add(id);
    lignesOut.push({
      id,
      valeurs,
      prixTarifHT: nombre(r[COLONNES.tarif]),
      prixVenteHT: null,
      prixVerrouille: false,
      ecoContribution: nombre(r[COLONNES.ecotaxe]),
      referenceFournisseur: ref,
      poids: nombre(r[COLONNES.poids]),
      ean: texte(r[COLONNES.ean]),
      pageCatalogue: entier(r[COLONNES.page]),
    });
  }
  if (doublons.length) {
    alertes.push(`${f.gamme} / ${f.nom} : ${doublons.length} réf. complète en double `
      + `(${doublons.slice(0, 3).join(", ")}${doublons.length > 3 ? "…" : ""})`);
  }
  return { axes, lignes: lignesOut, finitions };
}

function preparer(f, alertes) {
  const L = f.lignes;
  const premier = (col) => {
    for (const r of L) { const v = texte(r[col]); if (v) return v; }
    return null;
  };
  const surDevis = L.some((r) => /^oui$/i.test(String(r[COLONNES.surDevis] ?? "")));

  const borne = (col, fn) => {
    const xs = L.map((r) => entier(r[col])).filter((x) => x != null);
    return xs.length ? fn(...xs) : null;
  };
  const dim = (colMin, colMax) => {
    const min = borne(colMin, Math.min);
    const max = borne(colMax, Math.max) ?? min;
    return [min, max];
  };
  const [largeurMin, largeurMax] = dim(COLONNES.largMin, COLONNES.largMax);
  const [profondeurMin, profondeurMax] = dim(COLONNES.profMin, COLONNES.profMax);
  const [hauteurMin, hauteurMax] = dim(COLONNES.hautMin, COLONNES.hautMax);

  const d = declinaisons(f, alertes);
  const tarifs = d.lignes.map((x) => x.prixTarifHT).filter((x) => x != null && x > 0);
  const unique = d.lignes.length === 1;

  // Catégories : la sous-catégorie 1 est la principale, la 2 un rattachement
  // secondaire (une table d'extérieur rangée aussi chez les sièges).
  const cat = premier(COLONNES.categorie);
  const sc = [premier(COLONNES.sous1), premier(COLONNES.sous2)].filter(Boolean);
  const scToutes = [...new Set(L.flatMap((r) =>
    [texte(r[COLONNES.sous1]), texte(r[COLONNES.sous2])].filter(Boolean)))];

  // La colonne Options cite tantôt une réf. complète, tantôt la seule réf.
  // produit : on garde les deux pour pouvoir résoudre l'une comme l'autre.
  const refsProduit = [...new Set(L.map((r) => texte(r[COLONNES.refProduit])).filter(Boolean))];

  const options = [...new Set(L.flatMap((r) =>
    String(r[COLONNES.options] ?? "").split(",").map((x) => x.trim()).filter(Boolean)))];

  return {
    ...f,
    slug: slug(f.nom),
    nature: premier(COLONNES.nature) || "Produit",
    surDevis,
    categorie: cat,
    sousCategoriePrincipale: sc[0] || null,
    sousCategories: scToutes,
    descriptif: premier(COLONNES.descGenerale),
    sectionsDevis: sections(premier(COLONNES.descTechnique)),
    axes: d.axes,
    declinaisons: d.lignes,
    finitions: d.finitions,
    options,
    refsProduit,
    sansDeclinaisons: unique,
    prixUnitaireTarifHT: unique ? d.lignes[0].prixTarifHT : null,
    referenceUnitaire: unique ? d.lignes[0].referenceFournisseur : null,
    prixAPartir: surDevis && tarifs.length ? Math.min(...tarifs) : null,
    largeurMin, largeurMax, profondeurMin, profondeurMax, hauteurMin, hauteurMax,
  };
}

// ─────────── contrôles avant écriture ───────────

function controler(fiches) {
  const erreurs = [];
  const connues = new Map();
  for (const c of ARCHITECTURE) for (const s of c.sous) connues.set(s, c.nom);
  const cats = new Set(ARCHITECTURE.map((c) => c.nom));

  for (const f of fiches) {
    if (!f.categorie || !cats.has(f.categorie)) {
      erreurs.push(`${f.gamme} / ${f.nom} : catégorie inconnue « ${f.categorie} »`);
    }
    for (const s of f.sousCategories) {
      if (!connues.has(s)) erreurs.push(`${f.gamme} / ${f.nom} : sous-catégorie inconnue « ${s} »`);
    }
    if (!f.sousCategoriePrincipale) {
      erreurs.push(`${f.gamme} / ${f.nom} : pas de sous-catégorie 1`);
    }
    if (!f.declinaisons.length) erreurs.push(`${f.gamme} / ${f.nom} : aucune déclinaison`);
  }

  // Deux fiches d'une même gamme ne peuvent pas porter le même slug.
  const parSlug = new Map();
  for (const f of fiches) {
    const k = `${f.marqueSlug}|${slug(f.gamme)}|${f.slug}`;
    if (parSlug.has(k)) erreurs.push(`slug en double : ${k} (${parSlug.get(k)} et ${f.nom})`);
    else parSlug.set(k, f.nom);
  }

  // Le slug de gamme est unique pour toute la base : un même nom chez deux
  // fournisseurs se départage par la marque.
  const gammesParSlug = new Map();
  for (const f of fiches) {
    const s = slug(f.gamme);
    if (!gammesParSlug.has(s)) gammesParSlug.set(s, new Set());
    gammesParSlug.get(s).add(f.marqueSlug);
  }
  const collisions = [...gammesParSlug].filter(([, m]) => m.size > 1);

  return { erreurs, collisions };
}

// ─────────── écriture ───────────

async function ecrireArchitecture(marqueId) {
  const cats = new Map();      // nom → id
  const sous = new Map();      // nom → { id, categorieId }
  let ordreSous = 0;
  for (const [i, c] of ARCHITECTURE.entries()) {
    const s = slug(c.nom);
    const cat = await prisma.categorie.upsert({
      where: { marqueId_slug: { marqueId, slug: s } },
      update: { nom: c.nom, ordre: i, estOption: !!c.estOption },
      create: { nom: c.nom, slug: s, ordre: i, marqueId, estOption: !!c.estOption },
    });
    cats.set(c.nom, cat.id);
    for (const nomSous of c.sous) {
      const ss = slug(nomSous);
      const id = `sc-${s}-${ss}`.slice(0, 60);
      const rec = await prisma.sousCategorie.upsert({
        where: { categorieId_slug: { categorieId: cat.id, slug: ss } },
        update: { nom: nomSous, ordre: ordreSous },
        create: { id, nom: nomSous, slug: ss, ordre: ordreSous, categorieId: cat.id },
      });
      sous.set(nomSous, { id: rec.id, categorieId: cat.id });
      ordreSous += 1;
    }
  }
  return { cats, sous };
}

async function ecrireGamme(marqueId, nom, marqueSlug, collisions, fichesDeLaGamme) {
  const s = collisions.has(slug(nom)) ? `${slug(nom)}-${marqueSlug}` : slug(nom);
  const surDevis = fichesDeLaGamme.every((f) => f.surDevis);
  return prisma.gamme.upsert({
    where: { slug: s },
    update: { nom, marqueId, publie: true, venteSurDevis: surDevis },
    create: { nom, slug: s, marqueId, publie: true, venteSurDevis: surDevis },
  });
}

async function ecrireFiche(f, gammeId, arch) {
  const catId = arch.cats.get(f.categorie);
  const scPrincipale = arch.sous.get(f.sousCategoriePrincipale);
  const scIds = f.sousCategories.map((n) => arch.sous.get(n)?.id).filter(Boolean);
  // Une fiche rangée dans une sous-catégorie d'une autre catégorie doit
  // apparaître dans les deux : on relie toutes les catégories concernées.
  const catIds = [...new Set([catId,
    ...f.sousCategories.map((n) => arch.sous.get(n)?.categorieId)].filter(Boolean))];

  const donnees = {
    nom: f.nom,
    descriptif: f.descriptif,
    publie: true,
    venteSurDevis: f.surDevis,
    sansDeclinaisons: f.sansDeclinaisons,
    prixUnitaireTarifHT: f.prixUnitaireTarifHT,
    referenceUnitaire: f.referenceUnitaire,
    prixAPartir: f.prixAPartir,
    largeurMin: f.largeurMin, largeurMax: f.largeurMax,
    profondeurMin: f.profondeurMin, profondeurMax: f.profondeurMax,
    hauteurMin: f.hauteurMin, hauteurMax: f.hauteurMax,
    axesDeclinaisons: f.axes,
    declinaisons: f.declinaisons,
    sectionsDevis: f.sectionsDevis,
    categoriePrincipaleId: catId ?? null,
    sousCategoriePrincipaleId: scPrincipale?.id ?? null,
  };

  const vitrine = await prisma.produitVitrine.upsert({
    where: { gammeId_slug: { gammeId, slug: f.slug } },
    update: {
      ...donnees,
      categories: { set: catIds.map((id) => ({ id })) },
      sousCategories: { set: scIds.map((id) => ({ id })) },
    },
    create: {
      ...donnees,
      slug: f.slug,
      gammeId,
      categories: { connect: catIds.map((id) => ({ id })) },
      sousCategories: { connect: scIds.map((id) => ({ id })) },
    },
  });

  // Les groupes de finition n'ont pas de clé naturelle : on les refait.
  await prisma.groupeFinition.deleteMany({ where: { vitrineId: vitrine.id } });
  if (f.finitions.length) {
    await prisma.groupeFinition.create({
      data: {
        nom: "Finitions",
        ordre: 0,
        vitrineId: vitrine.id,
        finitions: { create: f.finitions.map((nom, i) => ({ nom, ordre: i })) },
      },
    });
  }
  return vitrine.id;
}

// ─────────── déroulé ───────────

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — le catalogue est écrit ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  if (FILTRE_MARQUE && !Object.values(MARQUES).includes(FILTRE_MARQUE)) {
    throw new Error(`--marque=${FILTRE_MARQUE} inconnue. Au choix : `
      + Object.values(MARQUES).join(", "));
  }

  const { fiches: brutes, lignes } = lireClasseur();
  const alertes = [];
  const fiches = brutes.map((f) => preparer(f, alertes));
  const controle = controler(fiches);
  const { erreurs } = controle;

  // Les collisions de slug de gamme se cherchent sur le classeur ENTIER : le
  // slug est unique pour toute la base. « Galet » existe chez Buronomic et
  // chez OfficePro ; en n'important qu'OfficePro, on ne verrait pas le
  // conflit et l'upsert sur le slug « galet » changerait la marque de la
  // gamme Buronomic au lieu d'en créer une seconde.
  const { collisions } = PARTIEL
    ? controler(lireClasseur(true).fiches.map((f) => preparer(f, [])))
    : controle;

  const parMarque = new Map();
  for (const f of fiches) {
    if (!parMarque.has(f.marqueSlug)) parMarque.set(f.marqueSlug, []);
    parMarque.get(f.marqueSlug).push(f);
  }

  console.log("── CE QUE LE CLASSEUR CONTIENT ──\n");
  console.log(`   ${lignes} lignes lues`);
  for (const [m, fs] of parMarque) {
    const gammes = new Set(fs.map((x) => x.gamme));
    const decl = fs.reduce((n, x) => n + x.declinaisons.length, 0);
    console.log(`   ${m.padEnd(12)} ${String(gammes.size).padStart(3)} gammes  `
      + `${String(fs.length).padStart(4)} fiches  ${String(decl).padStart(6)} déclinaisons`);
  }
  const total = fiches.reduce((n, x) => n + x.declinaisons.length, 0);
  console.log(`   ${"TOTAL".padEnd(12)} ${String(new Set(fiches.map((f) => f.gamme)).size).padStart(3)} gammes  `
    + `${String(fiches.length).padStart(4)} fiches  ${String(total).padStart(6)} déclinaisons`);
  const natures = {};
  for (const f of fiches) natures[f.nature] = (natures[f.nature] || 0) + 1;
  console.log(`   natures : ${Object.entries(natures).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  console.log(`   ${ARCHITECTURE.length} catégories · `
    + `${ARCHITECTURE.reduce((n, c) => n + c.sous.length, 0)} sous-catégories`);

  if (collisions.length) {
    console.log("\n── NOMS DE GAMME PARTAGÉS ENTRE FOURNISSEURS ──\n");
    for (const [s, m] of collisions) console.log(`   ${s} : ${[...m].join(", ")} → slug suffixé`);
  }

  if (alertes.length) {
    console.log(`\n── ${alertes.length} AVERTISSEMENT(S) ──\n`);
    for (const a of alertes.slice(0, 15)) console.log(`   ${a}`);
    if (alertes.length > 15) console.log(`   … et ${alertes.length - 15} autre(s)`);
  }

  if (erreurs.length) {
    console.log(`\n── ${erreurs.length} ERREUR(S) — RIEN NE SERA ÉCRIT ──\n`);
    for (const e of erreurs.slice(0, 30)) console.log(`   ${e}`);
    if (erreurs.length > 30) console.log(`   … et ${erreurs.length - 30} autre(s)`);
    process.exitCode = 1;
    return;
  }
  console.log("\n   contrôles : catégories, sous-catégories, slugs, déclinaisons → tout passe");

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  const marques = new Map();
  for (const m of await prisma.marque.findMany()) marques.set(m.slug, m);
  for (const s of new Set(fiches.map((f) => f.marqueSlug))) {
    if (!marques.has(s)) throw new Error(`Marque absente de la base : ${s}`);
  }

  const parRefComplete = new Map();   // réf. complète → id de fiche

  if (OPTIONS_SEULES) {
    console.log("\n── ARCHITECTURE ET FICHES : INCHANGÉES ──\n");
    console.log("   --options-seules : on ne réécrit rien, on refait les liens");
  } else {

    console.log("\n── ARCHITECTURE ──\n");
    const arch = await ecrireArchitecture(marques.get(PORTEUSE).id);
    console.log(`   ${arch.cats.size} catégories · ${arch.sous.size} sous-catégories `
      + `(portées par ${PORTEUSE})`);

    console.log("\n── GAMMES ET FICHES ──\n");
    const collisionsSet = new Set(collisions.map(([s]) => s));
    let nFiches = 0;
    for (const [marqueSlug, fs] of parMarque) {
      const marqueId = marques.get(marqueSlug).id;
      const parGamme = new Map();
      for (const f of fs) {
        if (!parGamme.has(f.gamme)) parGamme.set(f.gamme, []);
        parGamme.get(f.gamme).push(f);
      }
      for (const [nomGamme, liste] of parGamme) {
        const gamme = await ecrireGamme(marqueId, nomGamme, marqueSlug, collisionsSet, liste);
        for (const f of liste) {
          const id = await ecrireFiche(f, gamme.id, arch);
          f.id = id;
          for (const d of f.declinaisons) {
            if (d.referenceFournisseur && !parRefComplete.has(d.referenceFournisseur)) {
              parRefComplete.set(d.referenceFournisseur, id);
            }
          }
          nFiches += 1;
          if (nFiches % 25 === 0) process.stdout.write(`\r   ${nFiches} / ${fiches.length} fiches`);
        }
      }
      console.log(`\r   ${marqueSlug.padEnd(12)} ${parGamme.size} gammes, ${fs.length} fiches écrites`);
    }

  }

  console.log("\n── OPTIONS RATTACHÉES ──\n");
  // Cette étape reprend TOUT le catalogue à chaque passage, pas seulement le
  // fournisseur du jour. Une option citée par une fiche Buronomic peut vivre
  // chez OfficePro, et une fiche importée avant les autres n'aurait trouvé
  // personne à qui se lier. On relit donc la base entière : identifiants des
  // fiches, et références portées par leurs déclinaisons.
  const enBaseVitrines = await prisma.produitVitrine.findMany({
    select: { id: true, slug: true, declinaisons: true,
      gamme: { select: { nom: true, marque: { select: { slug: true } } } } },
  });
  const idParFiche = new Map();   // « marque|gamme|slug » → id
  for (const v of enBaseVitrines) {
    idParFiche.set(`${v.gamme.marque.slug}|${v.gamme.nom}|${v.slug}`, v.id);
    for (const d of Array.isArray(v.declinaisons) ? v.declinaisons : []) {
      if (d?.referenceFournisseur && !parRefComplete.has(d.referenceFournisseur)) {
        parRefComplete.set(d.referenceFournisseur, v.id);
      }
    }
  }

  const toutes = PARTIEL
    ? lireClasseur(true).fiches.map((f) => preparer(f, []))
    : fiches;
  // Second index : la réf. produit. Cent trente-deux des cent soixante et onze
  // options du classeur sont citées par leur seule racine — DN01, ED72 — et
  // non par une réf. complète. Deux racines désignent deux fiches à la fois
  // (la tablette Alto, présente dans deux gammes) : la première l'emporte,
  // et on le dit.
  const parRefProduit = new Map();
  const racinesAmbigues = new Set();
  for (const f of toutes) {
    const idFiche = f.id || idParFiche.get(`${f.marqueSlug}|${f.gamme}|${f.slug}`);
    if (!idFiche) continue;
    for (const ref of f.refsProduit) {
      if (parRefProduit.has(ref) && parRefProduit.get(ref) !== idFiche) racinesAmbigues.add(ref);
      else if (!parRefProduit.has(ref)) parRefProduit.set(ref, idFiche);
    }
  }

  let liees = 0;
  let traitees = 0;
  const parRacine = new Set();
  // Une racine portée par deux fiches n'est un problème que si une option la
  // cite : les autres ne sont jamais consultées.
  const citeesAmbigues = new Set();
  const introuvables = new Set();
  const absentes = [];
  for (const f of toutes) {
    if (!f.options.length) continue;
    const idFiche = f.id || idParFiche.get(`${f.marqueSlug}|${f.gamme}|${f.slug}`);
    if (!idFiche) { absentes.push(`${f.gamme} / ${f.nom}`); continue; }
    const ids = new Set();
    for (const ref of f.options) {
      let id = parRefComplete.get(ref);
      if (!id && (id = parRefProduit.get(ref))) {
        parRacine.add(ref);
        if (racinesAmbigues.has(ref)) citeesAmbigues.add(ref);
      }
      if (!id) introuvables.add(ref);
      else if (id !== idFiche) ids.add(id);
    }
    await prisma.produitVitrine.update({
      where: { id: idFiche },
      data: { optionsLiees: { set: [...ids].map((id) => ({ id })) } },
    });
    liees += ids.size;
    traitees += 1;
  }
  console.log(`   ${traitees} fiches portent des options`);
  console.log(`   ${liees} liens créés`);
  console.log(`   ${parRacine.size} référence(s) d'option résolue(s) par la réf. produit, `
    + "faute de réf. complète");
  if (citeesAmbigues.size) {
    console.log(`   ⚠ ${citeesAmbigues.size} racine(s) citée(s) en option et portée(s) par `
      + `deux fiches, la première l'emporte : ${[...citeesAmbigues].join(", ")}`);
  }
  if (absentes.length) {
    console.log(`   ${absentes.length} fiche(s) à options pas encore en base, `
      + "elles seront reliées au prochain passage");
  }
  if (introuvables.size) {
    console.log(`   ⚠ ${introuvables.size} référence(s) d'option introuvable(s) dans le catalogue :`);
    for (const r of [...introuvables].slice(0, 10)) console.log(`      ${r}`);
  }

  console.log("\n── CONTRÔLE APRÈS IMPORT ──\n");
  const enBase = {
    catégories: await prisma.categorie.count(),
    "sous-catégories": await prisma.sousCategorie.count(),
    gammes: await prisma.gamme.count(),
    fiches: await prisma.produitVitrine.count(),
    "groupes de finition": await prisma.groupeFinition.count(),
    finitions: await prisma.finition.count(),
  };
  for (const [k, v] of Object.entries(enBase)) console.log(`   ${k.padEnd(22)} ${String(v).padStart(6)}`);

  const vitrines = await prisma.produitVitrine.findMany({ select: { declinaisons: true } });
  const decl = vitrines.reduce(
    (n, v) => n + (Array.isArray(v.declinaisons) ? v.declinaisons.length : 0), 0);
  console.log(`   ${"déclinaisons".padEnd(22)} ${String(decl).padStart(6)}`);
  // On réconcilie contre le classeur ENTIER : c'est ce qui rend un import
  // découpé vérifiable, en disant combien il reste à écrire.
  const ref = PARTIEL ? lireClasseur(true) : { fiches, lignes };
  const attenduFiches = ref.fiches.length;
  const attenduDecl = ref.lignes;   // une ligne du classeur = une déclinaison
  console.log(`\n   attendu, classeur entier : ${attenduFiches} fiches, ${attenduDecl} déclinaisons`);
  if (PARTIEL) {
    console.log(`   écrit à ce passage       : ${fiches.length} fiches, ${total} déclinaisons`);
  }
  const ok = enBase.fiches === attenduFiches && decl === attenduDecl;
  if (ok) {
    console.log("   ✓ réconciliation exacte : aucune ligne perdue, aucun doublon");
  } else if (enBase.fiches < attenduFiches || decl < attenduDecl) {
    console.log(`   reste à écrire : ${attenduFiches - enBase.fiches} fiches, `
      + `${attenduDecl - decl} déclinaisons`);
  } else {
    console.log("   ⚠ la base contient PLUS que le classeur : doublon à chercher");
  }
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
