// Redécoupe Klik : un bloc du tarif = un produit. Trente au lieu de onze.
//
//   node prisma/redecouper-klik.mjs
//   node prisma/redecouper-klik.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI UN REDÉCOUPAGE ET PAS UN RÉIMPORT
//   Mon regroupement avait ramené vingt-sept fiches à neuf, en écrasant au
//   passage le nom des neuf qui ont servi d'accueil. Mais il n'avait rien
//   perdu : chacune de ces neuf fiches porte TOUTES les références de sa
//   famille, avec leurs prix — vérifiés contre le tarif, pages 84 à 86 et
//   161. On les redécoupe donc au lieu de tout retaper.
//
//   Les dix-huit fiches dépubliées ne contiennent rien de plus ; elles
//   restent où elles sont.
//
// COMMENT UN BLOC SE RECONNAÎT
//   La racine de quatre lettres suffit presque toujours : KLB0 est « chaise
//   quatre pieds métal, assise tapissée avant », KLFR « table cafétéria
//   ronde ». Deux exceptions, où le suffixe tranche :
//
//     KLA0/         chaise métal ordinaire
//     KLA0/AL, /AP  version polypropylène 100 % recyclé — un autre produit
//
//   Et les tabourets partagent leur bloc à deux hauteurs d'assise : KLH0 et
//   KLM0 sont le même produit, 76 et 63 cm.
//
// CE QUI RESTE DANS UNE FICHE
//   La hauteur d'assise, la couleur de base, le type de lift, la catégorie
//   de tissu, le coloris du plateau : tout ce qui ne change pas le meuble.
//
// UN TROU DE L'IMPORT, COMBLÉ
//   KLHB et KLMB — tabouret métal, assise tapissée avant — n'ont qu'un prix
//   en base alors que le tarif en donne quatre, un par catégorie de tissu
//   (page 84). Les trois manquants sont repris du tarif.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { empreinteDe } from "../lib/empreinteCombinaison.js";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const GAMME = "Klik";

const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const TISSU = ["Tissu B", "Tissu B+", "Tissu C", "Tissu D"];
const HAUTE = "Assise à 76 cm";
const BASSE = "Assise à 63 cm";

/** « KBCO/C + *A *T *D » → { racine: "KBCO", suffixe: "C" }. */
function lireRef(brut) {
  const s = String(brut || "").trim();
  const coupe = s.search(/[*\s]/);
  const net = (coupe === -1 ? s : s.slice(0, coupe)).trim();
  const [racine, suffixe = ""] = net.split("/");
  return { racine: racine.toUpperCase(), suffixe: suffixe.toUpperCase(), net };
}

// ── Les trente blocs ──────────────────────────────────────────────────
//
// `quand` filtre sur le suffixe lorsque la racine ne suffit pas.
const BLOCS = [
  // Quatre pieds bois
  { racines: ["KBAO"], nom: "Chaise 4 pieds bois, assise PP, dossier PP" },
  { racines: ["KBBO"], nom: "Chaise 4 pieds bois, assise PP tapissée avant, dossier PP" },
  { racines: ["KBCO"], nom: "Chaise 4 pieds bois, assise tapissée avant+arrière, dossier PP ou chêne" },
  { racines: ["KBHO", "KBMO"], nom: "Tabouret 4 pieds bois, assise PP, dossier PP" },
  { racines: ["KBHB", "KBMB"], nom: "Tabouret 4 pieds bois, assise PP tapissée avant, dossier PP" },
  // Quatre pieds métal
  { racines: ["KLA0"], quand: (s) => !s, nom: "Chaise 4 pieds métal, assise et dossier PP" },
  { racines: ["KLB0"], nom: "Chaise 4 pieds métal, assise PP tapissée avant, dossier PP" },
  { racines: ["KLC0"], nom: "Chaise 4 pieds métal, assise PP tapissée avant et arrière, dossier PP" },
  { racines: ["KLH0", "KLM0"], quand: (s) => !s, nom: "Tabouret 4 pieds métal, assise et dossier PP" },
  { racines: ["KLHB", "KLMB"], nom: "Tabouret 4 pieds métal, assise PP tapissée avant, dossier PP" },
  // Polypropylène 100 % recyclé — un produit à part
  { racines: ["KLA0"], quand: (s) => /^A/.test(s), nom: "Chaise 4 pieds métal anthracite, assise et dossier polypropylène 100% recyclé" },
  { racines: ["KLH0", "KLM0"], quand: (s) => /^A/.test(s), nom: "Tabouret 4 pieds métal anthracite, assise et dossier polypropylène 100% recyclé" },
  // Giratoire
  { racines: ["KLJ0"], nom: "Chaise giratoire, assise et dossier PP" },
  { racines: ["KLK0"], nom: "Chaise giratoire, assise PP tapissée avant, dossier PP" },
  { racines: ["KLL0"], nom: "Chaise giratoire, assise PP tapissée avant et arrière, dossier PP" },
  // Giratoire haute
  { racines: ["KLJH"], nom: "Chaise giratoire HAUTE, assise et dossier PP, base noire sur patins" },
  { racines: ["KLKH"], nom: "Chaise giratoire HAUTE, assise PP tapissée avant et dossier PP, base noire sur patins" },
  { racines: ["KLLH"], nom: "Chaise giratoire HAUTE, assise PP tapissée avant et arrière et dossier PP, base noire sur patins" },
  // Étudiant
  { racines: ["KLJT"], nom: "Basique - Chaise giratoire étudiant avec tablette, assise et dossier PP" },
  { racines: ["KLKT"], nom: "Basique - Chaise giratoire étudiant avec tablette, assise PP tapissée avant, dossier PP" },
  { racines: ["KLLT"], nom: "Basique - Chaise giratoire étudiant avec tablette, assise PP tapissée avant et arrière, dossier PP" },
  { racines: ["KLRT"], nom: "Compact - Chaise giratoire étudiant avec panier PP + tablette, assise et dossier PP" },
  { racines: ["KLST"], nom: "Compact - Chaise giratoire étudiant avec panier PP + tablette, assise PP tapissée avant, dossier PP" },
  { racines: ["KLTT"], nom: "Compact - Chaise giratoire étudiant avec panier PP + tablette, assise PP tapissée avant et arrière, dossier PP" },
  // Tables
  { racines: ["KLFR"], nom: "Table cafétéria ronde H 74 cm" },
  { racines: ["KLFV"], nom: "Table cafétéria ovale H 74 cm" },
  { racines: ["KLUR"], nom: "Table haute ronde H 92 cm" },
  { racines: ["KLUV"], nom: "Table haute ovale H 92 cm" },
  { racines: ["KLDR"], nom: "Table mange-debout ronde H 110 cm" },
  { racines: ["KLDV"], nom: "Table mange-debout ovale H 110 cm" },
];

/** Les réponses que porte une combinaison, déduites de sa référence. */
function valeursDe({ racine, suffixe }, tissu) {
  const v = {};
  // Tabourets : deux hauteurs d'assise dans le même bloc.
  if (/^(KB|KL)[HM]/.test(racine)) v.hauteur = racine[2] === "H" ? HAUTE : BASSE;
  // Dossier chêne, seulement sur la chaise bois à double placet.
  if (racine === "KBCO") v.dossier = suffixe === "CE" ? "Dossier chêne" : "Dossier polypropylène";
  // Giratoire ordinaire : couleur de base et de roulettes.
  if (/^KL[JKL]0$/.test(racine)) v.base = suffixe === "7" ? "Base et roulettes blanches" : "Base et roulettes noires";
  // Giratoire haut : deux lifts.
  if (/^KL[JKL]H$/.test(racine)) v.lift = suffixe === "2" ? "Lift assis-debout" : "Lift haut";
  // Tables : plateau et pieds assortis.
  if (/^KL[FUD][RV]$/.test(racine)) {
    v.plateau = { AA: "Anthracite", BB: "Blanc", CC: "Corail" }[suffixe] || suffixe;
  }
  // Polypropylène recyclé : deux gris.
  if (/^A[LP]$/.test(suffixe)) v.recycle = suffixe === "AL" ? "Gris lave" : "Gris perle";
  if (tissu) v.tissu = tissu;
  return v;
}

// Les trois prix que l'import n'a pas pris sur le tabouret métal tapissé
// (page 84). Le quatrième — la catégorie B+ — est déjà en base.
const COMBLER = {
  "KLHB/": [334, 337, 340, 348],
  "KLMB/": [329, 332, 335, 343],
};

const AXES = [
  { cle: "hauteur", nom: "Hauteur d'assise", ordre: [BASSE, HAUTE] },
  { cle: "dossier", nom: "Dossier", ordre: ["Dossier polypropylène", "Dossier chêne"] },
  { cle: "base", nom: "Base et roulettes", ordre: ["Base et roulettes noires", "Base et roulettes blanches"] },
  { cle: "lift", nom: "Hauteur", ordre: ["Lift assis-debout", "Lift haut"] },
  { cle: "plateau", nom: "Plateau et pieds", ordre: ["Anthracite", "Blanc", "Corail"] },
  { cle: "recycle", nom: "Coloris", ordre: ["Gris lave", "Gris perle"] },
  { cle: "tissu", nom: "Tissu", ordre: TISSU },
];

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const gamme = await prisma.gamme.findFirst({
    where: { nom: GAMME },
    select: {
      id: true,
      vitrines: {
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true, publie: true,
          visuels: { select: { id: true } },
          combinaisons: {
            select: {
              referenceBase: true, prixTarifHT: true, valeurs: true,
              ecoContribution: true, poids: true, ean: true, pageCatalogue: true, ancienId: true,
            },
          },
        },
      },
    },
  });
  if (!gamme) { console.error(`Gamme ${GAMME} introuvable.`); process.exitCode = 1; return; }

  // ── Rassembler toutes les combinaisons, d'où qu'elles viennent ──────
  const toutes = [];
  for (const v of gamme.vitrines) {
    for (const c of v.combinaisons) {
      const ref = lireRef(c.referenceBase);
      const tissu = c.valeurs?.tissu || c.valeurs?.finition || null;
      toutes.push({ ...c, ref, tissu, source: v.nom });
    }
  }

  // ── Les ranger dans leur bloc ───────────────────────────────────────
  for (const b of BLOCS) { b.combinaisons = []; b.vues = new Map(); }
  const orphelines = [];
  for (const c of toutes) {
    const bloc = BLOCS.find((b) => b.racines.includes(c.ref.racine)
      && (!b.quand || b.quand(c.ref.suffixe)));
    if (!bloc) { orphelines.push(c); continue; }
    const valeurs = valeursDe(c.ref, c.tissu);
    const empreinte = empreinteDe(valeurs);
    // La même combinaison vit dans la fiche fusionnée ET dans la dépubliée :
    // on ne la garde qu'une fois, et l'on vérifie qu'elles s'accordent.
    const dejaVue = bloc.vues.get(empreinte);
    if (dejaVue) {
      if (dejaVue.prixTarifHT !== c.prixTarifHT) {
        dejaVue.desaccord = `${dejaVue.prixTarifHT} € ≠ ${c.prixTarifHT} €`;
      }
      continue;
    }
    const entree = {
      valeurs, empreinte, prixTarifHT: c.prixTarifHT, referenceBase: c.ref.net,
      ecoContribution: c.ecoContribution, poids: c.poids, ean: c.ean,
      pageCatalogue: c.pageCatalogue, ancienId: c.ancienId,
    };
    bloc.vues.set(empreinte, entree);
    bloc.combinaisons.push(entree);
  }

  // ── Combler le trou du tabouret métal tapissé ───────────────────────
  let comblees = 0;
  for (const bloc of BLOCS) {
    for (const [prefixe, prix] of Object.entries(COMBLER)) {
      const modele = bloc.combinaisons.find((c) => c.referenceBase === prefixe);
      if (!modele) continue;
      prix.forEach((p, i) => {
        const valeurs = { ...modele.valeurs, tissu: TISSU[i] };
        const empreinte = empreinteDe(valeurs);
        if (bloc.vues.has(empreinte)) return;
        const entree = { ...modele, valeurs, empreinte, prixTarifHT: p, pageCatalogue: 84 };
        bloc.vues.set(empreinte, entree);
        bloc.combinaisons.push(entree);
        comblees += 1;
      });
      // La ligne d'origine, sans tissu, cède la place aux quatre.
      const i = bloc.combinaisons.indexOf(modele);
      if (i !== -1 && !modele.valeurs.tissu) {
        bloc.combinaisons.splice(i, 1);
        bloc.vues.delete(modele.empreinte);
      }
    }
  }

  const actifs = BLOCS.filter((b) => b.combinaisons.length);

  titre("LES TRENTE PRODUITS DU TARIF");
  console.log("");
  for (const b of actifs) {
    const prix = b.combinaisons.map((c) => c.prixTarifHT).filter((x) => x != null);
    const t = Math.min(...prix) === Math.max(...prix)
      ? `${Math.min(...prix)} €` : `${Math.min(...prix)} à ${Math.max(...prix)} €`;
    console.log(`   ${b.nom.slice(0, 62).padEnd(64)} ${String(b.combinaisons.length).padStart(2)} var. · ${t.padStart(12)}`);
  }

  const desaccords = actifs.flatMap((b) => b.combinaisons.filter((c) => c.desaccord)
    .map((c) => `${b.nom} · ${c.referenceBase} : ${c.desaccord}`));
  if (desaccords.length) {
    titre("DEUX PRIX POUR LA MÊME COMBINAISON — RIEN NE SERA ÉCRIT");
    console.log("\n   Une fiche fusionnée et une dépubliée ne s'accordent pas.\n");
    for (const d of desaccords.slice(0, 12)) console.log(`   ${d}`);
    process.exitCode = 1;
    return;
  }

  if (orphelines.length) {
    titre("RÉFÉRENCES QU'AUCUN BLOC NE RECONNAÎT");
    console.log("");
    for (const o of [...new Set(orphelines.map((c) => `${c.ref.net}  (${c.source})`))]) console.log(`   ${o}`);
  }

  titre("LE COMPTE");
  const total = actifs.reduce((n, b) => n + b.combinaisons.length, 0);
  console.log(`   ${actifs.length} produits · ${total} variantes${comblees ? ` · ${comblees} variantes reprises du tarif` : ""}`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  const reprises = new Set();
  for (const b of actifs) {
    const nom = `${b.nom} - Klik`;
    const existante = gamme.vitrines.find((v) => v.nom === nom);
    let id;
    if (existante) {
      id = existante.id;
      await prisma.choix.deleteMany({ where: { vitrineId: id } });
      await prisma.combinaison.deleteMany({ where: { vitrineId: id } });
      await prisma.produitVitrine.update({
        where: { id }, data: { publie: true, accessoireSeul: false, slug: slug(nom) },
      });
    } else {
      const neuve = await prisma.produitVitrine.create({
        data: {
          nom, slug: slug(nom), publie: true, gammeId: gamme.id,
          descriptif: `<p>${b.nom}, de la collection Klik.</p>`,
        },
      });
      id = neuve.id;
    }
    reprises.add(id);

    let ordre = 0;
    for (const axe of AXES) {
      const vues = [...new Set(b.combinaisons.map((c) => c.valeurs[axe.cle]).filter(Boolean))];
      if (vues.length < 2) continue;
      ordre += 1;
      await prisma.choix.create({
        data: {
          vitrineId: id, cle: axe.cle, nom: axe.nom, nature: "tarifaire",
          rendu: "boutons", ordre, origine: "tarif",
          valeurs: { create: axe.ordre.filter((x) => vues.includes(x)).map((libelle, i) => ({ libelle, ordre: i })) },
        },
      });
    }

    await prisma.combinaison.createMany({
      data: b.combinaisons.map(({ desaccord, ...c }) => ({ ...c, vitrineId: id })),
    });
  }
  console.log(`   ${actifs.length} produits écrits.`);

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
