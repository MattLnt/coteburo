// Recalcule les associations de finitions que le tarif ne vend pas.
//
// En simulation par défaut. --appliquer pour écrire.
//
//   node prisma/recalculer-exclusions.mjs
//   node prisma/recalculer-exclusions.mjs --appliquer
//
// LA DÉFINITION, PRISE AU MOT
//   Une association est exclue lorsque la règle du modèle engendre une
//   référence que le tarif ne porte pas :
//
//       referenceBase + Σ suffixeReference  ∉  références du tarif
//
//   Ce script applique cette phrase, sans rien savoir de la migration qui a
//   rempli les tables. Il les lit, engendre, compare, et écrit l'écart.
//
// POURQUOI IL EXISTE
//   La migration calcule ces exclusions au passage, et en a perdu six sur une
//   fiche — un comptoir Fifty Full — sans qu'on sache dire où. Plutôt que de
//   traquer l'écriture fautive, on redit la règle à un seul endroit : ce
//   script fait autorité, et peut se rejouer à tout moment.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");
const titre = (t) => console.log(`\n${"═".repeat(72)}\n${t}\n${"═".repeat(72)}`);

async function main() {
  console.log(APPLIQUER
    ? "═══ MODE RÉEL — la base est modifiée ═══\n"
    : "═══ SIMULATION — rien n'est écrit ═══\n");

  const vitrines = await prisma.produitVitrine.findMany({
    select: {
      id: true, nom: true, declinaisons: true,
      choix: {
        where: { nature: "finition" },
        select: { nom: true, rangReference: true, valeurs: { select: { id: true, libelle: true, suffixeReference: true } } },
      },
      combinaisons: { select: { referenceBase: true }, take: 1 },
      exclusionsFinition: { select: { id: true } },
    },
  });

  const plan = [];
  for (const v of vitrines) {
    const declinaisons = Array.isArray(v.declinaisons) ? v.declinaisons : [];
    const tarif = declinaisons.find((d) => d.referencesParFinition)?.referencesParFinition;
    if (!tarif) continue;
    const base = v.combinaisons[0]?.referenceBase;
    if (!base) continue;

    const finitions = v.choix
      .filter((c) => c.rangReference != null)
      .sort((a, b) => a.rangReference - b.rangReference)
      // Une valeur sans jeton n'est pas déclinée par le tarif : elle ne fait
      // pas partie du produit cartésien, donc rien à exclure la concernant.
      .map((c) => ({ ...c, valeurs: c.valeurs.filter((x) => x.suffixeReference != null) }))
      .filter((c) => c.valeurs.length);
    if (!finitions.length) continue;

    const attendues = new Set(Object.values(tarif));
    const absentes = [];
    const parcourir = (i, ref, ids) => {
      if (i === finitions.length) {
        if (!attendues.has(ref)) absentes.push([...ids]);
        return;
      }
      for (const val of finitions[i].valeurs) {
        parcourir(i + 1, ref + val.suffixeReference, [...ids, val.id]);
      }
    };
    parcourir(0, base, []);

    const avant = v.exclusionsFinition.length;
    if (absentes.length !== avant) {
      plan.push({ id: v.id, nom: v.nom, avant, apres: absentes.length, absentes });
    } else if (absentes.length) {
      // Même compte : on réécrit quand même, c'est le seul moyen d'être sûr
      // que ce sont les mêmes. Le script fait autorité ou ne sert à rien.
      plan.push({ id: v.id, nom: v.nom, avant, apres: absentes.length, absentes, identique: true });
    }
  }

  const change = plan.filter((p) => !p.identique);
  titre("CE QUI SERAIT RECALCULÉ");
  console.log(`\n   fiches concernées par la règle        ${String(plan.length).padStart(5)}`);
  console.log(`   dont le compte d'exclusions change    ${String(change.length).padStart(5)}`);
  const total = plan.reduce((n, p) => n + p.apres, 0);
  console.log(`   associations exclues au total         ${String(total).padStart(5)}`);
  for (const p of change) {
    console.log(`      ${p.nom.slice(0, 52).padEnd(54)} ${p.avant} → ${p.apres}`);
  }

  if (!APPLIQUER) {
    console.log("\nSimulation terminée. Relancer avec --appliquer pour écrire.");
    return;
  }

  titre("ÉCRITURE");
  let n = 0;
  for (const p of plan) {
    await prisma.exclusionFinition.deleteMany({ where: { vitrineId: p.id } });
    if (p.absentes.length) {
      await prisma.exclusionFinition.createMany({
        data: p.absentes.map((valeurs) => ({ vitrineId: p.id, valeurs })),
      });
    }
    n += 1;
  }
  console.log(`   ${n} fiches réécrites`);
  const enBase = await prisma.exclusionFinition.count();
  console.log(`   associations exclues en base : ${enBase}`);
}

main()
  .catch((e) => { console.error(e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
