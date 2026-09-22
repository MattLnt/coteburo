// Range les fiches publiées qui n'appartiennent à aucune catégorie.
//
//   node prisma/ranger-fiches-orphelines.mjs
//   node prisma/ranger-fiches-orphelines.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Une fiche sans sous-catégorie est publiée mais invisible : le catalogue
//   se parcourt par catégories, et elle n'y figure nulle part. Elle n'est
//   atteignable que par son adresse directe, ce que personne ne devine.
//
//   Les cinq blocs Eman que prisma/reparer-eman.mjs a créés sont dans ce cas :
//   j'ai écrit la fiche, ses prix et ses questions, et j'ai oublié de la
//   ranger. C'est un oubli de création, pas une donnée manquante.
//
// COMMENT ON DÉCIDE OÙ
//   On copie le rangement de ses sœurs : les autres fiches publiées de la
//   même gamme. Si elles ne sont pas toutes d'accord, on ne choisit pas à
//   leur place — la fiche est signalée et laissée en l'état.
//
//   Chez Eman, les vingt-cinq fiches d'origine sont unanimes : sous-catégories
//   « Sièges de direction » et « Sièges opérateur et ergonomiques », catégorie
//   « Sièges ». Il n'y a donc rien à deviner.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const gammes = await prisma.gamme.findMany({
    select: {
      nom: true,
      vitrines: {
        where: { publie: true },
        select: {
          id: true, nom: true,
          sousCategories: { select: { id: true, nom: true } },
          categories: { select: { id: true, nom: true } },
        },
      },
    },
  });

  const aRanger = [];
  const indecis = [];

  for (const g of gammes) {
    const orphelines = g.vitrines.filter((v) => !v.sousCategories.length);
    if (!orphelines.length) continue;
    const rangees = g.vitrines.filter((v) => v.sousCategories.length);
    if (!rangees.length) {
      for (const v of orphelines) indecis.push({ v, gamme: g.nom, motif: "aucune sœur rangée dans la gamme" });
      continue;
    }

    // Les sœurs sont-elles d'accord entre elles ?
    const signature = (v) => [
      v.sousCategories.map((c) => c.id).sort().join(","),
      v.categories.map((c) => c.id).sort().join(","),
    ].join("|");
    const avis = new Set(rangees.map(signature));
    if (avis.size > 1) {
      for (const v of orphelines) indecis.push({ v, gamme: g.nom, motif: `${avis.size} rangements différents chez ses sœurs` });
      continue;
    }

    const modele = rangees[0];
    for (const v of orphelines) {
      aRanger.push({
        v, gamme: g.nom,
        sousCategories: modele.sousCategories,
        categories: modele.categories,
      });
    }
  }

  if (!aRanger.length && !indecis.length) {
    console.log("Toutes les fiches publiées sont rangées. Rien à faire.");
    return;
  }

  titre(`${aRanger.length} FICHES À RANGER`);
  const parGamme = new Map();
  for (const x of aRanger) {
    if (!parGamme.has(x.gamme)) parGamme.set(x.gamme, []);
    parGamme.get(x.gamme).push(x);
  }
  for (const [g, liste] of parGamme) {
    const m = liste[0];
    console.log(`\n   ── ${g} → ${m.sousCategories.map((c) => c.nom).join(" + ")}  (catégorie ${m.categories.map((c) => c.nom).join(", ") || "—"})`);
    for (const x of liste) console.log(`      ${x.v.nom.replace(/ - [^-]+$/, "").slice(0, 62)}`);
  }

  if (indecis.length) {
    titre("FICHES QU'ON NE SAIT PAS RANGER — LAISSÉES EN L'ÉTAT");
    console.log("");
    for (const x of indecis) console.log(`   ${x.gamme.padEnd(14)} ${x.v.nom.slice(0, 48).padEnd(50)} ${x.motif}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const x of aRanger) {
    await prisma.produitVitrine.update({
      where: { id: x.v.id },
      data: {
        sousCategories: { connect: x.sousCategories.map((c) => ({ id: c.id })) },
        categories: { connect: x.categories.map((c) => ({ id: c.id })) },
      },
    });
  }
  console.log(`   ${aRanger.length} fiches rangées.`);

  titre("CONTRÔLE");
  const restantes = await prisma.produitVitrine.count({
    where: { publie: true, sousCategories: { none: {} } },
  });
  console.log(`   fiches publiées encore sans sous-catégorie : ${restantes}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
