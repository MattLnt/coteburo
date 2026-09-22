// Ce que donnerait le regroupement de la gamme Eman.
//
//   node prisma/proposer-regroupement-eman.mjs
//
// N'ÉCRIT RIEN. Il lit les vingt-sept fiches, lit leur nom, et montre les
// fiches qu'on obtiendrait en faisant des variantes des questions.
//
// POURQUOI EMAN D'ABORD
//   C'est le cas le plus net du catalogue : vingt-sept pages pour deux
//   sièges. Le tarif Sokoa donne une référence par combinaison — NL86/D pour
//   la chaise blanche à dossier résille, NR86/A pour la même en noir — et
//   l'import a fait une fiche par ligne.
//
//   Un client qui ouvre « Sièges opérateur » voit donc vingt-sept chaises
//   presque identiques au lieu de deux.
//
// LA LECTURE DES NOMS
//   Chaque nom est décomposé en un produit et des variantes. Le vocabulaire
//   est explicite et court : c'est celui d'une seule gamme, et il se relit.
//   Une variante qu'on ne sait pas lire fait échouer la fiche entière plutôt
//   que de la ranger au hasard — mieux vaut vingt-sept fiches qu'une fiche
//   fausse.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const nu = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Les axes de la gamme, dans l'ordre où la fiche les posera. Chaque entrée
// donne le nom de la question et la façon de lire sa réponse dans le nom.
const AXES = [
  {
    cle: "finition", nom: "Finition",
    lire: (k) => (/\bblanc\b/.test(k) ? "Blanc" : /\bnoir\b/.test(k) ? "Noir" : null),
  },
  {
    cle: "dossier", nom: "Dossier",
    lire: (k) => (/\bresille\b/.test(k) ? "Résille"
      : /\btapisse\b/.test(k) ? "Tapissé"
        : /\btoile\b/.test(k) ? "Toile" : null),
  },
  {
    cle: "tetiere", nom: "Têtière",
    lire: (k) => (/\btetiere\b/.test(k) ? "Avec têtière" : "Sans têtière"),
  },
  {
    cle: "lombaire", nom: "Soutien lombaire",
    lire: (k) => (/\brl\b/.test(k) ? "Avec soutien lombaire" : "Sans"),
  },
  {
    cle: "roulettes", nom: "Roulettes et sol",
    lire: (k) => (/\b65\b/.test(k) || /sol dur/.test(k) ? "ø65 — sol dur"
      : /\b50\b/.test(k) || /sol moquette/.test(k) ? "ø50 — sol moquette" : null),
  },
  {
    cle: "base", nom: "Piétement",
    lire: (k) => (/alu poli|aluminium/.test(k) ? "Base aluminium poli" : "Base nylon"),
  },
];

// Ce qui reste quand on a retiré les variantes : le produit lui-même.
const PRODUIT = (k) => {
  if (/\bfauteuil\b/.test(k)) return "Fauteuil haut dossier - Eman";
  if (/\bchaise\b/.test(k)) return "Chaise haut dossier - Eman";
  return null;
};

async function main() {
  const g = await prisma.gamme.findFirst({
    where: { nom: "Eman" },
    select: {
      nom: true,
      vitrines: {
        orderBy: { nom: "asc" },
        select: {
          id: true, nom: true, descriptif: true,
          _count: { select: { visuels: true } },
          combinaisons: {
            select: { valeurs: true, prixTarifHT: true, referenceBase: true, ecoContribution: true },
          },
          choix: {
            orderBy: { ordre: "asc" },
            select: { cle: true, nom: true, nature: true, valeurs: { select: { libelle: true } } },
          },
        },
      },
    },
  });
  if (!g) { console.error("Gamme Eman introuvable."); return; }

  const groupes = new Map();
  const illisibles = [];

  for (const v of g.vitrines) {
    const k = nu(v.nom);
    const produit = PRODUIT(k);
    if (!produit) { illisibles.push(v.nom); continue; }

    const variantes = {};
    let manque = null;
    for (const a of AXES) {
      const r = a.lire(k);
      if (r == null) { manque = a.nom; break; }
      variantes[a.cle] = r;
    }
    if (manque) { illisibles.push(`${v.nom}  [${manque} illisible]`); continue; }

    if (!groupes.has(produit)) groupes.set(produit, { nom: produit, fiches: [] });
    groupes.get(produit).fiches.push({ v, variantes });
  }

  titre("LES FICHES QU'ON OBTIENDRAIT");
  for (const grp of groupes.values()) {
    const avecPhoto = grp.fiches.filter((f) => f.v._count.visuels > 0).length;
    const visuels = grp.fiches.reduce((n, f) => n + f.v._count.visuels, 0);

    // Les questions de la fiche : les axes qui varient vraiment, plus celles
    // que les fiches d'origine posaient déjà (dimensions, coloris du tarif).
    console.log(`\n   ${grp.nom}`);
    console.log(`      ${grp.fiches.length} fiches d'aujourd'hui · ${avecPhoto} illustrées · ${visuels} visuels au total`);
    console.log("      ──");

    for (const a of AXES) {
      const vals = [...new Set(grp.fiches.map((f) => f.variantes[a.cle]))];
      if (vals.length < 2) continue;
      console.log(`      ${a.nom.padEnd(20)} ${vals.join(" · ")}`);
    }

    // Les questions que portaient déjà les fiches d'origine.
    const heritees = new Map();
    for (const f of grp.fiches) {
      for (const c of f.v.choix) {
        if (!heritees.has(c.nom)) heritees.set(c.nom, new Set());
        for (const x of c.valeurs) heritees.get(c.nom).add(x.libelle);
      }
    }
    for (const [nom, vals] of heritees) {
      console.log(`      ${nom.padEnd(20)} ${[...vals].slice(0, 6).join(" · ")}${vals.size > 6 ? ` … (${vals.size})` : ""}`);
    }

    // Les variantes, une par fiche d'origine × ses combinaisons.
    const total = grp.fiches.reduce((n, f) => n + f.v.combinaisons.length, 0);
    const prix = grp.fiches.flatMap((f) => f.v.combinaisons.map((k) => k.prixTarifHT)).filter((x) => x != null);
    console.log("      ──");
    console.log(`      ${total} variantes · tarif de ${Math.min(...prix)} à ${Math.max(...prix)} € HT`);
  }

  if (illisibles.length) {
    titre("FICHES QUE LE SCRIPT NE SAIT PAS LIRE");
    console.log("");
    for (const l of illisibles) console.log(`   ${l}`);
    console.log("\n   Elles resteraient telles quelles : mieux vaut vingt-sept fiches");
    console.log("   qu'une fiche fausse.");
  }

  titre("EN RÉSUMÉ");
  const fusionnees = [...groupes.values()].reduce((n, x) => n + x.fiches.length, 0);
  console.log(`
   ${g.vitrines.length} fiches aujourd'hui
   ${groupes.size} fiches après regroupement, plus ${illisibles.length} laissée(s) telle(s) quelle(s)

   Rien n'a été modifié.`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
