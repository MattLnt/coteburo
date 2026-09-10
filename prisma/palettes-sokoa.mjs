import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Les palettes Sokoa sont organisées par catégorie tarifaire : le prix d'un
// siège dépend de la catégorie du revêtement choisi (B, B+, C, D, E, H), pas
// du coloris précis. Chaque palette regroupe donc plusieurs collections de
// tissus qui partagent le même niveau de prix.
const PALETTES = [
  {
    nom: "Tissu B",
    ajouts: [
      // Napel — PVC, un seul coloris, absent de la première saisie
      { nom: "B NN0 — Napel" },
    ],
  },
  {
    nom: "Tissu C",
    ajouts: [
      // Runner — 20 % polyester recyclé. Exclu de la catégorie C sur
      // certaines gammes (Azkar, Eden) : voir les notes de bas de page tarif.
      { nom: "R4E — Beige" },
      { nom: "R4T — Terre" },
      { nom: "R4G — Gris foncé" },
      { nom: "R4Q — Gris clair" },
      { nom: "R4N — Noir" },
      { nom: "R4V — Vert" },
      { nom: "R4W — Bleu" },
    ],
  },
  {
    nom: "Tissu E",
    creer: true,
    ajouts: [{ nom: "CN0 — Cuir noir" }],
  },
  {
    nom: "Tissu H",
    creer: true,
    ajouts: [
      { nom: "CCR — Cuir" },
      { nom: "CTA — Cuir" },
      { nom: "CCA — Cuir" },
      { nom: "CHL — Cuir" },
    ],
  },
];

async function main() {
  for (const def of PALETTES) {
    let palette = await prisma.paletteFinition.findFirst({ where: { nom: def.nom } });

    if (!palette) {
      if (!def.creer) {
        console.log(`✗ Palette « ${def.nom} » introuvable — ignorée.`);
        continue;
      }
      palette = await prisma.paletteFinition.create({
        data: { nom: def.nom, marque: "Sokoa" },
      });
      console.log(`+ Palette « ${def.nom} » créée.`);
    }

    // On repart de l'ordre le plus haut pour ne pas écraser l'existant.
    const dernier = await prisma.finitionModele.findFirst({
      where: { paletteId: palette.id },
      orderBy: { ordre: "desc" },
      select: { ordre: true },
    });
    let ordre = (dernier?.ordre ?? -1) + 1;

    let ajoutees = 0;
    for (const f of def.ajouts) {
      // Le script est relançable : une finition déjà présente n'est pas
      // recréée en double.
      const existante = await prisma.finitionModele.findFirst({
        where: { paletteId: palette.id, nom: f.nom },
      });
      if (existante) continue;

      await prisma.finitionModele.create({
        data: {
          nom: f.nom,
          couleur: f.couleur || null,
          paletteId: palette.id,
          ordre: ordre++,
        },
      });
      ajoutees++;
    }

    const total = await prisma.finitionModele.count({ where: { paletteId: palette.id } });
    console.log(`✓ ${def.nom} : ${ajoutees} ajoutée(s) — ${total} finitions au total.`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());