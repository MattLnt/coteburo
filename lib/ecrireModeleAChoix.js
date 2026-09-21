import { prisma } from "./prisma";
import { planModeleAChoix } from "./planModeleAChoix.js";

// L'écriture du plan calculé par lib/planModeleAChoix.

/** Le plan, écrit. Rend ce qui a été créé. */
export async function ecrireModeleAChoix(vitrineId, source = {}) {
  const plan = planModeleAChoix(source);

  for (const c of plan.choix) {
    await prisma.choix.create({
      data: {
        vitrineId, cle: c.cle, nom: c.nom, nature: c.nature, rendu: c.rendu,
        ordre: c.ordre, origine: "tarif",
        valeurs: { create: c.valeurs },
      },
    });
  }
  if (plan.combinaisons.length) {
    await prisma.combinaison.createMany({
      data: plan.combinaisons.map((k) => ({ ...k, vitrineId })),
    });
  }

  return {
    choix: plan.choix.length,
    valeurs: plan.choix.reduce((n, c) => n + c.valeurs.length, 0),
    combinaisons: plan.combinaisons.length,
    ignorees: plan.ignorees,
  };
}
