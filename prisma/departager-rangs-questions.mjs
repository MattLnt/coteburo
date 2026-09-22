// Départage les questions qui partagent un rang d'affichage.
//
//   node prisma/departager-rangs-questions.mjs
//   node prisma/departager-rangs-questions.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Trente et une fiches portent deux questions au même rang :
//
//     Chaise moyen dossier - Tertio      Mécanisme[1] · Finition[1]
//     Pouf avec assise tapissée - Kulbu  Finition[0] · Version[0] · Coloris[2]
//
//   Rien ne les départage, donc l'ordre vient de la base, et il peut changer
//   d'une requête à l'autre. Deux fiches voisines posent alors leurs questions
//   dans un ordre différent — c'est ce qu'on voit chez Kulbu, où « Version »
//   passe devant « Finition » sur un pouf et derrière sur l'autre.
//
//   Ces trente et une fiches viennent des scripts qui ont ouvert les blocs
//   « Modèle » : ils écrivaient un rang en dur sans regarder ce qui l'occupait
//   déjà. Le défaut est le leur, et il n'existe nulle part ailleurs.
//
// DANS QUEL ORDRE ON DÉPARTAGE
//   D'abord ce que le produit EST, ensuite ce qu'il COÛTE, enfin ce à quoi il
//   RESSEMBLE. C'est l'ordre du tarif lui-même, dont les tableaux mettent le
//   mécanisme et la version en lignes, et la catégorie de tissu en colonnes :
//
//     1. les choix tarifaires autres que la catégorie de tissu
//     2. la catégorie de tissu, qui porte le prix
//     3. les finitions
//
//   À rang égal et nature égale, la plus ancienne passe devant : c'est l'ordre
//   dans lequel l'import les a rencontrées, et il vaut mieux que le hasard.
//
// CE QU'IL NE TOUCHE PAS
//   Les cinq cent quarante et une fiches dont les rangs sont déjà distincts.
//   Leur ordre a pu être réglé à la main dans l'administration ; le
//   renuméroter au passage effacerait ce travail sans le dire.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

/** Une question est-elle la catégorie de tissu qui porte le prix ? */
const estCategorieTissu = (c) => c.nature === "tarifaire"
  && (c.valeurs || []).some((v) => /^Tissu |^XF3\/B$/.test(v.libelle));

/** Le rang de nature : ce que le produit est, ce qu'il coûte, ce à quoi il ressemble. */
function famille(c) {
  if (c.nature === "tarifaire") return estCategorieTissu(c) ? 1 : 0;
  if (c.nature === "finition") return 2;
  return 3;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    where: { publie: true },
    orderBy: { nom: "asc" },
    select: {
      id: true, nom: true, gamme: { select: { nom: true } },
      choix: {
        select: { id: true, nom: true, nature: true, ordre: true, createdAt: true,
          valeurs: { select: { libelle: true } } },
      },
    },
  });

  const plans = [];
  for (const v of vitrines) {
    const rangs = v.choix.map((c) => c.ordre);
    if (new Set(rangs).size === rangs.length) continue;      // déjà distincts

    const ordonnes = [...v.choix].sort((a, b) =>
      a.ordre - b.ordre
      || famille(a) - famille(b)
      || a.createdAt - b.createdAt
      || a.nom.localeCompare(b.nom, "fr"));

    const mouvements = ordonnes
      .map((c, i) => ({ c, rang: i }))
      .filter((m) => m.c.ordre !== m.rang);
    if (mouvements.length) plans.push({ v, ordonnes, mouvements });
  }

  titre(`${plans.length} FICHES À DÉPARTAGER`);
  const parGamme = new Map();
  for (const p of plans) {
    const g = p.v.gamme?.nom || "—";
    if (!parGamme.has(g)) parGamme.set(g, []);
    parGamme.get(g).push(p);
  }
  for (const [g, liste] of [...parGamme].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n   ── ${g} (${liste.length})`);
    for (const p of liste.slice(0, 3)) {
      console.log(`      ${p.v.nom.replace(/ - [^-]+$/, "").slice(0, 46)}`);
      console.log(`         avant : ${p.v.choix.map((c) => `${c.nom}[${c.ordre}]`).join(" · ")}`);
      console.log(`         après : ${p.ordonnes.map((c, i) => `${c.nom}[${i}]`).join(" · ")}`);
    }
    if (liste.length > 3) console.log(`      … et ${liste.length - 3} autres, de même forme`);
  }

  titre("LE COMPTE");
  console.log(`   ${plans.length} fiches · ${plans.reduce((n, p) => n + p.mouvements.length, 0)} questions renumérotées`);
  console.log(`   ${vitrines.length - plans.length} fiches laissées telles quelles`);

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const p of plans) {
    for (const m of p.mouvements) {
      await prisma.choix.update({ where: { id: m.c.id }, data: { ordre: m.rang } });
    }
  }
  console.log(`   ${plans.length} fiches départagées.`);

  titre("CONTRÔLE");
  const apres = await prisma.produitVitrine.findMany({
    where: { publie: true }, select: { choix: { select: { ordre: true } } },
  });
  const reste = apres.filter((v) => new Set(v.choix.map((c) => c.ordre)).size !== v.choix.length).length;
  console.log(`   fiches ayant encore deux questions au même rang : ${reste}`);
}

main()
  .catch((e) => { console.error(e.stack || e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
