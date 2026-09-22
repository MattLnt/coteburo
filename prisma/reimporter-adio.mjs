// Reconstruit la gamme Adio depuis le tarif : un bloc du tarif = un produit.
//
//   node prisma/reimporter-adio.mjs
//   node prisma/reimporter-adio.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Les vingt fiches d'origine avaient le bon découpage — c'est le catalogue
//   qui le donne, quatre pages de cinq colonnes — mais des questions
//   inutilisables : une question « Modèle » à quatre-vingt-seize valeurs, qui
//   étaient des noms de fiche suivis d'une référence. Un regroupement
//   précédent a réduit ces vingt fiches à trois, ce qui était une erreur de
//   lecture de ma part : un client ouvre une catégorie et parcourt une liste,
//   il ne cherche pas une gamme.
//
//   On reprend donc les vingt produits du tarif, avec de vraies questions.
//
// LA GRAMMAIRE DES RÉFÉRENCES, LUE PAGE PAR PAGE (68 à 71)
//   AO + lettre + chiffre + / + accord de coloris
//
//     A  quatre pieds        E  luge        J  giratoire
//     B  quatre pieds,       F  luge,       K  giratoire,
//        assise tapissée        assise t.      assise tapissée
//     0  chaise (sans accotoirs)    1  fauteuil (avec accotoirs)
//
//   Et l'alphabet du suffixe dit le garnissage du dos :
//     chiffres (11, G2, V5, L4, T7)  → dos polypropylène   pages 68 et 69
//     lettres  (1N, GB, VV, LL, TT)  → dos tapissé/résille pages 70 et 71
//
//   Les cinq accords sont nommés par le tarif lui-même, page 68 :
//   « Noir / Noir (1), Gris / Blanc (2), Vert foncé / clair (5),
//     Bleu foncé / clair (4) et Taupe foncé / clair (7) ».
//   Lus dans l'ordre d'apparition plutôt que par leur code, deux d'entre eux
//   seraient inversés — d'où la lecture par coordonnées.
//
// CE QUI EST UNE FINITION ET CE QUI N'EN EST PAS
//   L'accord de coloris déplace la référence mais jamais le prix : c'est une
//   finition. Le tissu déplace le prix : c'est un choix tarifaire. Sur le
//   giratoire, les accotoirs et la couleur de base déplacent les deux.
//
// UN DÉFAUT DU TARIF, REPORTÉ SANS ÊTRE CORRIGÉ
//   Le giratoire porte les mêmes références sur deux pages : AOJ0/1 vaut
//   248 € page 68 (tout polypropylène) et 296 € page 70 (tout tapissé). Nos
//   fiches étant distinctes, chacune garde son prix ; c'est à la commande
//   qu'il faut préciser la version.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = "Adio";
const CATALOGUE = "catalogue-2026/SOKOA_TARIF 2026_FR.pdf";
const PAGES = [68, 69, 70, 71];

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const TISSU = ["Tissu B", "Tissu B+", "Tissu C", "Tissu D"];

// Les cinq accords, avec leur code dans chacun des deux alphabets.
const ACCORDS = [
  { libelle: "Noir / Noir", pp: "11", tap: "1N", couleur: "#141414" },
  { libelle: "Gris / Blanc", pp: "G2", tap: "GB", couleur: "#9a9a99" },
  { libelle: "Vert foncé / clair", pp: "V5", tap: "VV", couleur: "#3f5c3f" },
  { libelle: "Bleu foncé / clair", pp: "L4", tap: "LL", couleur: "#2f4a63" },
  { libelle: "Taupe foncé / clair", pp: "T7", tap: "TT", couleur: "#8a7d6b" },
];

const BASES = [
  { libelle: "Base et roulettes noires", code: "1" },
  { libelle: "Base et roulettes blanches", code: "7" },
];

// ── Les vingt blocs du tarif ──────────────────────────────────────────
//
// `racine` + l'accord donne la référence ; `alpha` dit quel alphabet de
// codes s'applique. Un prix seul = pas de tissu ; quatre prix = B, B+, C, D.
const PIEDS = [
  // page 68 — tout polypropylène
  { nom: "Chaise 4 pieds, assise et dos PP", racine: "AOA0", alpha: "pp", prix: 143, page: 68 },
  { nom: "Fauteuil 4 pieds, assise et dos PP", racine: "AOA1", alpha: "pp", prix: 170, page: 68 },
  { nom: "Chaise luge, assise et dos PP", racine: "AOE0", alpha: "pp", prix: 177, page: 68 },
  { nom: "Fauteuil luge, assise et dos PP", racine: "AOE1", alpha: "pp", prix: 204, page: 68 },
  // page 69 — assise tapissée, dos polypropylène
  { nom: "Chaise 4 pieds, assise tapissée, dos PP", racine: "AOB0", alpha: "pp", prix: [162, 165, 169, 183], page: 69 },
  { nom: "Fauteuil 4 pieds, assise tapissée, dos PP", racine: "AOB1", alpha: "pp", prix: [189, 192, 196, 210], page: 69 },
  { nom: "Chaise luge, assise tapissée, dos PP", racine: "AOF0", alpha: "pp", prix: [196, 199, 203, 217], page: 69 },
  { nom: "Fauteuil luge, assise tapissée, dos PP", racine: "AOF1", alpha: "pp", prix: [223, 226, 230, 244], page: 69 },
  // page 70 — assise et dossier tapissés
  { nom: "Chaise 4 pieds, assise et dossier tapissés", racine: "AOA0", alpha: "tap", prix: [191, 195, 200, 224], page: 70 },
  { nom: "Fauteuil 4 pieds, assise et dossier tapissés", racine: "AOA1", alpha: "tap", prix: [218, 222, 227, 251], page: 70 },
  { nom: "Chaise luge, assise et dossier tapissés", racine: "AOE0", alpha: "tap", prix: [225, 229, 234, 258], page: 70 },
  { nom: "Fauteuil luge, assise et dossier tapissés", racine: "AOE1", alpha: "tap", prix: [252, 256, 261, 285], page: 70 },
  // page 71 — assise tapissée, dossier résille
  { nom: "Chaise 4 pieds, assise tapissée et dossier résille", racine: "AOB0", alpha: "tap", prix: [197, 200, 204, 218], page: 71 },
  { nom: "Fauteuil 4 pieds, assise tapissée et dossier résille", racine: "AOB1", alpha: "tap", prix: [224, 227, 231, 245], page: 71 },
  { nom: "Chaise luge, assise tapissée et dossier résille", racine: "AOF0", alpha: "tap", prix: [231, 234, 238, 252], page: 71 },
  { nom: "Fauteuil luge, assise tapissée et dossier résille", racine: "AOF1", alpha: "tap", prix: [258, 261, 265, 279], page: 71 },
];

// Les quatre blocs giratoires : accotoirs et couleur de base y sont des
// lignes du tableau, pas des colonnes — donc des choix dans la fiche.
const GIRATOIRES = [
  {
    nom: "Siège giratoire, assise et dos PP", racine: "AOJ", page: 68,
    prix: { "0/1": 248, "0/7": 288, "1/1": 275, "1/7": 315 },
  },
  {
    nom: "Siège giratoire, assise tapissée, dos PP", racine: "AOK", page: 69,
    prix: {
      "0/1": [268, 271, 275, 289], "0/7": [308, 311, 315, 329],
      "1/1": [295, 298, 302, 316], "1/7": [335, 338, 342, 356],
    },
  },
  {
    nom: "Siège giratoire, assise et dossier tapissés", racine: "AOJ", page: 70,
    prix: {
      "0/1": [296, 300, 305, 329], "0/7": [336, 340, 345, 369],
      "1/1": [323, 327, 332, 356], "1/7": [363, 367, 372, 396],
    },
  },
  {
    nom: "Siège giratoire, assise tapissée et dossier résille", racine: "AOK", page: 71,
    prix: {
      "0/1": [303, 306, 310, 324], "0/7": [343, 346, 350, 364],
      "1/1": [330, 333, 337, 351], "1/7": [370, 373, 377, 381],
    },
  },
];

const PIETEMENT = (nom) => (/luge/.test(nom) ? "Piétement luge métal, empilable par six"
  : /giratoire/.test(nom) ? "Base giratoire, lift, roulettes ø 65 mm sol dur"
    : "Quatre pieds métal, empilable par six");

const FINITIONS_TEXTE = "<p>Cinq accords polypropylène et métal : noir / noir, gris / blanc, vert foncé / clair, taupe foncé / clair, bleu foncé / clair.</p><p>Les teintes métal, accotoirs, coque sous assise et liaison assise-dos sont foncées ; le dos et le dessus d'assise sont clairs. Nuancier page 205 du catalogue Sokoa.</p>";

/** Les vingt fiches, avec leurs lignes de tarif. */
function construireFiches() {
  const fiches = [];

  for (const b of PIEDS) {
    const lignes = ACCORDS.map((a) => ({
      ref: `${b.racine}/${a[b.alpha]}`,
      prix: b.prix,
      page: b.page,
      valeurs: { coloris: a.libelle },
    }));
    fiches.push({ nom: `${b.nom} - Adio`, page: b.page, lignes, giratoire: false });
  }

  for (const g of GIRATOIRES) {
    const lignes = [];
    for (const [suffixe, prix] of Object.entries(g.prix)) {
      const [chiffre, code] = suffixe.split("/");
      lignes.push({
        ref: `${g.racine}${chiffre}/${code}`,
        prix,
        page: g.page,
        valeurs: {
          accotoirs: chiffre === "1" ? "Avec accotoirs" : "Sans accotoirs",
          base: BASES.find((x) => x.code === code).libelle,
        },
      });
    }
    fiches.push({ nom: `${g.nom} - Adio`, page: g.page, lignes, giratoire: true });
  }

  return fiches;
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
  const vus = new Map();
  for (const f of fiches) {
    for (const l of f.lignes) {
      const prix = Array.isArray(l.prix) ? l.prix : [l.prix];
      for (const p of prix) {
        const cle = `${l.page}|${p}`;
        vus.set(cle, (vus.get(cle) || 0) + 1);
      }
    }
  }
  for (const [cle] of vus) {
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
    console.log("\n   Un prix cité dans ce script ne se retrouve pas sur la page indiquée.\n");
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
        select: { id: true, nom: true, publie: true, visuels: { select: { id: true } } },
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
          collisions.push({ fiche: f.nom, a: vues.get(empreinte), b: `${l.ref} (${prix} €)`, valeurs: v });
          return;
        }
        vues.set(empreinte, `${l.ref} (${prix} €)`);
        f.combinaisons.push({ valeurs: v, empreinte, prixTarifHT: prix, referenceBase: l.ref, pageCatalogue: l.page });
      });
    }
    total += f.combinaisons.length;
  }

  titre("LES VINGT PRODUITS DU TARIF");
  for (const p of PAGES) {
    console.log(`\n   ── page ${p}`);
    for (const f of fiches.filter((x) => x.page === p)) {
      const prix = f.combinaisons.map((c) => c.prixTarifHT);
      const t = Math.min(...prix) === Math.max(...prix)
        ? `${Math.min(...prix)} €` : `${Math.min(...prix)} à ${Math.max(...prix)} €`;
      console.log(`      ${f.nom.replace(" - Adio", "").padEnd(50)} ${String(f.combinaisons.length).padStart(2)} var. · ${t.padStart(12)}`);
    }
  }

  if (collisions.length) {
    titre("DEUX PRIX POUR UNE MÊME CONFIGURATION — RIEN NE SERA ÉCRIT");
    for (const c of collisions.slice(0, 12)) {
      console.log(`   ${c.fiche}`);
      console.log(`      ${c.a}  ≠  ${c.b}   ${JSON.stringify(c.valeurs)}`);
    }
    process.exitCode = 1;
    return;
  }

  titre("LE COMPTE");
  console.log(`   ${fiches.length} fiches · ${total} variantes`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  const reprises = new Set();
  for (const f of fiches) {
    const existante = gamme.vitrines.find((v) => v.nom === f.nom);
    const sections = [
      { titre: "Piétement", contenu: `<p>${PIETEMENT(f.nom)}</p>` },
      { titre: "Finitions", contenu: FINITIONS_TEXTE },
      { titre: "Bon à savoir", contenu: "<p>Le coloris polypropylène et métal est à préciser à la commande. Tablette écritoire rabattable, accroches d'alignement, patins et chariots de transport disponibles en option — nous consulter.</p>" },
    ];
    const descriptif = `<p>${f.nom.replace(" - Adio", "")}, de la collection Adio. Coque en polypropylène, cinq accords de coloris polypropylène et métal.</p>`;

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
    const ajouter = async (cle, nom, ordonne, nature, rendu = "boutons", pastilles = null) => {
      const vues = [...new Set(f.combinaisons.map((c) => c.valeurs[cle]).filter(Boolean))];
      if (vues.length < 2) return;
      const vals = ordonne ? ordonne.filter((x) => vues.includes(x)) : vues.sort();
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle, nom, nature, rendu, ordre, origine: "editorial",
          valeurs: {
            create: vals.map((libelle, i) => {
              const p = pastilles?.find((x) => x.libelle === libelle);
              return { libelle, ordre: i, ...(p ? { couleur: p.couleur, suffixeReference: "" } : {}) };
            }),
          },
        },
      });
    };

    await ajouter("accotoirs", "Accotoirs", ["Sans accotoirs", "Avec accotoirs"], "tarifaire");
    await ajouter("base", "Base et roulettes", BASES.map((b) => b.libelle), "tarifaire");
    await ajouter("tissu", "Tissu", TISSU, "tarifaire");
    await ajouter("coloris", "Coloris polypropylène et métal",
      ACCORDS.map((a) => a.libelle), "finition", "pastilles", ACCORDS);

    // Sur le giratoire, l'accord de coloris n'est pas dans la référence : le
    // tarif écrit « + coloris** à préciser à la commande ». On le propose
    // quand même, sans jeton de référence.
    if (f.giratoire) {
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle: "coloris", nom: "Coloris polypropylène et métal",
          nature: "finition", rendu: "pastilles", ordre, origine: "tarif",
          valeurs: { create: ACCORDS.map((a, i) => ({ libelle: a.libelle, couleur: a.couleur, ordre: i, suffixeReference: "" })) },
        },
      });
    }

    await prisma.combinaison.createMany({ data: f.combinaisons.map((c) => ({ ...c, vitrineId: id })) });
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
  console.log(`   fiches publiées : ${pub} · variantes : ${comb} · sans prix : ${sansPrix}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
