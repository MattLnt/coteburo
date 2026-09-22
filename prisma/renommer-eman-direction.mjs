// Réécrit le titre des douze fauteuils de direction Eman.
//
//   node prisma/renommer-eman-direction.mjs
//   node prisma/renommer-eman-direction.mjs --appliquer
//
// En simulation par défaut. --appliquer pour écrire.
//
// POURQUOI
//   Ces douze fiches portent le libellé de colonne du tarif, pages 30 à 32,
//   où Sokoa préfixe le nom par la finition en capitales :
//
//     BLANC Fauteuil haut dossier résille avec base alu poli, roulettes
//     chromées ø65 sol dur
//
//   C'est commode pour retrouver la ligne dans le PDF, illisible pour un
//   client : le mot le plus criard est une couleur, et la moitié du titre
//   décrit un piétement qui figure déjà dans la fiche.
//
// LE TITRE QU'ON ÉCRIT
//     Fauteuil de direction haut dossier résille, finition blanche - Eman
//
//   La finition reste dans le nom — elle distingue bien deux produits du
//   tarif — mais elle passe en fin de titre et en minuscules. La base et les
//   roulettes descendent dans la section « Piétement », où elles sont déjà.
//
// LE NOM VIENT DE LA RÉFÉRENCE, PAS DE MA MAIN
//   N + dossier + mécanisme + têtière + / + finition
//
//     L, B, H  → finition blanche      R, N, T  → finition noire
//     L, R     → dossier résille
//     B, N     → dossier toile tendue
//     H, T     → dossier tapissé, avec renfort lombaire
//     ...7     → avec têtière           ...6  → sans
//
//   Une référence qui ne se lit pas fait échouer sa fiche plutôt que d'être
//   renommée au jugé.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);
const slug = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// La deuxième lettre de la référence dit le dossier ET la finition.
const DOSSIER = {
  L: { dossier: "résille", finition: "blanche" },
  B: { dossier: "toile tendue", finition: "blanche" },
  H: { dossier: "tapissé", finition: "blanche", lombaire: true },
  R: { dossier: "résille", finition: "noire" },
  N: { dossier: "toile tendue", finition: "noire" },
  T: { dossier: "tapissé", finition: "noire", lombaire: true },
};

/** Le titre d'une fiche, déduit de sa référence. Null si elle ne se lit pas. */
function titreDe(ref) {
  const m = /^N([LBHRNT])[81]([67])\//.exec(String(ref || "").trim().toUpperCase());
  if (!m) return null;
  const d = DOSSIER[m[1]];
  if (!d) return null;
  const tetiere = m[2] === "7";

  const details = [
    tetiere && "avec têtière",
    d.lombaire && (tetiere ? "et renfort lombaire" : "avec renfort lombaire"),
  ].filter(Boolean).join(" ");

  return `Fauteuil de direction haut dossier ${d.dossier}${details ? ` ${details}` : ""}, finition ${d.finition} - Eman`;
}

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vs = await prisma.produitVitrine.findMany({
    where: {
      gamme: { nom: "Eman" }, publie: true,
      OR: [{ nom: { startsWith: "NOIR " } }, { nom: { startsWith: "BLANC " } }],
    },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, combinaisons: { select: { referenceBase: true }, take: 1 } },
  });

  const plans = [];
  const refuses = [];
  for (const v of vs) {
    const ref = v.combinaisons[0]?.referenceBase;
    const nouveau = titreDe(ref);
    if (!nouveau) { refuses.push(`${v.nom} — référence « ${ref || "aucune"} » illisible`); continue; }
    plans.push({ v, ref, nouveau });
  }

  // Deux fiches ne peuvent pas porter le même titre : ce serait le signe que
  // la règle perd une distinction que le tarif fait.
  const vus = new Map();
  const collisions = [];
  for (const p of plans) {
    if (vus.has(p.nouveau)) collisions.push(`${p.ref} et ${vus.get(p.nouveau)} donneraient « ${p.nouveau} »`);
    else vus.set(p.nouveau, p.ref);
  }

  titre(`${plans.length} TITRES RÉÉCRITS`);
  console.log("");
  for (const p of plans) {
    console.log(`   ${p.ref.padEnd(16)} ${p.v.nom.replace(" - Eman", "").slice(0, 62)}`);
    console.log(`   ${" ".repeat(16)} → ${p.nouveau.replace(" - Eman", "")}\n`);
  }

  if (refuses.length) {
    titre("FICHES LAISSÉES TELLES QUELLES");
    console.log("");
    for (const r of refuses) console.log(`   ${r}`);
  }

  if (collisions.length) {
    titre("DEUX FICHES AURAIENT LE MÊME TITRE — RIEN NE SERA ÉCRIT");
    console.log("");
    for (const c of collisions) console.log(`   ${c}`);
    process.exitCode = 1;
    return;
  }

  if (!APPLIQUER) {
    console.log("Simulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  for (const p of plans) {
    await prisma.produitVitrine.update({
      where: { id: p.v.id },
      data: { nom: p.nouveau, slug: slug(p.nouveau) },
    });
  }
  console.log(`   ${plans.length} fiches renommées.`);

  titre("CONTRÔLE");
  const restantes = await prisma.produitVitrine.count({
    where: { gamme: { nom: "Eman" }, OR: [{ nom: { startsWith: "NOIR " } }, { nom: { startsWith: "BLANC " } }] },
  });
  console.log(`   fiches Eman au titre encore préfixé d'une couleur : ${restantes}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
