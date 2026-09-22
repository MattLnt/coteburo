// Reconstruit la gamme Adela depuis le tarif : un bloc du tarif = un produit.
//
//   node prisma/reimporter-adela.mjs
//   node prisma/reimporter-adela.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Les vingt-quatre fiches d'origine avaient le bon découpage — quatre pages
//   de six colonnes — et je les avais regroupées en quatre, ce qui était une
//   erreur de lecture : un client ouvre une catégorie et parcourt une liste,
//   il ne cherche pas une gamme. On reprend les vingt-quatre produits, avec
//   des prix relus par coordonnées sur les pages 102 à 105.
//
// LA GRAMMAIRE DES RÉFÉRENCES
//   AL + lettre + chiffre + / + base
//
//     A  quatre pieds        E  traineau     G  tabouret     J  giratoire
//     B  quatre pieds,       F  traineau,    H  tabouret,    K  giratoire,
//        assise tapissée        assise t.       assise t.       assise t.
//     0  chaise (sans accotoirs)    1  fauteuil (avec accotoirs)
//     /4 piétement fixe             /5 base giratoire
//     N  version entièrement tapissée
//
//   Le piétement est toujours chromé : le tarif n'écrit qu'une ligne
//   « Chromé » par bloc, il n'y a donc pas de choix de finition.
//
// LE COLORIS, ET QUAND IL DISPARAÎT
//   Quatre coloris de polypropylène — noir, blanc, gris, bordeaux — que le
//   tarif marque « + coloris* à préciser à la commande ». Ils ne figurent
//   jamais dans la référence : c'est une finition sans jeton.
//
//   Page 102 (assise ET dos tapissés) ne porte pas ce marqueur : la coque y
//   est entièrement recouverte. La question n'y est donc pas posée — la même
//   règle que chez Loria.
//
// DEUX DÉFAUTS DU TARIF, REPORTÉS SANS ÊTRE CORRIGÉS
//   1. Les pages 103 et 104 impriment la MÊME référence — ALB0/4 — pour la
//      version dos résille (216 €) et la version dos polypropylène (177 €).
//      Nos fiches étant distinctes, chacune garde son prix.
//   2. Page 102, « ALJO/5N » porte un O à la place du zéro ; page 105 écrit
//      bien « ALJ0/5 ». On garde la référence telle qu'imprimée : réécrire le
//      tarif d'un fournisseur ne nous appartient pas.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = "Adela";
const CATALOGUE = "catalogue-2026/SOKOA_TARIF 2026_FR.pdf";
const PAGES = [102, 103, 104, 105];

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const TISSU = ["Tissu B", "Tissu B+", "Tissu C", "Tissu D"];

// Page 105 : « noir (1), blanc (2), gris (3) et bordeaux (8) ». Nuancier p.205.
const COLORIS = [
  { libelle: "Noir", couleur: "#0d0d0d" },
  { libelle: "Blanc", couleur: "#f4f4f0" },
  { libelle: "Gris", couleur: "#575d5e" },
  { libelle: "Bordeaux", couleur: "#7b2233" },
];

// ── Les vingt-quatre blocs ────────────────────────────────────────────
//
// `coloris: false` sur la page 102 seulement : la coque y est entièrement
// recouverte, le tarif n'y propose aucun coloris.
const BLOCS = [
  // ── page 105, tout polypropylène
  { nom: "Chaise 4 pieds, assise et dos PP", ref: "ALA0/4", prix: 151, page: 105 },
  { nom: "Fauteuil 4 pieds, assise, dos et accotoirs PP", ref: "ALA1/4", prix: 190, page: 105 },
  { nom: "Chaise pieds traineau, assise et dos PP", ref: "ALE0/4", prix: 161, page: 105 },
  { nom: "Fauteuil pieds traineau, assise, dos et accotoirs PP", ref: "ALE1/4", prix: 200, page: 105 },
  { nom: "Tabouret pieds traineau, assise et dos PP", ref: "ALG0/4", prix: 275, page: 105 },
  {
    nom: "Siège giratoire, assise, dos et accotoirs PP, base alu poli, roulettes ø50",
    page: 105,
    accotoirs: { "Sans accotoirs": { ref: "ALJ0/5", prix: 229 }, "Avec accotoirs": { ref: "ALJ1/5", prix: 271 } },
  },

  // ── page 102, assise ET dos tapissés — pas de coloris, coque recouverte
  { nom: "Chaise 4 pieds, assise et dos tapissés", ref: "ALA0/4N", prix: [255, 259, 263, 267], page: 102, coloris: false },
  { nom: "Fauteuil 4 pieds, assise et dos tapissés, accotoirs PP", ref: "ALA1/4N", prix: [294, 298, 302, 306], page: 102, coloris: false },
  { nom: "Chaise pieds traineau, assise et dos tapissés", ref: "ALE0/4N", prix: [265, 269, 273, 277], page: 102, coloris: false },
  { nom: "Fauteuil pieds traineau, assise et dos tapissés, accotoirs PP", ref: "ALE1/4N", prix: [304, 308, 312, 316], page: 102, coloris: false },
  { nom: "Tabouret pieds traineau, assise et dos tapissés", ref: "ALG0/4N", prix: [383, 388, 394, 400], page: 102, coloris: false },
  {
    nom: "Siège giratoire, assise et dos tapissés, accotoirs PP, base alu poli, roulettes ø50",
    page: 102, coloris: false,
    // ALJO/5N : le O du tarif, conservé tel quel.
    accotoirs: {
      "Sans accotoirs": { ref: "ALJO/5N", prix: [331, 337, 343, 349] },
      "Avec accotoirs": { ref: "ALJ1/5N", prix: [373, 379, 385, 391] },
    },
  },

  // ── page 104, assise tapissée, dos polypropylène
  { nom: "Chaise 4 pieds, assise tapissée et dos PP", ref: "ALB0/4", prix: [177, 180, 184, 187], page: 104 },
  { nom: "Fauteuil 4 pieds, assise tapissée, dos et accotoirs PP", ref: "ALB1/4", prix: [216, 219, 223, 226], page: 104 },
  { nom: "Chaise pieds traineau, assise tapissée et dos PP", ref: "ALF0/4", prix: [187, 190, 194, 197], page: 104 },
  { nom: "Fauteuil pieds traineau, assise tapissée, dos et accotoirs PP", ref: "ALF1/4", prix: [226, 229, 233, 236], page: 104 },
  { nom: "Tabouret pieds traineau, assise tapissée et dos PP", ref: "ALH0/4", prix: [304, 309, 314, 319], page: 104 },
  {
    nom: "Siège giratoire, assise tapissée, dos et accotoirs PP, base alu poli, roulettes ø50",
    page: 104,
    accotoirs: {
      "Sans accotoirs": { ref: "ALK0/5", prix: [255, 260, 266, 272] },
      "Avec accotoirs": { ref: "ALK1/5", prix: [297, 302, 308, 314] },
    },
  },

  // ── page 103, assise tapissée, dos résille
  { nom: "Chaise 4 pieds, assise tapissée et dos résille", ref: "ALB0/4", prix: [216, 219, 223, 226], page: 103 },
  { nom: "Fauteuil 4 pieds, assise tapissée, dos résille, accotoirs PP noirs", ref: "ALB1/4", prix: [255, 258, 262, 265], page: 103 },
  { nom: "Chaise pieds traineau, assise tapissée et dos résille", ref: "ALF0/4", prix: [226, 229, 233, 236], page: 103 },
  { nom: "Fauteuil pieds traineau, assise tapissée et dos résille, accotoirs PP noirs", ref: "ALF1/4", prix: [265, 268, 272, 275], page: 103 },
  { nom: "Tabouret pieds traineau, assise tapissée et dos résille", ref: "ALH0/4", prix: [332, 337, 342, 347], page: 103 },
  {
    nom: "Siège giratoire, assise tapissée et dos résille, accotoirs PP, base alu poli, roulettes ø50",
    page: 103,
    accotoirs: {
      "Sans accotoirs": { ref: "ALK0/5", prix: [292, 297, 303, 309] },
      "Avec accotoirs": { ref: "ALK1/5", prix: [334, 339, 345, 351] },
    },
  },
];

const PIETEMENT = (nom) => (/giratoire/.test(nom) ? "Base giratoire aluminium poli, roulettes ø 50 mm"
  : /traineau/.test(nom) ? "Piétement traineau métal, finition chromée"
    : "Quatre pieds métal, finition chromée");

const AVERTISSEMENT = "<p><strong>Attention à la commande.</strong> Le catalogue Sokoa imprime la même référence pour la version à dossier résille et celle à dossier polypropylène, à deux prix différents. La version doit être précisée en clair sur la commande.</p>";

/** Les vingt-quatre fiches, avec leurs lignes de tarif. */
function construireFiches() {
  return BLOCS.map((b) => {
    const lignes = b.accotoirs
      ? Object.entries(b.accotoirs).map(([libelle, v]) => ({
        ref: v.ref, prix: v.prix, page: b.page, valeurs: { accotoirs: libelle },
      }))
      : [{ ref: b.ref, prix: b.prix, page: b.page, valeurs: {} }];
    return {
      nom: `${b.nom} - Adela`,
      page: b.page,
      coloris: b.coloris !== false,
      lignes,
    };
  });
}

// ── Le filet : chaque prix cité doit apparaître sur sa page ────────────
async function verifierContrePdf(fiches) {
  console.log("Relecture du PDF pour vérifier chaque prix cité...");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(readFileSync(CATALOGUE)), useSystemFonts: true }).promise;
  const texteParPage = new Map();
  for (const p of PAGES) {
    const t = await (await doc.getPage(p)).getTextContent();
    texteParPage.set(p, t.items.map((i) => i.str).join(" "));
  }
  const manques = [];
  const vus = new Set();
  for (const f of fiches) {
    for (const l of f.lignes) {
      for (const p of (Array.isArray(l.prix) ? l.prix : [l.prix])) vus.add(`${l.page}|${p}`);
    }
  }
  for (const cle of vus) {
    const [page, nombre] = cle.split("|");
    const texte = texteParPage.get(Number(page)) || "";
    const n = texte.split(new RegExp(`(?<![\\d.,])${nombre}(?![\\d.,])`)).length - 1;
    if (n === 0) manques.push(`page ${page} : « ${nombre} » introuvable`);
  }
  return manques;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const fiches = construireFiches();

  const manques = await verifierContrePdf(fiches);
  if (manques.length) {
    titre("VÉRIFICATION ÉCHOUÉE — RIEN NE SERA ÉCRIT");
    console.log("");
    for (const m of manques.slice(0, 20)) console.log(`   ${m}`);
    process.exitCode = 1;
    return;
  }
  console.log("   ✓ chaque prix cité a été retrouvé sur sa page.\n");

  const gamme = await prisma.gamme.findFirst({
    where: { nom: GAMME },
    select: {
      id: true,
      vitrines: {
        orderBy: { nom: "asc" },
        select: { id: true, nom: true, visuels: { select: { id: true, url: true } } },
      },
    },
  });
  if (!gamme) { console.error(`Gamme ${GAMME} introuvable.`); process.exitCode = 1; return; }

  // ── Les combinaisons ────────────────────────────────────────────────
  let total = 0;
  const collisions = [];
  for (const f of fiches) {
    f.combinaisons = [];
    const vues = new Map();
    for (const l of f.lignes) {
      const prixListe = Array.isArray(l.prix) ? l.prix : [l.prix];
      const tissus = prixListe.length === 4 ? TISSU : [null];
      prixListe.forEach((prix, i) => {
        const v = tissus[i] ? { ...l.valeurs, tissu: tissus[i] } : { ...l.valeurs };
        const empreinte = empreinteDe(v);
        if (vues.has(empreinte)) {
          collisions.push({ fiche: f.nom, a: vues.get(empreinte), b: `${l.ref} (${prix} €)` });
          return;
        }
        vues.set(empreinte, `${l.ref} (${prix} €)`);
        f.combinaisons.push({ valeurs: v, empreinte, prixTarifHT: prix, referenceBase: l.ref, pageCatalogue: l.page });
      });
    }
    total += f.combinaisons.length;
  }

  // ── Où retourne chaque visuel ───────────────────────────────────────
  //
  // Les vingt-quatre noms sont ceux des fiches d'origine : l'adresse
  // Cloudinary d'un visuel contient le dossier de sa fiche d'alors, et il
  // suffit de comparer les débuts de slug pour le rendre à son produit.
  const parSlug = new Map(fiches.map((f) => [slug(f.nom), f]));
  for (const f of fiches) f.visuelsAPoser = [];
  const orphelins = [];
  for (const v of gamme.vitrines) {
    for (const img of v.visuels) {
      const dossier = (img.url.split("/").slice(-2, -1)[0] || "").toLowerCase();
      const trouve = [...parSlug.entries()]
        .find(([s]) => s.startsWith(dossier.slice(0, 34)) || dossier.startsWith(s.slice(0, 34)));
      if (trouve) trouve[1].visuelsAPoser.push(img);
      else orphelins.push(img.url);
    }
  }

  titre("LES VINGT-QUATRE PRODUITS DU TARIF");
  for (const p of [105, 104, 103, 102]) {
    console.log(`\n   ── page ${p}`);
    for (const f of fiches.filter((x) => x.page === p)) {
      const prix = f.combinaisons.map((c) => c.prixTarifHT);
      const t = Math.min(...prix) === Math.max(...prix)
        ? `${Math.min(...prix)} €` : `${Math.min(...prix)} à ${Math.max(...prix)} €`;
      console.log(`      ${f.nom.replace(" - Adela", "").slice(0, 56).padEnd(58)} ${String(f.combinaisons.length).padStart(2)} var. · ${t.padStart(12)}${f.visuelsAPoser.length ? ` · ${f.visuelsAPoser.length} img` : ""}`);
    }
  }

  if (collisions.length) {
    titre("DEUX PRIX POUR UNE MÊME CONFIGURATION — RIEN NE SERA ÉCRIT");
    for (const c of collisions.slice(0, 12)) console.log(`   ${c.fiche} : ${c.a} ≠ ${c.b}`);
    process.exitCode = 1;
    return;
  }

  if (orphelins.length) {
    titre("VISUELS QU'ON NE SAIT PAS ROUTER");
    console.log("");
    for (const u of orphelins) console.log(`   ${u.split("/").slice(-2).join("/")}`);
  }

  titre("LE COMPTE");
  const routes = fiches.reduce((n, f) => n + f.visuelsAPoser.length, 0);
  console.log(`   ${fiches.length} fiches · ${total} variantes · ${routes} visuels routés`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  const reprises = new Set();
  for (const f of fiches) {
    const existante = gamme.vitrines.find((v) => v.nom === f.nom);
    const resille = /résille/.test(f.nom) || /dos PP/.test(f.nom);
    const sections = [
      { titre: "Piétement", contenu: `<p>${PIETEMENT(f.nom)}</p>` },
      ...(f.coloris ? [{
        titre: "Finitions",
        contenu: "<p>Quatre coloris de polypropylène : noir, blanc, gris et bordeaux. Coques et accotoirs assortis au coloris choisi. Nuancier page 205 du catalogue Sokoa.</p><p>Le coloris est à préciser à la commande : le tarif ne lui donne pas de code de référence.</p>",
      }] : []),
      { titre: "Empilabilité", contenu: "<p>Empilable grande hauteur.</p>" },
      ...(resille ? [{ titre: "Bon à savoir", contenu: AVERTISSEMENT }] : []),
    ];
    const descriptif = `<p>${f.nom.replace(" - Adela", "")}, de la gamme Adela. Piétement chromé, coque en polypropylène.</p>`;

    let id;
    if (existante) {
      id = existante.id;
      await prisma.choix.deleteMany({ where: { vitrineId: id } });
      await prisma.combinaison.deleteMany({ where: { vitrineId: id } });
      await prisma.produitVitrine.update({
        where: { id },
        data: { nom: f.nom, slug: slug(f.nom), publie: true, descriptif, sectionsDevis: sections },
      });
    } else {
      const neuve = await prisma.produitVitrine.create({
        data: { nom: f.nom, slug: slug(f.nom), publie: true, gammeId: gamme.id, descriptif, sectionsDevis: sections },
      });
      id = neuve.id;
    }
    reprises.add(id);

    let ordre = 0;
    const ajouter = async (cle, nom, ordonne, nature) => {
      const vues = [...new Set(f.combinaisons.map((c) => c.valeurs[cle]).filter(Boolean))];
      if (vues.length < 2) return;
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle, nom, nature, rendu: "boutons", ordre, origine: "editorial",
          valeurs: { create: ordonne.filter((x) => vues.includes(x)).map((libelle, i) => ({ libelle, ordre: i })) },
        },
      });
    };
    await ajouter("accotoirs", "Accotoirs", ["Sans accotoirs", "Avec accotoirs"], "tarifaire");
    await ajouter("tissu", "Tissu", TISSU, "tarifaire");

    if (f.coloris) {
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle: "coloris", nom: "Coloris polypropylène",
          nature: "finition", rendu: "pastilles", ordre, origine: "tarif",
          valeurs: { create: COLORIS.map((c, i) => ({ libelle: c.libelle, couleur: c.couleur, ordre: i, suffixeReference: "" })) },
        },
      });
    }

    await prisma.combinaison.createMany({ data: f.combinaisons.map((c) => ({ ...c, vitrineId: id })) });

    for (const [i, img] of f.visuelsAPoser.entries()) {
      await prisma.visuel.update({ where: { id: img.id }, data: { vitrineId: id, ordre: i } });
    }
  }
  console.log(`   ${fiches.length} fiches écrites.`);

  const autres = gamme.vitrines.filter((v) => !reprises.has(v.id));
  if (autres.length) {
    await prisma.produitVitrine.updateMany({
      where: { id: { in: autres.map((v) => v.id) } },
      data: { publie: false, accessoireSeul: true },
    });
    console.log(`   ${autres.length} anciennes fiches dépubliées (conservées, non détruites).`);
  }

  titre("CONTRÔLE");
  const pub = await prisma.produitVitrine.count({ where: { gamme: { nom: GAMME }, publie: true } });
  const comb = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true } } });
  const sansPrix = await prisma.combinaison.count({ where: { vitrine: { gamme: { nom: GAMME }, publie: true }, prixTarifHT: null } });
  const sansImg = await prisma.produitVitrine.count({ where: { gamme: { nom: GAMME }, publie: true, visuels: { none: {} } } });
  console.log(`   fiches publiées : ${pub} · variantes : ${comb} · sans prix : ${sansPrix} · sans visuel : ${sansImg}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
